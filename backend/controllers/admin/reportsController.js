import pool from '../../config/db.js';
import { ensureTestStandardColumn } from '../../lib/testNotifications.js';

/*
 * Admin reports: results of published tests, filterable by school, test and class.
 * - Overview (no testId): one row per test x school with attempt/score summary.
 * - Test report (testId): one row per eligible student with score, plus summary.
 */

const TEST_TOTAL_SQL = `COALESCE(NULLIF(t.total_marks, 0),
  (SELECT SUM(q.marks) FROM test_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.test_id = t.id), 0)`;
const PASS_PERCENT = 33;

const pct = (score, total) => (Number(total) > 0 ? Math.round((Number(score) / Number(total)) * 1000) / 10 : 0);
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

const parseIds = (raw) => {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};
const splitStandards = (v) => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

// Schools a test is assigned to (empty = all schools)
const testSchools = (t, allSchools) => {
  const ids = parseIds(t.school_ids);
  return ids.length ? allSchools.filter(s => ids.includes(Number(s.id))) : allSchools;
};

// GET /api/admin/reports/filters
export const getReportFilters = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureTestStandardColumn(connection);
    const [schools] = await connection.query('SELECT id, school_name AS name FROM schools WHERE status = 1 ORDER BY school_name');
    const [classes] = await connection.query(
      "SELECT school_id AS schoolId, standard FROM school_students WHERE status = 1 AND standard IS NOT NULL AND standard <> '' GROUP BY school_id, standard ORDER BY standard"
    );
    const [tests] = await connection.query(
      `SELECT t.id, t.title, t.start_time AS startTime, t.school_ids, t.standard, e.name AS examName
       FROM tests t JOIN exams e ON e.id = t.exam_id
       WHERE t.status = 'published' AND t.parent_test_id IS NULL
       ORDER BY COALESCE(t.start_time, t.created_at) DESC`
    );
    res.json({
      success: true,
      schools,
      classes,
      tests: tests.map(t => ({
        id: t.id, title: t.title, startTime: t.startTime, examName: t.examName,
        schoolIds: parseIds(t.school_ids), classes: splitStandards(t.standard),
      })),
    });
  } catch (error) {
    console.error('Report filters error:', error);
    res.status(500).json({ success: false, message: 'Error loading report filters', error: error.message });
  } finally {
    connection.release();
  }
};

