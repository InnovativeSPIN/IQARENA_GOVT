// Fetch all exams
export const getAllExams = async (req, res) => {
	try {
		const connection = await pool.getConnection();
		const [exams] = await connection.query('SELECT id, name FROM exams');
		connection.release();
		return res.status(200).json({ success: true, exams });
	} catch (error) {
		console.error('Error fetching exams:', error);
		return res.status(500).json({ success: false, message: 'Error fetching exams', error: error.message });
	}
};
import pool from '../../config/db.js';

export const getAdminDashboardStats = async (req, res) => {
	try {
		const { schoolId } = req.query;
		const connection = await pool.getConnection();

		// Add schoolId filtering to users table if provided
		let studentSchoolFilter = '';
		let queryParams = [];
		if (schoolId) {
			studentSchoolFilter = ' AND school_id = ?';
			queryParams.push(schoolId);
		}

		// Total students
		const [[{ totalStudents }]] = await connection.query(`SELECT COUNT(*) AS totalStudents FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'STUDENT')${studentSchoolFilter}`, queryParams);
		// Total faculty
		const [[{ totalFaculty }]] = await connection.query(`SELECT COUNT(*) AS totalFaculty FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'FACULTY')${studentSchoolFilter}`, queryParams);
		// Total tests
		const [[{ totalTests }]] = await connection.query('SELECT COUNT(*) AS totalTests FROM tests');
		// Total questions
		const [[{ totalQuestions }]] = await connection.query('SELECT COUNT(*) AS totalQuestions FROM questions');
		// Total schools
		const [[{ totalSchools }]] = await connection.query('SELECT COUNT(*) AS totalSchools FROM schools WHERE status = 1');

		// Fetch all exams
		const [exams] = await connection.query('SELECT id, name FROM exams');

		// Fetch counts per exam using proper exam_id relationship
		const examStudentCounts = {};
		const examTestCounts = {};
		const examQuestionCounts = {};
		
		for (const exam of exams) {
			// Student count per exam
			let examStudentQuery = `
				SELECT COUNT(DISTINCT s.id) as studentCount
				FROM school_students s
				WHERE s.exam_id = ?
			`;
			let examStudentParams = [exam.id];
			if (schoolId) {
				examStudentQuery += ' AND s.school_id = ?';
				examStudentParams.push(schoolId);
			}

			const [[{ studentCount }]] = await connection.query(examStudentQuery, examStudentParams);
			examStudentCounts[exam.name] = studentCount;
			
			// Test count per exam (combine online tests + offline papers)
			const [[{ testCount1 }]] = await connection.query(
				`SELECT COUNT(*) as testCount1
				 FROM tests
				 WHERE exam_id = ?`,
				[exam.id]
			);
			const [[{ testCount2 }]] = await connection.query(
				`SELECT COUNT(*) as testCount2
				 FROM offline_papers
				 WHERE exam_id = ?`,
				[exam.id]
			);
			examTestCounts[exam.name] = testCount1 + testCount2;
			
			// Question count per exam (using exam_type column)
			const [[{ questionCount }]] = await connection.query(
				`SELECT COUNT(*) as questionCount
				 FROM questions
				 WHERE exam_type = ?`,
				[exam.name]
			);
			examQuestionCounts[exam.name] = questionCount;
		}

		// Fetch School Student Counts for Graph
		const [schoolStudentCounts] = await connection.query(`
			SELECT s.school_name as schoolName, COUNT(u.id) as studentCount
			FROM schools s
			LEFT JOIN users u ON s.id = u.school_id AND u.role_id = (SELECT id FROM roles WHERE name = 'STUDENT')
			GROUP BY s.id, s.school_name
			ORDER BY studentCount DESC
		`);

		// Fetch list of schools for the filter dropdown
		const [schools] = await connection.query('SELECT id, school_name as name FROM schools WHERE status = 1 ORDER BY school_name');

		connection.release();
		return res.status(200).json({
			success: true,
			stats: {
				totalStudents,
				totalFaculty,
				totalTests,
				totalQuestions,
				totalSchools,
				examStudentCounts,
				examTestCounts,
				examQuestionCounts,
				schoolStudentCounts
			},
			exams,
			schools
		});
	} catch (error) {
		console.error('Error fetching dashboard stats:', error);
		return res.status(500).json({ success: false, message: 'Error fetching dashboard stats', error: error.message });
	}
};

