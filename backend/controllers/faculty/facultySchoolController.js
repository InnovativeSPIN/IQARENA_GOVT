import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';
import { ensureTestStandardColumn } from '../../lib/testNotifications.js';

/*
 * School monitoring for faculty.
 * Every query here is limited to the faculty member's own school (users.school_id),
 * so a faculty can only see students and results from that school.
 */

// Tests visible to a school: no school restriction, or the school is in tests.school_ids
const TEST_FOR_SCHOOL_SQL = `(t.school_ids IS NULL OR JSON_LENGTH(t.school_ids) = 0
  OR JSON_CONTAINS(t.school_ids, CAST(? AS CHAR), '$')
  OR JSON_CONTAINS(t.school_ids, JSON_QUOTE(CAST(? AS CHAR)), '$'))`;

// Marks a test is out of: stored total, else the sum of its question marks
const TEST_TOTAL_SQL = `COALESCE(NULLIF(t.total_marks, 0),
  (SELECT SUM(q.marks) FROM test_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.test_id = t.id), 0)`;

const pct = (score, total) => (Number(total) > 0 ? Math.round((Number(score) / Number(total)) * 1000) / 10 : 0);
const PASS_PERCENT = 33;

// Resolve the faculty's school, or answer 403
async function getFacultySchool(connection, req, res) {
  const [[row]] = await connection.query(
    `SELECT u.school_id AS schoolId, s.school_name AS schoolName, s.district, s.udise_code AS udiseCode
     FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ?`,
    [req.user.id]
  );
  if (!row || !row.schoolId) {
    res.status(403).json({ success: false, message: 'Your account is not linked to a school. Ask the admin to assign your school.' });
    return null;
  }
  return row;
}

