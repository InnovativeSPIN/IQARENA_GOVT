import pool from '../../config/db.js';
import { ensureTestStandardColumn } from '../../lib/testNotifications.js';

// Helper function to format time taken from seconds to readable format
const formatTimeTaken = (seconds) => {
  if (!seconds || seconds <= 0) return null;

  const totalSeconds = Math.floor(Number(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes} min ${remainingSeconds} sec`;
  } else {
    return `${remainingSeconds} sec`;
  }
};

// Get all assigned tests for a student
export const getAssignedTests = async (req, res) => {
  let studentId = req.user?.id || req.studentId;

  try {
    const connection = await pool.getConnection();

    // If no studentId from auth, get the first student for testing
    if (!studentId) {
      const [[firstStudent]] = await connection.query(
        'SELECT user_id FROM students LIMIT 1'
      );
      if (!firstStudent) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'No students found in database',
        });
      }
      studentId = firstStudent.user_id;
      console.log('⚠️  Using test student user_id:', studentId);
    }

    // Get student's batch and school; school students (school_students) have a school + class instead of a batch
    const [[studentRow]] = await connection.query(
      'SELECT batch_id FROM students WHERE user_id = ?',
      [studentId]
    );
    const [[schoolStudent]] = await connection.query(
      'SELECT school_id, standard FROM school_students WHERE user_id = ? LIMIT 1',
      [studentId]
    );

    if ((!studentRow || !studentRow.batch_id) && !schoolStudent) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Student batch not found',
      });
    }

    const batchId = studentRow?.batch_id || null;
    const schoolId = schoolStudent?.school_id ?? studentRow?.school_id ?? null;
    const standard = schoolStudent?.standard || null;
    await ensureTestStandardColumn(connection);

    const [tests] = await connection.query(
      `SELECT
         t.id,
         t.title,
         t.duration_minutes AS duration,
         t.all_subjects,
         t.parent_test_id,
         COALESCE(NULLIF((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id), 0), t.total_marks, 0) as totalMarks,
         t.start_time AS startTime,
         t.end_time AS endTime,
         t.created_at AS createdAt,
         t.status,
         t.mark_publish AS mark_publish,
         e.name AS examType,
         s.name AS subject,
         (SELECT COUNT(*) FROM test_questions WHERE test_id = t.id) AS totalQuestions,
         COALESCE(sta.status, 'not_started') AS attemptStatus,
         sta.score AS obtainedScore,
         sta.time_taken AS timeTaken,
         sta.started_at AS attemptStartedAt,
         sta.completed_at AS attemptSubmittedAt
       FROM tests t
       JOIN exams e ON t.exam_id = e.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN student_test_attempts sta ON sta.test_id = t.id AND sta.student_id = ?
       WHERE (t.batch_id = ? OR t.batch_id IS NULL) 
         AND t.status = 'published'
         AND (t.school_ids IS NULL OR JSON_LENGTH(t.school_ids) = 0 OR JSON_CONTAINS(t.school_ids, CAST(? AS CHAR), '$') OR JSON_CONTAINS(t.school_ids, JSON_QUOTE(CAST(? AS CHAR)), '$'))
         AND (t.standard IS NULL OR t.standard = '' OR ? IS NULL OR FIND_IN_SET(?, t.standard) > 0)
       ORDER BY t.start_time`,
      [studentId, batchId, schoolId, schoolId, standard, standard]
    );

    // Transform data to match frontend format
    const transformedTests = await Promise.all(tests.map(async (test) => {
      let status = 'not_started';
      let isActive = false;
      let actualTotalMarks = test.totalMarks;
      let actualTotalQuestions = test.totalQuestions;
      
      // Check if this is a combined test and calculate actual totals
      if (test.all_subjects === 1 && test.parent_test_id === null) {
        // This is a combined test - get totals from all child tests
        const [childTests] = await connection.query(
          'SELECT id FROM tests WHERE parent_test_id = ?',
          [test.id]
        );
        const childTestIds = childTests.map(ct => ct.id);

        if (childTestIds.length > 0) {
          const placeholders = childTestIds.map(() => '?').join(', ');
          const [[marksResult]] = await connection.query(
            `SELECT 
             COALESCE(SUM(q.marks), 0) as totalMarks,
             COUNT(DISTINCT tq.question_id) as totalQuestions
             FROM test_questions tq
             JOIN questions q ON tq.question_id = q.id
             WHERE tq.test_id IN (${placeholders})`,
            childTestIds
          );
          actualTotalMarks = marksResult?.totalMarks || 0;
          actualTotalQuestions = marksResult?.totalQuestions || 0;
        }
      }
      
      // Check if test is within the time window
      const now = new Date();
      const startTime = test.startTime ? new Date(test.startTime) : null;
      const endTime = test.endTime ? new Date(test.endTime) : null;

      // Determine if start/end bounds are satisfied (missing bounds are treated as open)
      const startOk = !startTime || now >= startTime;
      const endOk = !endTime || now <= endTime;

      // Determine if test is active (can be started) - only 'published' tests may be started
      if (startOk && endOk && test.status === 'published') {
        isActive = true;
      }

      // Determine test status based on attempt
      if (test.attemptStatus === 'completed') {
        status = 'submitted';
      } else if (test.attemptStatus === 'in_progress') {
        status = 'in_progress';
      } else if (isActive) {
        status = 'not_started';
      } else if (now > endTime) {
        status = 'expired';
      } else {
        status = 'upcoming';
      }

      return {
        id: test.id.toString(),
        title: test.title,
        examType: test.examType,
        duration: test.duration,
        totalMarks: actualTotalMarks,
        totalQuestions: actualTotalQuestions,
        status: status,
        startTime: test.startTime,
        endTime: test.endTime,
        isActive: isActive,
        subjects: test.subject ? [test.subject] : [],
        rawStatus: test.status,
        markPublish: !!test.mark_publish,
        obtainedScore: test.obtainedScore,
        percentage: test.obtainedScore !== null && test.obtainedScore !== undefined && actualTotalMarks
          ? Number(((test.obtainedScore / actualTotalMarks) * 100).toFixed(1))
          : null,
          createdAt: test.createdAt,
        attemptedAt: test.attemptSubmittedAt,
        timeTaken: test.timeTaken ? formatTimeTaken(test.timeTaken) : null,
        negativeMarking: test.negativeMarking === 1
      };
    }));

    connection.release();
    // Prepare recent tests (by createdAt desc) - top 3
    const recentTests = transformedTests
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 3);

    res.json({
      success: true,
      data: {
        tests: transformedTests,
        recentTests,
        totalTests: transformedTests.length,
        upcomingTests: transformedTests.filter(t => t.status === 'upcoming').length,
        activeTests: transformedTests.filter(t => t.isActive && t.status === 'not_started').length,
        completedTests: transformedTests.filter(t => t.status === 'submitted').length,
        inProgressTests: transformedTests.filter(t => t.status === 'in_progress').length,
      },
    });

  } catch (error) {
    console.error('Error fetching assigned tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned tests',
      error: error.message,
    });
  }
};

// Get test statistics for a student
export const getTestStatistics = async (req, res) => {
  let studentId = req.user?.id || req.studentId;

  try {
    const connection = await pool.getConnection();

    // If no studentId from auth, get the first student for testing
    if (!studentId) {
      const [[firstStudent]] = await connection.query(
        'SELECT user_id FROM students LIMIT 1'
      );
      if (!firstStudent) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'No students found in database',
        });
      }
      studentId = firstStudent.user_id;
    }

    // Get statistics
    const [[stats]] = await connection.query(
      `SELECT
         COUNT(DISTINCT sta.test_id) AS totalAttempted,
         AVG(sta.score / t.total_marks * 100) AS averagePercentage,
         MAX(sta.score / t.total_marks * 100) AS highestPercentage,
         MIN(sta.score / t.total_marks * 100) AS lowestPercentage,
         SUM(CASE WHEN sta.score / t.total_marks * 100 >= 75 THEN 1 ELSE 0 END) AS excellentCount,
         SUM(CASE WHEN sta.score / t.total_marks * 100 >= 60 AND sta.score / t.total_marks * 100 < 75 THEN 1 ELSE 0 END) AS goodCount,
         SUM(CASE WHEN sta.score / t.total_marks * 100 >= 40 AND sta.score / t.total_marks * 100 < 60 THEN 1 ELSE 0 END) AS averageCount,
         SUM(CASE WHEN sta.score / t.total_marks * 100 < 40 THEN 1 ELSE 0 END) AS belowAverageCount
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       WHERE sta.student_id = ? AND sta.status = 'completed'`,
      [studentId]
    );

    connection.release();

    res.json({
      success: true,
      data: {
        totalAttempted: stats.totalAttempted || 0,
        averagePercentage: stats.averagePercentage ? Number(stats.averagePercentage.toFixed(1)) : 0,
        highestPercentage: stats.highestPercentage ? Number(stats.highestPercentage.toFixed(1)) : 0,
        lowestPercentage: stats.lowestPercentage ? Number(stats.lowestPercentage.toFixed(1)) : 0,
        performance: {
          excellent: stats.excellentCount || 0,
          good: stats.goodCount || 0,
          average: stats.averageCount || 0,
          belowAverage: stats.belowAverageCount || 0,
        }
      },
    });

  } catch (error) {
    console.error('Error fetching test statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test statistics',
      error: error.message,
    });
  }
};
