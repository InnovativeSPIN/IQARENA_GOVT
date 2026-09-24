import pool from '../../config/db.js';

// Get all test results for a student
export const getStudentResults = async (req, res) => {
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
      console.log('Using test student user_id:', studentId);
    }

    // Get all completed test attempts with full details (include correct/incorrect counts)
    const [attempts] = await connection.query(
      `SELECT
         sta.id AS attemptId,
         sta.test_id AS testId,
         sta.score,
         sta.time_taken AS timeTaken,
         sta.started_at AS startedAt,
         sta.completed_at AS submittedAt,
         t.title AS testTitle,
         COALESCE((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id OR tq.test_id IN (SELECT id FROM tests WHERE parent_test_id = t.id)), 0) as totalMarks,
         t.duration_minutes AS duration,
         e.name AS examType,
         s.name AS subject,
         (SELECT COUNT(*) FROM test_questions WHERE test_id = t.id OR test_id IN (SELECT id FROM tests WHERE parent_test_id = t.id)) AS totalQuestions,
         (SELECT COUNT(*) FROM student_answers WHERE attempt_id = sta.id AND selected_option IS NOT NULL) AS attempted,
         (SELECT COUNT(*) FROM student_answers WHERE attempt_id = sta.id AND is_marked_for_review = 1) AS markedForReview,
         (SELECT COUNT(*) FROM student_answers WHERE attempt_id = sta.id AND is_correct = 1) AS correctCount,
         (SELECT COUNT(*) FROM student_answers WHERE attempt_id = sta.id AND is_correct = 0 AND selected_option IS NOT NULL) AS incorrectCount,
         (SELECT COALESCE(SUM(CASE WHEN sa.is_correct = 1 THEN q.marks WHEN sa.is_correct = 0 AND sa.selected_option IS NOT NULL THEN - (q.marks * 0.25) ELSE 0 END),0) FROM student_answers sa JOIN questions q ON sa.question_id = q.id WHERE sa.attempt_id = sta.id) AS computedScore
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       JOIN exams e ON t.exam_id = e.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE sta.student_id = ? AND sta.status = 'completed'
       ORDER BY sta.completed_at DESC`,
      [studentId]
    );

    // Transform data
    const results = attempts.map(attempt => {
      // Prefer computedScore when available (freshly computed from student_answers), else fallback to stored score
      const computedScore = typeof attempt.computedScore !== 'undefined' ? parseFloat(attempt.computedScore) : parseFloat(attempt.score || 0);

      const percentage = attempt.totalMarks > 0 
        ? ((computedScore / attempt.totalMarks) * 100).toFixed(1)
        : 0;
      
      const unattempted = attempt.totalQuestions - attempt.attempted;
      const correctCount = attempt.correctCount || 0;
      const correctPercentage = attempt.totalQuestions > 0 ? parseFloat(((correctCount / attempt.totalQuestions) * 100).toFixed(1)) : 0;

      return {
        id: attempt.attemptId.toString(),
        testId: attempt.testId.toString(),
        testTitle: attempt.testTitle,
        examType: attempt.examType,
        subject: attempt.subject || 'General',
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalQuestions: attempt.totalQuestions,
        attempted: attempt.attempted,
        unattempted: unattempted,
        markedForReview: attempt.markedForReview,
        correct: correctCount,
        incorrect: attempt.incorrectCount || 0,
        correctPercentage,
        score: computedScore,
        totalMarks: attempt.totalMarks,
        percentage: parseFloat(percentage),
        timeTaken: attempt.timeTaken,
        isResultReleased: true, // All completed tests have results
      };
    });

    // Calculate overall statistics
    const totalTests = results.length;
    const highestPercentage = totalTests > 0 
      ? Math.max(...results.map(r => r.percentage))
      : 0;
    const averagePercentage = totalTests > 0
      ? (results.reduce((sum, r) => sum + r.percentage, 0) / totalTests).toFixed(1)
      : 0;

    // Count subjects per exam (to enable exam-specific subject filters)
    const subjectCounts = {}; // key: `${subject}||${examType}`
    results.forEach(result => {
      const subject = result.subject || 'General';
      const exam = result.examType || '';
      const key = `${subject}||${exam}`;
      subjectCounts[key] = (subjectCounts[key] || 0) + 1;
    });

    const availableSubjects = Object.entries(subjectCounts).map(([key, count]) => {
      const [name, exam] = key.split('||');
      return {
        id: `${name.toLowerCase().replace(/\s+/g, '-')}${exam ? `-${exam.toLowerCase()}` : ''}`,
        name: name,
        count: count,
        examType: exam || 'all'
      };
    });

    connection.release();

    res.json({
      success: true,
      data: {
        results,
        stats: {
          totalTests,
          highestScore: parseFloat(highestPercentage.toFixed(1)),
          averageScore: parseFloat(averagePercentage),
          totalRank1: 0, // Ranking feature not implemented yet
        },
        availableSubjects
      },
    });

  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student results',
      error: error.message,
    });
  }
};