async function withSchool(req, res, handler) {
  const connection = await pool.getConnection();
  try {
    await ensureTestStandardColumn(connection);
    const school = await getFacultySchool(connection, req, res);
    if (!school) return;
    await handler(connection, school);
  } catch (error) {
    console.error('Faculty school endpoint error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
}

// GET /api/faculty/school/overview
export const getSchoolOverview = (req, res) => withSchool(req, res, async (connection, school) => {
  const sid = school.schoolId;

  const [classRows] = await connection.query(
    `SELECT standard, COUNT(*) AS students, SUM(user_id IS NOT NULL) AS withLogin
     FROM school_students WHERE school_id = ? AND status = 1 GROUP BY standard ORDER BY standard`,
    [sid]
  );

  const [tests] = await connection.query(
    `SELECT t.id, t.title, t.status, t.start_time AS startTime, t.end_time AS endTime, t.standard,
            ${TEST_TOTAL_SQL} AS totalMarks
     FROM tests t
     WHERE t.parent_test_id IS NULL AND t.status = 'published' AND ${TEST_FOR_SCHOOL_SQL}
     ORDER BY COALESCE(t.start_time, t.created_at) DESC`,
    [sid, sid]
  );

  const [attempts] = await connection.query(
    `SELECT sta.id, sta.test_id AS testId, sta.score, sta.completed_at AS completedAt, sta.time_taken AS timeTaken,
            ss.student_name AS studentName, ss.standard, t.title AS testTitle, ${TEST_TOTAL_SQL} AS totalMarks
     FROM student_test_attempts sta
     JOIN school_students ss ON ss.user_id = sta.student_id AND ss.school_id = ?
     JOIN tests t ON t.id = sta.test_id
     WHERE sta.status = 'completed'
     ORDER BY sta.completed_at DESC`,
    [sid]
  );

  const percents = attempts.map(a => pct(a.score, a.totalMarks));
  const now = new Date();
  const liveTests = tests.filter(t => (!t.startTime || new Date(t.startTime) <= now) && (!t.endTime || new Date(t.endTime) >= now));
  const upcomingTests = tests.filter(t => t.startTime && new Date(t.startTime) > now);

  // Average per class
  const byClass = {};
  attempts.forEach((a, i) => {
    const k = a.standard || '-';
    byClass[k] = byClass[k] || { total: 0, count: 0 };
    byClass[k].total += percents[i];
    byClass[k].count += 1;
  });

  res.json({
    success: true,
    school,
    stats: {
      totalStudents: classRows.reduce((s, c) => s + Number(c.students), 0),
      studentsWithLogin: classRows.reduce((s, c) => s + Number(c.withLogin || 0), 0),
      publishedTests: tests.length,
      liveTests: liveTests.length,
      completedAttempts: attempts.length,
      averagePercent: percents.length ? Math.round((percents.reduce((s, p) => s + p, 0) / percents.length) * 10) / 10 : 0,
      passRate: percents.length ? Math.round((percents.filter(p => p >= PASS_PERCENT).length / percents.length) * 1000) / 10 : 0,
    },
    classes: classRows.map(c => ({
      standard: c.standard,
      students: Number(c.students),
      withLogin: Number(c.withLogin || 0),
      averagePercent: byClass[c.standard] ? Math.round((byClass[c.standard].total / byClass[c.standard].count) * 10) / 10 : null,
      attempts: byClass[c.standard]?.count || 0,
    })),
    liveTests: liveTests.slice(0, 5),
    upcomingTests: upcomingTests.slice(0, 5),
    recentAttempts: attempts.slice(0, 8).map((a, i) => ({
      id: a.id, testId: a.testId, testTitle: a.testTitle, studentName: a.studentName, standard: a.standard,
      score: Number(a.score), totalMarks: Number(a.totalMarks), percent: percents[i], completedAt: a.completedAt,
    })),
  });
});

// GET /api/faculty/school/students?standard=&search=
export const getSchoolStudents = (req, res) => withSchool(req, res, async (connection, school) => {
  const { standard, search } = req.query;
  const clauses = ['ss.school_id = ?', 'ss.status = 1'];
  const params = [school.schoolId];
  if (standard) { clauses.push('ss.standard = ?'); params.push(standard); }
  if (search) {
    clauses.push('(ss.student_name LIKE ? OR ss.emis_no LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await connection.query(
    `SELECT ss.id, ss.emis_no AS emisNo, ss.student_name AS name, ss.standard, ss.section, ss.gender, ss.user_id AS userId,
            COUNT(sta.id) AS attempts,
            AVG(CASE WHEN tt.total > 0 THEN sta.score / tt.total * 100 END) AS avgPercent,
            MAX(CASE WHEN tt.total > 0 THEN sta.score / tt.total * 100 END) AS bestPercent,
            MAX(sta.completed_at) AS lastAttemptAt
     FROM school_students ss
     LEFT JOIN student_test_attempts sta ON sta.student_id = ss.user_id AND sta.status = 'completed'
     LEFT JOIN (SELECT t.id, ${TEST_TOTAL_SQL} AS total FROM tests t) tt ON tt.id = sta.test_id
     WHERE ${clauses.join(' AND ')}
     GROUP BY ss.id
     ORDER BY ss.standard, ss.student_name`,
    params
  );

  const [classes] = await connection.query(
    'SELECT DISTINCT standard FROM school_students WHERE school_id = ? AND status = 1 ORDER BY standard',
    [school.schoolId]
  );

  res.json({
    success: true,
    school,
    classes: classes.map(c => c.standard),
    students: rows.map(r => ({
      ...r,
      hasLogin: !!r.userId,
      attempts: Number(r.attempts),
      avgPercent: r.avgPercent != null ? Math.round(Number(r.avgPercent) * 10) / 10 : null,
      bestPercent: r.bestPercent != null ? Math.round(Number(r.bestPercent) * 10) / 10 : null,
    })),
  });
});

// GET /api/faculty/school/students/:id  (school_students.id)
export const getSchoolStudentDetail = (req, res) => withSchool(req, res, async (connection, school) => {
  const [[student]] = await connection.query(
    `SELECT id, emis_no AS emisNo, student_name AS name, standard, section, gender, phone, user_id AS userId
     FROM school_students WHERE id = ? AND school_id = ?`,
    [req.params.id, school.schoolId]
  );
  if (!student) return res.status(404).json({ success: false, message: 'Student not found in your school' });

  let history = [];
  if (student.userId) {
    const [rows] = await connection.query(
      `SELECT sta.id AS attemptId, t.id AS testId, t.title, sta.score, sta.time_taken AS timeTaken, sta.completed_at AS completedAt,
              ${TEST_TOTAL_SQL} AS totalMarks,
              (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = sta.id AND sa.is_correct = 1) AS correct,
              (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = sta.id AND sa.is_correct = 0 AND sa.selected_option IS NOT NULL) AS wrong,
              (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS questions
       FROM student_test_attempts sta JOIN tests t ON t.id = sta.test_id
       WHERE sta.student_id = ? AND sta.status = 'completed'
       ORDER BY sta.completed_at DESC`,
      [student.userId]
    );
    history = rows.map(r => ({
      ...r,
      score: Number(r.score), totalMarks: Number(r.totalMarks), percent: pct(r.score, r.totalMarks),
      correct: Number(r.correct), wrong: Number(r.wrong), questions: Number(r.questions),
    }));
  }

  res.json({ success: true, student: { ...student, hasLogin: !!student.userId }, history });
});

// GET /api/faculty/school/tests
export const getSchoolTests = (req, res) => withSchool(req, res, async (connection, school) => {
  const sid = school.schoolId;
  const [tests] = await connection.query(
    `SELECT t.id, t.title, t.status, t.start_time AS startTime, t.end_time AS endTime, t.duration_minutes AS duration,
            t.standard, e.name AS examName, s.name AS subjectName, ${TEST_TOTAL_SQL} AS totalMarks,
            (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS questions
     FROM tests t
     JOIN exams e ON e.id = t.exam_id
     LEFT JOIN subjects s ON s.id = t.subject_id
     WHERE t.parent_test_id IS NULL AND t.status = 'published' AND ${TEST_FOR_SCHOOL_SQL}
     ORDER BY COALESCE(t.start_time, t.created_at) DESC`,
    [sid, sid]
  );

  const result = [];
  for (const t of tests) {
    const standards = (t.standard || '').split(',').map(x => x.trim()).filter(Boolean);
    const stdClause = standards.length ? `AND ss.standard IN (${standards.map(() => '?').join(',')})` : '';
    const [[eligible]] = await connection.query(
      `SELECT COUNT(*) AS n FROM school_students ss WHERE ss.school_id = ? AND ss.status = 1 ${stdClause}`,
      [sid, ...standards]
    );
    const [scores] = await connection.query(
      `SELECT sta.score FROM student_test_attempts sta
       JOIN school_students ss ON ss.user_id = sta.student_id AND ss.school_id = ?
       WHERE sta.test_id = ? AND sta.status = 'completed'`,
      [sid, t.id]
    );
    const p = scores.map(r => pct(r.score, t.totalMarks));
    result.push({
      ...t,
      totalMarks: Number(t.totalMarks),
      questions: Number(t.questions),
      classes: standards,
      eligibleStudents: Number(eligible.n),
      attempted: scores.length,
      averagePercent: p.length ? Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 10) / 10 : null,
      highestPercent: p.length ? Math.max(...p) : null,
      passCount: p.filter(x => x >= PASS_PERCENT).length,
    });
  }
  res.json({ success: true, school, tests: result });
});

// GET /api/faculty/school/tests/:id/report
export const getSchoolTestReport = (req, res) => withSchool(req, res, async (connection, school) => {
  const sid = school.schoolId;
  const [[test]] = await connection.query(
    `SELECT t.id, t.title, t.start_time AS startTime, t.end_time AS endTime, t.duration_minutes AS duration, t.standard,
            e.name AS examName, s.name AS subjectName, ${TEST_TOTAL_SQL} AS totalMarks
     FROM tests t JOIN exams e ON e.id = t.exam_id LEFT JOIN subjects s ON s.id = t.subject_id
     WHERE t.id = ? AND ${TEST_FOR_SCHOOL_SQL}`,
    [req.params.id, sid, sid]
  );
  if (!test) return res.status(404).json({ success: false, message: 'Test not found for your school' });

  const standards = (test.standard || '').split(',').map(x => x.trim()).filter(Boolean);
  const stdClause = standards.length ? `AND ss.standard IN (${standards.map(() => '?').join(',')})` : '';

  // Every eligible student of this school, with their attempt (if any)
  const [rows] = await connection.query(
    `SELECT ss.id AS schoolStudentId, ss.emis_no AS emisNo, ss.student_name AS name, ss.standard, ss.section, ss.user_id AS userId,
            sta.id AS attemptId, sta.status, sta.score, sta.time_taken AS timeTaken, sta.completed_at AS completedAt,
            (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = sta.id AND sa.is_correct = 1) AS correct,
            (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = sta.id AND sa.is_correct = 0 AND sa.selected_option IS NOT NULL) AS wrong
     FROM school_students ss
     LEFT JOIN student_test_attempts sta ON sta.student_id = ss.user_id AND sta.test_id = ?
     WHERE ss.school_id = ? AND ss.status = 1 ${stdClause}
     ORDER BY sta.score IS NULL, sta.score DESC, ss.student_name`,
    [test.id, sid, ...standards]
  );

  const totalMarks = Number(test.totalMarks);
  const completed = rows.filter(r => r.status === 'completed');
  let rank = 0;
  let prevScore = null;
  const students = rows.map((r, i) => {
    const done = r.status === 'completed';
    if (done && Number(r.score) !== prevScore) { rank = i + 1; prevScore = Number(r.score); }
    return {
      schoolStudentId: r.schoolStudentId, emisNo: r.emisNo, name: r.name, standard: r.standard, section: r.section,
      hasLogin: !!r.userId,
      status: done ? 'completed' : r.status === 'in_progress' ? 'in_progress' : 'not_attempted',
      score: done ? Number(r.score) : null,
      percent: done ? pct(r.score, totalMarks) : null,
      correct: done ? Number(r.correct) : null,
      wrong: done ? Number(r.wrong) : null,
      timeTaken: done ? r.timeTaken : null,
      completedAt: r.completedAt,
      rank: done ? rank : null,
    };
  });

  // Question-wise accuracy for this school's attempts
  const attemptIds = completed.map(r => r.attemptId);
  let questions = [];
  if (attemptIds.length > 0) {
    const ph = attemptIds.map(() => '?').join(',');
    const [qRows] = await connection.query(
      `SELECT q.id, q.question_text AS text, q.answer AS correctAnswer, tp.topic_name AS topic,
              SUM(sa.is_correct = 1) AS correct,
              SUM(sa.is_correct = 0 AND sa.selected_option IS NOT NULL) AS wrong,
              SUM(sa.selected_option = 'A') AS a, SUM(sa.selected_option = 'B') AS b,
              SUM(sa.selected_option = 'C') AS c, SUM(sa.selected_option = 'D') AS d
       FROM (
         -- randomized tests store each student's questions per attempt; fixed tests use test_questions
         SELECT question_id FROM student_test_attempt_questions WHERE attempt_id IN (${ph})
         UNION
         SELECT question_id FROM test_questions WHERE test_id = ?
       ) tq
       JOIN questions q ON q.id = tq.question_id
       LEFT JOIN topics tp ON tp.id = q.topic_id
       LEFT JOIN student_answers sa ON sa.question_id = q.id AND sa.attempt_id IN (${ph})
       GROUP BY q.id
       ORDER BY q.id`,
      [...attemptIds, test.id, ...attemptIds]
    );
    questions = qRows.map(q => {
      const correct = Number(q.correct || 0);
      return {
        id: q.id, text: q.text, topic: q.topic, correctAnswer: q.correctAnswer,
        correct, wrong: Number(q.wrong || 0), skipped: attemptIds.length - correct - Number(q.wrong || 0),
        accuracy: Math.round((correct / attemptIds.length) * 1000) / 10,
        options: { A: Number(q.a || 0), B: Number(q.b || 0), C: Number(q.c || 0), D: Number(q.d || 0) },
      };
    });
  }

  const p = completed.map(r => pct(r.score, totalMarks));
  const bands = [
    { label: '0–32%', min: 0, max: 33 },
    { label: '33–49%', min: 33, max: 50 },
    { label: '50–74%', min: 50, max: 75 },
    { label: '75–100%', min: 75, max: 101 },
  ].map(b => ({ label: b.label, count: p.filter(x => x >= b.min && x < b.max).length }));

  res.json({
    success: true,
    school,
    test: { ...test, totalMarks, classes: standards },
    summary: {
      eligible: rows.length,
      attempted: completed.length,
      notAttempted: rows.length - completed.length,
      averagePercent: p.length ? Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 10) / 10 : null,
      highestPercent: p.length ? Math.max(...p) : null,
      lowestPercent: p.length ? Math.min(...p) : null,
      passCount: p.filter(x => x >= PASS_PERCENT).length,
      passPercent: PASS_PERCENT,
      bands,
    },
    students,
    questions,
  });
});

// GET /api/faculty/school/notifications - "new test" alerts sent to this school's students
export const getSchoolNotifications = (req, res) => withSchool(req, res, async (connection, school) => {
  const [tbl] = await connection.query("SHOW TABLES LIKE 'notifications'");
  if (tbl.length === 0) return res.json({ success: true, school, notifications: [] });
  const [rows] = await connection.query(
    `SELECT n.test_id AS testId, MAX(n.title) AS title, MAX(n.message) AS message, MIN(n.created_at) AS sentAt,
            COUNT(*) AS recipients, SUM(n.is_read = 1) AS readCount,
            GROUP_CONCAT(DISTINCT ss.standard ORDER BY ss.standard SEPARATOR ', ') AS classes
     FROM notifications n
     JOIN school_students ss ON ss.user_id = n.user_id AND ss.school_id = ?
     GROUP BY n.test_id
     ORDER BY sentAt DESC
     LIMIT 100`,
    [school.schoolId]
  );
  res.json({
    success: true,
    school,
    notifications: rows.map(r => ({ ...r, recipients: Number(r.recipients), readCount: Number(r.readCount || 0) })),
  });
});

// POST /api/faculty/school/students/:id/reset-password  { password: '123456' }
// Only for students of the faculty's own school who already have a login account
export const resetSchoolStudentPassword = (req, res) => withSchool(req, res, async (connection, school) => {
  const password = String(req.body?.password || '');
  if (!/^\d{6}$/.test(password)) {
    return res.status(400).json({ success: false, message: 'The new PIN must be exactly 6 digits' });
  }
  const [[student]] = await connection.query(
    'SELECT id, student_name AS name, user_id AS userId FROM school_students WHERE id = ? AND school_id = ?',
    [req.params.id, school.schoolId]
  );
  if (!student) return res.status(404).json({ success: false, message: 'Student not found in your school' });
  if (!student.userId) {
    return res.status(400).json({ success: false, message: 'This student has no login account yet. Ask the admin to create one first.' });
  }
  const hash = await bcrypt.hash(password, 10);
  await connection.query('UPDATE users SET password = ? WHERE id = ?', [hash, student.userId]);
  res.json({ success: true, message: `PIN reset for ${student.name}` });
});