export const getStudentDashboardStats = async (req, res) => {
  // TODO: replace with real auth-derived student id
  // For now, use the first student in the database for testing
  // Later: extract from JWT token via req.user.id
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

    const [[statsRow]] = await connection.query(
      `SELECT
         COUNT(*) AS testsAttempted,
         MAX(sta.score / t.total_marks * 100) AS highestPercentage,
         AVG(sta.score / t.total_marks * 100) AS avgPercentage
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       WHERE sta.student_id = ? AND sta.status = 'completed'`,
      [studentId]
    );

    const testsAttempted = statsRow?.testsAttempted || 0;
    const highestScorePercentage = (statsRow?.highestPercentage != null)
      ? Number(Number(statsRow.highestPercentage).toFixed(1))
      : 0;
    const averageScorePercentage = (statsRow?.avgPercentage != null)
      ? Number(Number(statsRow.avgPercentage).toFixed(1))
      : 0;

 
    const [[studentRow]] = await connection.query(
      'SELECT batch_id FROM students WHERE id = ?',
      [studentId]
    );

    // School students have a school + class instead of a batch
    const [[schoolStudent]] = await connection.query(
      'SELECT school_id, standard FROM school_students WHERE user_id = ? LIMIT 1',
      [studentId]
    );

    let upcomingTests = [];
    if ((studentRow && studentRow.batch_id) || schoolStudent) {
      const batchId = studentRow?.batch_id || null;
      const schoolId = schoolStudent?.school_id ?? null;
      const standard = schoolStudent?.standard || null;

      const [upcomingRows] = await connection.query(
        `SELECT
           t.id,
           t.title,
           t.duration_minutes AS duration,
           COALESCE(NULLIF((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id), 0), t.total_marks, 0) as totalMarks,
           t.start_time AS startTime,
           t.end_time AS endTime,
           t.status,
           e.name AS examType,
           (SELECT COUNT(*) FROM student_test_attempts sta 
            WHERE sta.test_id = t.id AND sta.student_id = ?) AS attemptCount
         FROM tests t
         JOIN exams e ON t.exam_id = e.id
         WHERE (t.batch_id = ? OR (t.batch_id IS NULL AND ? IS NULL))
           AND (? IS NULL OR t.school_ids IS NULL OR JSON_LENGTH(t.school_ids) = 0 OR JSON_CONTAINS(t.school_ids, CAST(? AS CHAR), '$') OR JSON_CONTAINS(t.school_ids, JSON_QUOTE(CAST(? AS CHAR)), '$'))
           AND (? IS NULL OR t.standard IS NULL OR t.standard = '' OR FIND_IN_SET(?, t.standard) > 0)
           AND t.status = 'published'
           AND (t.start_time IS NULL OR t.start_time >= NOW() - INTERVAL 1 HOUR)
         ORDER BY t.start_time ASC
         LIMIT 5`,
        [studentId, batchId, batchId, schoolId, schoolId, schoolId, standard, standard]
      );

      const now = new Date();
      upcomingTests = upcomingRows.map((row) => {
        const start = row.startTime ? new Date(row.startTime) : null;
        const end = row.endTime ? new Date(row.endTime) : null;
        const isLive = !!(start && end && now >= start && now <= end);
        const isPublished = row.status === 'published';
        const isAlreadyAttempted = row.attemptCount > 0;

        return {
          id: row.id,
          title: row.title,
          examType: row.examType,
          duration: row.duration,
          totalMarks: row.totalMarks,
          startTime: row.startTime,
          status: row.status,
          isLive,
          isPublished,
          isAlreadyAttempted,
        };
      });
    }

    // 3) Recent completed tests
    const [recentRows] = await connection.query(
      `SELECT
         sta.id AS attemptId,
         t.id AS testId,
         t.title,
         t.status AS testStatus,
         t.mark_publish AS markPublish,
         t.all_subjects,
         t.parent_test_id,
         e.name AS examType,
         sta.score,
         (SELECT COALESCE(SUM(CASE WHEN sa.is_correct = 1 THEN q.marks WHEN sa.is_correct = 0 AND sa.selected_option IS NOT NULL THEN - (q.marks * 0.25) ELSE 0 END),0) FROM student_answers sa JOIN questions q ON sa.question_id = q.id WHERE sa.attempt_id = sta.id) AS computedScore,
         sta.completed_at AS completedAt
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       JOIN exams e ON t.exam_id = e.id
       WHERE sta.student_id = ? AND sta.status = 'completed'
       ORDER BY sta.completed_at DESC
       LIMIT 5`,
      [studentId]
    );

    // Calculate totalMarks for each test, handling combined tests
    const recentTests = await Promise.all(recentRows.map(async (row) => {
      let totalMarks = 0;

      if (row.all_subjects === 1 && row.parent_test_id === null) {
        // Combined test - sum marks from all child tests
        const [childTests] = await connection.query(
          'SELECT id FROM tests WHERE parent_test_id = ?',
          [row.testId]
        );
        const childTestIds = childTests.map(ct => ct.id);

        if (childTestIds.length > 0) {
          const placeholders = childTestIds.map(() => '?').join(', ');
          const [[marksResult]] = await connection.query(
            `SELECT COALESCE(SUM(q.marks), 0) as totalMarks
             FROM test_questions tq
             JOIN questions q ON tq.question_id = q.id
             WHERE tq.test_id IN (${placeholders})`,
            childTestIds
          );
          totalMarks = marksResult?.totalMarks || 0;
        }
      } else {
        // Regular test - sum marks directly
        const [[marksResult]] = await connection.query(
          `SELECT COALESCE(SUM(q.marks), 0) as totalMarks
           FROM test_questions tq
           JOIN questions q ON tq.question_id = q.id
           WHERE tq.test_id = ?`,
          [row.testId]
        );
        totalMarks = marksResult?.totalMarks || 0;
      }

      // Use computedScore when available (freshly computed from student_answers), else fallback to stored score
      const score = typeof row.computedScore !== 'undefined' ? parseFloat(row.computedScore) : parseFloat(row.score || 0);

      const percentage = totalMarks
        ? Number(((score / totalMarks) * 100).toFixed(1))
        : 0;

      return {
        attemptId: row.attemptId,
        testId: row.testId,
        id: row.attemptId,
        title: row.title,
        examType: row.examType,
        score,
        totalMarks,
        percentage,
        completedAt: row.completedAt,
        status: 'submitted', // Always 'submitted' for completed attempts
        markPublish: !!row.markPublish
      };
    }));

    connection.release();

    return res.status(200).json({
      success: true,
      stats: {
        testsAttempted,
        highestScorePercentage,
        averageScorePercentage,
      },
      upcomingTests,
      recentTests,
    });
  } catch (error) {
    console.error('Error fetching student dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching student dashboard stats',
      error: error.message,
    });
  }
};