// Get detailed result for a specific test
export const getTestResultDetail = async (req, res) => {
  const { testId } = req.params;
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

    // Get test attempt details
    const [[attempt]] = await connection.query(
      `SELECT
         sta.id AS attemptId,
         sta.test_id AS testId,
         sta.score,
         sta.time_taken AS timeTaken,
         sta.started_at AS startedAt,
         sta.completed_at AS SubmittedAt,
         t.title AS testTitle,
         -- totalMarks will be computed after we gather child tests if necessary
         0 AS totalMarks,
         t.duration_minutes AS duration,
         e.name AS examType,
         s.name AS subject
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       JOIN exams e ON t.exam_id = e.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE sta.test_id = ? AND sta.student_id = ? AND sta.status = 'completed'
       ORDER BY sta.completed_at DESC
       LIMIT 1`,
      [testId, studentId]
    );

    // compute actual totalMarks over test or child tests (for combined parent tests)
    const [[testInfoForMarks]] = await connection.query('SELECT all_subjects, parent_test_id FROM tests WHERE id = ?', [testId]);
    let testIdsForMarks = [testId];
    if (testInfoForMarks && testInfoForMarks.all_subjects === 1 && testInfoForMarks.parent_test_id === null) {
      const [childTests] = await connection.query('SELECT id FROM tests WHERE parent_test_id = ?', [testId]);
      const ids = childTests.map(r => r.id);
      if (ids.length > 0) testIdsForMarks = ids;
    }
    const placeholdersForMarks = testIdsForMarks.map(() => '?').join(',');
    const [[tm]] = await connection.query(
      `SELECT COALESCE(SUM(q.marks),0) as totalMarks FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id IN (${placeholdersForMarks})`,
      testIdsForMarks
    );
    if (tm && typeof tm.totalMarks !== 'undefined') {
      attempt.totalMarks = tm.totalMarks;
    }

    if (!attempt) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test result not found',
      });
    }

    // Get questions for this attempt. Handle combined parent tests (all_subjects) by gathering child tests' questions
    const [[testInfo]] = await connection.query('SELECT all_subjects, parent_test_id FROM tests WHERE id = ?', [testId]);

    let questionTestIds = [testId];
    if (testInfo && testInfo.all_subjects === 1 && testInfo.parent_test_id === null) {
      const [childTests] = await connection.query('SELECT id FROM tests WHERE parent_test_id = ?', [testId]);
      const ids = childTests.map(row => row.id);
      if (ids.length > 0) questionTestIds = ids;
    }

    const placeholders = questionTestIds.map(() => '?').join(',');

    const [questions] = await connection.query(
      `SELECT
         q.id,
         q.question_text,
         q.option_a,
         q.option_b,
         q.option_c,
         q.option_d,
         q.answer AS correctAnswer,
         q.explanation,
         q.marks,
         sa.selected_option AS studentAnswer,
         sa.is_marked_for_review AS isMarkedForReview,
         sa.is_correct AS isCorrect,
         qi.question_img,
         qi.option_a AS optionAImg,
         qi.option_b AS optionBImg,
         qi.option_c AS optionCImg,
         qi.option_d AS optionDImg,
         qi.explanation AS explanationImg,
         s.name AS subjectName
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       LEFT JOIN student_answers sa ON sa.attempt_id = ? AND sa.question_id = q.id
       LEFT JOIN question_images qi ON q.use_img = qi.id
       LEFT JOIN topics tp ON q.topic_id = tp.id
       LEFT JOIN subjects s ON tp.subject_id = s.id
       WHERE tq.test_id IN (${placeholders})
       ORDER BY tq.id`,
      [attempt.attemptId, ...questionTestIds]
    );

    // Calculate stats
    const totalQuestions = questions.length;
    const attempted = questions.filter(q => q.studentAnswer !== null).length;
    const correct = questions.filter(q => q.isCorrect === 1).length;
    const incorrect = questions.filter(q => q.isCorrect === 0).length;
    const markedForReview = questions.filter(q => q.isMarkedForReview === 1).length;
    // Calculate score from question correctness to ensure accuracy (handles negative marking)
    let computedScore = 0;
    questions.forEach(q => {
      const marks = q.marks || 0;
      if (q.studentAnswer === null || q.studentAnswer === undefined) return;
      if (q.isCorrect === 1) computedScore += marks;
      else computedScore -= Math.round((marks * 0.25) * 100) / 100; // negative marking 25%
    });

    // Ensure attempt.score reflects computedScore (some systems may not have updated stored score)
    attempt.score = computedScore;

    const percentage = attempt.totalMarks > 0 
      ? ((computedScore / attempt.totalMarks) * 100).toFixed(1)
      : 0;

    // Subject-wise breakdown
    const subjectMap = {};
    questions.forEach(q => {
      const subj = q.subjectName || 'General';
      if (!subjectMap[subj]) subjectMap[subj] = { subject: subj, totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, unattempted: 0 };
      subjectMap[subj].totalQuestions += 1;
      if (q.studentAnswer !== null) {
        subjectMap[subj].attempted += 1;
        if (q.isCorrect === 1) subjectMap[subj].correct += 1;
        else if (q.isCorrect === 0) subjectMap[subj].incorrect += 1;
      } else {
        subjectMap[subj].unattempted += 1;
      }
    });

    const subjectWise = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.totalQuestions > 0 ? parseFloat(((s.correct / s.totalQuestions) * 100).toFixed(1)) : 0
    }));

    // Calculate rank & total participants for this test
    const [rankRows] = await connection.query(
      `SELECT id, score, time_taken FROM student_test_attempts WHERE test_id = ? AND status = 'completed' ORDER BY score DESC, time_taken ASC`,
      [testId]
    );

    const totalParticipants = rankRows.length;
    let rank = 0;
    for (let i = 0; i < rankRows.length; i++) {
      if (rankRows[i].id === attempt.attemptId) {
        rank = i + 1;
        break;
      }
    }

    // Percentile (rounded to 1 decimal), higher is better (Top X%)
    const percentile = totalParticipants > 0 ? Math.round(((totalParticipants - rank) / totalParticipants) * 1000) / 10 : 0;

    connection.release();

    res.json({
      success: true,
      data: {
        attempt: {
          id: attempt.attemptId,
          testId: attempt.testId,
          testTitle: attempt.testTitle,
          examType: attempt.examType,
          subject: attempt.subject || 'General',
          score: parseFloat(attempt.score),
          totalMarks: attempt.totalMarks,
          percentage: parseFloat(percentage),
          correctPercentage: totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 100).toFixed(1)) : 0,
          timeTaken: attempt.timeTaken,
          duration: attempt.duration,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          rank,
          totalParticipants,
          percentile
        },
        stats: {
          totalQuestions,
          attempted,
          unattempted: totalQuestions - attempted,
          correct,
          incorrect,
          markedForReview,
        },
        questions: questions.map(q => {
          // Helper function to format image path
          const formatImagePath = (imagePath) => {
            if (!imagePath) return null;
            // If path already starts with /uploads, return as is
            if (imagePath.startsWith('/uploads/')) return imagePath;
            // If path starts with /, remove it first then add /uploads/
            if (imagePath.startsWith('/')) return `/uploads${imagePath.substring(1)}`;
            // Otherwise, add /uploads/ prefix
            return `/uploads/${imagePath}`;
          };

          return {
            id: q.id,
            questionText: q.question_text,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            correctAnswer: q.correctAnswer,
            studentAnswer: q.studentAnswer,
            isCorrect: q.isCorrect === 1,
            isMarkedForReview: q.isMarkedForReview === 1,
            explanation: q.explanation,
            marks: q.marks,
            images: q.question_img ? {
              question: formatImagePath(q.question_img),
              optionA: formatImagePath(q.optionAImg),
              optionB: formatImagePath(q.optionBImg),
              optionC: formatImagePath(q.optionCImg),
              optionD: formatImagePath(q.optionDImg),
              explanation: formatImagePath(q.explanationImg),
            } : null,
            subject: q.subjectName || null
          };
        }),
        subjectWise
      },
    });

  } catch (error) {
    console.error('Error fetching test result detail:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test result detail',
      error: error.message,
    });
  }
};