// GET /api/admin/reports?schoolId=&testId=&standard=
export const getReport = async (req, res) => {
  const schoolId = Number(req.query.schoolId) || null;
  const testId = Number(req.query.testId) || null;
  const standard = req.query.standard ? String(req.query.standard) : null;
  const connection = await pool.getConnection();
  try {
    await ensureTestStandardColumn(connection);
    const [allSchools] = await connection.query('SELECT id, school_name AS name FROM schools WHERE status = 1 ORDER BY school_name');

    const testClauses = ["t.status = 'published'", 't.parent_test_id IS NULL'];
    const testParams = [];
    if (testId) { testClauses.push('t.id = ?'); testParams.push(testId); }
    const [tests] = await connection.query(
      `SELECT t.id, t.title, t.start_time AS startTime, t.school_ids, t.standard, e.name AS examName, s.name AS subjectName,
              ${TEST_TOTAL_SQL} AS totalMarks
       FROM tests t JOIN exams e ON e.id = t.exam_id LEFT JOIN subjects s ON s.id = t.subject_id
       WHERE ${testClauses.join(' AND ')}
       ORDER BY COALESCE(t.start_time, t.created_at) DESC`,
      testParams
    );
    if (testId && tests.length === 0) return res.status(404).json({ success: false, message: 'Test not found' });

    // ---------- Overview: test x school ----------
    if (!testId) {
      const rows = [];
      for (const t of tests) {
        const testClasses = splitStandards(t.standard);
        if (standard && testClasses.length && !testClasses.includes(standard)) continue;
        for (const sc of testSchools(t, allSchools)) {
          if (schoolId && Number(sc.id) !== schoolId) continue;
          const classes = standard ? [standard] : testClasses;
          const clsSql = classes.length ? `AND ss.standard IN (${classes.map(() => '?').join(',')})` : '';
          const [[eligible]] = await connection.query(
            `SELECT COUNT(*) AS n FROM school_students ss WHERE ss.school_id = ? AND ss.status = 1 ${clsSql}`,
            [sc.id, ...classes]
          );
          const [scores] = await connection.query(
            `SELECT sta.score FROM student_test_attempts sta
             JOIN school_students ss ON ss.user_id = sta.student_id AND ss.school_id = ? ${clsSql}
             WHERE sta.test_id = ? AND sta.status = 'completed'`,
            [sc.id, ...classes, t.id]
          );
          const p = scores.map(r => pct(r.score, t.totalMarks));
          rows.push({
            testId: t.id, testTitle: t.title, examName: t.examName, startTime: t.startTime,
            schoolId: sc.id, schoolName: sc.name, classes: classes.join(', ') || 'All',
            totalMarks: Number(t.totalMarks), eligible: Number(eligible.n), attempted: scores.length,
            averagePercent: avg(p), highestPercent: p.length ? Math.max(...p) : null,
            passCount: p.filter(x => x >= PASS_PERCENT).length,
          });
        }
      }
      return res.json({ success: true, mode: 'overview', passPercent: PASS_PERCENT, rows });
    }

    // ---------- One test: student-wise ----------
    const t = tests[0];
    const totalMarks = Number(t.totalMarks);
    const schools = testSchools(t, allSchools).filter(sc => !schoolId || Number(sc.id) === schoolId);
    const testClasses = splitStandards(t.standard);
    const classes = standard ? [standard] : testClasses;

    let students = [];
    if (schools.length > 0) {
      const clsSql = classes.length ? `AND ss.standard IN (${classes.map(() => '?').join(',')})` : '';
      const [rows] = await connection.query(
        `SELECT ss.id AS schoolStudentId, ss.emis_no AS emisNo, ss.student_name AS name, ss.standard, ss.section,
                sc.school_name AS schoolName, ss.user_id AS userId,
                sta.status, sta.score, sta.time_taken AS timeTaken, sta.completed_at AS completedAt,
                (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = sta.id AND sa.is_correct = 1) AS correct,
                (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = sta.id AND sa.is_correct = 0 AND sa.selected_option IS NOT NULL) AS wrong
         FROM school_students ss
         JOIN schools sc ON sc.id = ss.school_id
         LEFT JOIN student_test_attempts sta ON sta.student_id = ss.user_id AND sta.test_id = ?
         WHERE ss.status = 1 AND ss.school_id IN (${schools.map(() => '?').join(',')}) ${clsSql}
         ORDER BY (sta.status = 'completed') DESC, sta.score DESC, ss.student_name`,
        [t.id, ...schools.map(s => s.id), ...classes]
      );
      let rank = 0; let prev = null;
      students = rows.map((r, i) => {
        const done = r.status === 'completed';
        if (done && Number(r.score) !== prev) { rank = i + 1; prev = Number(r.score); }
        return {
          schoolStudentId: r.schoolStudentId, emisNo: r.emisNo, name: r.name, standard: r.standard, section: r.section,
          schoolName: r.schoolName, hasLogin: !!r.userId,
          status: done ? 'completed' : r.status === 'in_progress' ? 'in_progress' : 'not_attempted',
          score: done ? Number(r.score) : null, percent: done ? pct(r.score, totalMarks) : null,
          correct: done ? Number(r.correct) : null, wrong: done ? Number(r.wrong) : null,
          timeTaken: done ? r.timeTaken : null, completedAt: r.completedAt, rank: done ? rank : null,
        };
      });
    }

    const p = students.filter(s => s.status === 'completed').map(s => s.percent);
    res.json({
      success: true,
      mode: 'test',
      test: { id: t.id, title: t.title, examName: t.examName, subjectName: t.subjectName, startTime: t.startTime, totalMarks, classes: testClasses },
      summary: {
        eligible: students.length, attempted: p.length, notAttempted: students.length - p.length,
        averagePercent: avg(p), highestPercent: p.length ? Math.max(...p) : null, lowestPercent: p.length ? Math.min(...p) : null,
        passCount: p.filter(x => x >= PASS_PERCENT).length, passPercent: PASS_PERCENT,
      },
      students,
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, message: 'Error building report', error: error.message });
  } finally {
    connection.release();
  }
};
