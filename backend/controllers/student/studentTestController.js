import pool from '../../config/db.js';

// Get test details with questions for student
export const getTestForStudent = async (req, res) => {
  const { testId } = req.params;
  // TODO: Get studentId from auth middleware
  let studentId = req.user?.id || req.studentId;

  try {
    const connection = await pool.getConnection();

    // If no studentId from auth, get the first student for testing
    if (!studentId) {
      const [[firstStudent]] = await connection.query(
        'SELECT id FROM students LIMIT 1'
      );
      if (!firstStudent) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'No students found in database',
        });
      }
      studentId = firstStudent.id;
    }

    // Get test details
    const [[test]] = await connection.query(
      `SELECT
         t.id,
         t.title,
         t.duration_minutes AS duration,
         t.all_subjects,
         t.parent_test_id,
         COALESCE((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id), 0) as totalMarks,
         t.start_time AS startTime,
         t.end_time AS endTime,
         t.status,
         e.name AS examType,
         s.name AS subject
       FROM tests t
       JOIN exams e ON t.exam_id = e.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.id = ?`,
      [testId]
    );


    if (!test) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found',
      });
    }

    // Check if test is published
    if (test.status !== 'published') {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'Test is not published yet',
      });
    }

    // Check if student's batch has access to this test
    const [[studentBatch]] = await connection.query(
      'SELECT batch_id FROM students WHERE id = ?',
      [studentId]
    );

    if (studentBatch) {
      const [[testBatch]] = await connection.query(
        'SELECT id FROM tests WHERE id = ? AND batch_id = ?',
        [testId, studentBatch.batch_id]
      );

      if (!testBatch) {
        connection.release();
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this test',
        });
      }
    }

    // Check if student has already attempted this test
    const [[existingAttempt]] = await connection.query(
      `SELECT id, status, started_at 
       FROM student_test_attempts 
       WHERE student_id = ? AND test_id = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [studentId, testId]
    );

      // If the student already has an attempt, fetch questions in the per-attempt stored order.
      // If no per-attempt order exists yet (older attempts), create and persist a randomized order so it's consistent for the attempt.
      let questions;
      if (existingAttempt && existingAttempt.id) {
        // Check if per-attempt question ordering exists
        const [orderRows] = await connection.query(
          `SELECT question_id FROM student_test_attempt_questions WHERE attempt_id = ? ORDER BY position`,
          [existingAttempt.id]
        );

        if (orderRows.length === 0) {
          // No ordering persisted yet; build it from test_questions, shuffle and store
          let qIds = [];

          // Check if this is a combined test
          if (test.all_subjects === 1 && test.parent_test_id === null) {
            // This is a combined test - get questions from all child tests
            const [childTests] = await connection.query(
              'SELECT id FROM tests WHERE parent_test_id = ?',
              [testId]
            );
            const childTestIds = childTests.map(ct => ct.id);

            if (childTestIds.length > 0) {
              const placeholders = childTestIds.map(() => '?').join(', ');
              const [qRows] = await connection.query(
                `SELECT DISTINCT tq.question_id FROM test_questions tq WHERE tq.test_id IN (${placeholders}) ORDER BY tq.id`,
                childTestIds
              );
              qIds = qRows.map(r => r.question_id);
            }
          } else {
            // Normal test - get questions from this test
            const [qRows] = await connection.query(
              `SELECT tq.question_id FROM test_questions tq WHERE tq.test_id = ? ORDER BY tq.id`,
              [testId]
            );
            qIds = qRows.map(r => r.question_id);
          }

          // Shuffle using Fisher-Yates
          for (let i = qIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [qIds[i], qIds[j]] = [qIds[j], qIds[i]];
          }

          // Ensure mapping table exists
          await connection.execute(
            `CREATE TABLE IF NOT EXISTS student_test_attempt_questions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              attempt_id INT NOT NULL,
              question_id INT NOT NULL,
              position INT NOT NULL,
              INDEX (attempt_id),
              FOREIGN KEY (attempt_id) REFERENCES student_test_attempts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
          );

          if (qIds.length > 0) {
            const values = qIds.map((qid, idx) => [existingAttempt.id, qid, idx + 1]);
            const placeholders = values.map(() => '(?, ?, ?)').join(', ');
            await connection.execute(
              `INSERT INTO student_test_attempt_questions (attempt_id, question_id, position) VALUES ${placeholders}`,
              values.flat()
            );
          }
        }

        // Now select questions in the stored order
        const [qOrdered] = await connection.query(
          `SELECT q.id, q.question_text as questionText, q.question_ta as questionTextTa, q.use_img as useImg, q.option_a as optionA, q.option_a_ta as optionATa, q.option_b as optionB, q.option_b_ta as optionBTa, q.option_c as optionC, q.option_c_ta as optionCTa, q.option_d as optionD, q.option_d_ta as optionDTa, q.answer, q.marks, t.topic_name as topicName
           FROM student_test_attempt_questions staq
           JOIN questions q ON staq.question_id = q.id
           LEFT JOIN topics t ON q.topic_id = t.id
           WHERE staq.attempt_id = ?
           ORDER BY staq.position`,
          [existingAttempt.id]
        );

        questions = qOrdered;
      } else {
        // No attempt yet: return questions in test order (preview). Randomization occurs when student starts the attempt.
        let qRows = [];

        // Check if this is a combined test
        if (test.all_subjects === 1 && test.parent_test_id === null) {
          // This is a combined test - get questions from all child tests
          const [childTests] = await connection.query(
            'SELECT id FROM tests WHERE parent_test_id = ?',
            [testId]
          );
          const childTestIds = childTests.map(ct => ct.id);

          if (childTestIds.length > 0) {
            const placeholders = childTestIds.map(() => '?').join(', ');
            const [rows] = await connection.query(
              `SELECT DISTINCT q.id, q.question_text as questionText, q.question_ta as questionTextTa, q.use_img as useImg, q.option_a as optionA, q.option_a_ta as optionATa, q.option_b as optionB, q.option_b_ta as optionBTa, q.option_c as optionC, q.option_c_ta as optionCTa, q.option_d as optionD, q.option_d_ta as optionDTa, q.answer, q.marks, t.topic_name as topicName
               FROM test_questions tq
               JOIN questions q ON tq.question_id = q.id
               LEFT JOIN topics t ON q.topic_id = t.id
               WHERE tq.test_id IN (${placeholders})
               ORDER BY tq.id`,
              childTestIds
            );
            qRows = rows;
          }
        } else {
          // Normal test - get questions from this test
          const [rows] = await connection.query(
            `SELECT q.id, q.question_text as questionText, q.question_ta as questionTextTa, q.use_img as useImg, q.option_a as optionA, q.option_a_ta as optionATa, q.option_b as optionB, q.option_b_ta as optionBTa, q.option_c as optionC, q.option_c_ta as optionCTa, q.option_d as optionD, q.option_d_ta as optionDTa, q.answer, q.marks, t.topic_name as topicName
             FROM test_questions tq
             JOIN questions q ON tq.question_id = q.id
             LEFT JOIN topics t ON q.topic_id = t.id
             WHERE tq.test_id = ?
             ORDER BY tq.id`,
            [testId]
          );
          qRows = rows;
        }

        questions = qRows;
      }

    // Helper function to format image path
    const formatImagePath = (imagePath) => {
      if (!imagePath) return null;
      // If path already starts with /uploads, return as is
      if (imagePath.startsWith('/uploads/')) return imagePath;
      // If path starts with /, remove it first then add /uploads/
      if (imagePath.startsWith('/')) return `/uploads/${imagePath.substring(1)}`;
      // Otherwise, add /uploads/ prefix
      return `/uploads/${imagePath}`;
    };

    // For each question, if use_img > 0, fetch images
    const questionsWithImages = await Promise.all(
      questions.map(async (question) => {
        if (question.useImg && Number(question.useImg) > 0) {
          const [imageRows] = await connection.execute(
            `SELECT
              question_img as questionImage,
              option_a as optionAImage,
              option_b as optionBImage,
              option_c as optionCImage,
              option_d as optionDImage
            FROM question_images
            WHERE id = ?`,
            [question.useImg]
          );

          if (imageRows.length > 0) {
            return {
              ...question,
              questionImage: formatImagePath(imageRows[0].questionImage),
              optionAImage: formatImagePath(imageRows[0].optionAImage),
              optionBImage: formatImagePath(imageRows[0].optionBImage),
              optionCImage: formatImagePath(imageRows[0].optionCImage),
              optionDImage: formatImagePath(imageRows[0].optionDImage),
            };
          }
        }

        return {
          ...question,
          questionImage: null,
          optionAImage: null,
          optionBImage: null,
          optionCImage: null,
          optionDImage: null,
        };
      })
    );

    connection.release();

    return res.status(200).json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        exam_name: test.examType,
        subject_name: test.subject,
        duration: test.duration,
        total_marks: test.totalMarks,
        passing_marks: test.totalMarks * 0.33,
        start_time: test.startTime,
        end_time: test.endTime,
      },
      questions: questionsWithImages.map((q, index) => ({
        ...q,
        questionNumber: index + 1,
        subject: test.subject || 'General',
        topic: q.topicName || 'General',
        negativeMarks: q.marks * 0.25,
      })),
      existingAttempt: existingAttempt || null,
    });
  } catch (error) {
    console.error('Error fetching test for student:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching test',
      error: error.message,
    });
  }
};

// Start test attempt
export const startTestAttempt = async (req, res) => {
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
    } else {
      // Get user_id from students table if we have a student id
      const [[student]] = await connection.query(
        'SELECT user_id FROM students WHERE user_id = ? LIMIT 1',
        [studentId]
      );
      if (student) {
        studentId = student.user_id;
      }
    }

    // Check if already has ANY attempt (completed or in-progress)
    const [[existingAttempt]] = await connection.query(
      `SELECT id, status 
       FROM student_test_attempts 
       WHERE student_id = ? AND test_id = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [studentId, testId]
    );

    if (existingAttempt) {
      connection.release();
      
      if (existingAttempt.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'You have already completed this test',
          alreadyAttempted: true,
        });
      }
      
      // If in-progress, allow continuing
      return res.status(200).json({
        success: true,
        message: 'Continuing existing attempt',
        attemptId: existingAttempt.id,
      });
    }

    // Verify test is published and within start/end window (if set)
    const [[testRow]] = await connection.query('SELECT status, start_time as startTime, end_time as endTime FROM tests WHERE id = ?', [testId]);
    if (!testRow) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    if (testRow.status !== 'published') {
      connection.release();
      return res.status(403).json({ success: false, message: 'Test is not published', status: testRow.status });
    }

    const now = new Date();
    const startTime = testRow.startTime ? new Date(testRow.startTime) : null;
    const endTime = testRow.endTime ? new Date(testRow.endTime) : null;
    const startOk = !startTime || now >= startTime;
    const endOk = !endTime || now <= endTime;
    if (!startOk || !endOk) {
      connection.release();
      // Provide helpful metadata so the client can show a helpful message
      const reason = !startOk ? 'not_started' : 'ended';
      return res.status(403).json({
        success: false,
        message: 'Test is not currently available',
        reason,
        startTime: startTime ? startTime.toISOString() : null,
        endTime: endTime ? endTime.toISOString() : null,
      });
    }

    // Create new attempt
    const [result] = await connection.execute(
      `INSERT INTO student_test_attempts 
       (student_id, test_id, status, started_at) 
       VALUES (?, ?, 'in_progress', NOW())`,
      [studentId, testId]
    );

    const attemptId = result.insertId;

    // Ensure mapping table exists then create a randomized order for this attempt
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS student_test_attempt_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        position INT NOT NULL,
        INDEX (attempt_id),
        FOREIGN KEY (attempt_id) REFERENCES student_test_attempts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // Fetch questions for this test and randomize order
    let qIds = [];

    // Check if this is a combined test or randomized
    const [[testInfo]] = await connection.query('SELECT all_subjects, parent_test_id, is_randomized, section_config FROM tests WHERE id = ?', [testId]);
    
    if (testInfo && testInfo.is_randomized && testInfo.section_config) {
      let config = [];
      try {
        config = typeof testInfo.section_config === 'string' ? JSON.parse(testInfo.section_config) : testInfo.section_config;
      } catch(e) {
        console.error('Failed to parse section_config', e);
      }
      
      for (const a of config) {
        const sId = a.subjectId;
        const tId = a.topicId;
        const stId = a.subtopicId;
        const desired = Number(a.questionCount) || 0;
        
        let candidateQuery;
        let cparams = [];
        if (stId) {
          candidateQuery = `SELECT q.id FROM questions q WHERE q.subtopic_id = ? ORDER BY RAND() LIMIT ?`;
          cparams = [stId, desired];
        } else if (tId) {
          candidateQuery = `SELECT q.id FROM questions q WHERE q.topic_id = ? ORDER BY RAND() LIMIT ?`;
          cparams = [tId, desired];
        } else if (sId) {
          candidateQuery = `SELECT q.id FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? ORDER BY RAND() LIMIT ?`;
          cparams = [sId, desired];
        }
        
        if (candidateQuery) {
          const [candRows] = await connection.execute(candidateQuery, cparams);
          qIds.push(...candRows.map(r => r.id));
        }
      }
    } else if (testInfo && testInfo.all_subjects === 1 && testInfo.parent_test_id === null) {
      // This is a combined test - get questions from all child tests
      const [childTests] = await connection.query(
        'SELECT id FROM tests WHERE parent_test_id = ?',
        [testId]
      );
      const childTestIds = childTests.map(ct => ct.id);

      if (childTestIds.length > 0) {
        const placeholders = childTestIds.map(() => '?').join(', ');
        const [qRows] = await connection.query(
          `SELECT DISTINCT tq.question_id FROM test_questions tq WHERE tq.test_id IN (${placeholders}) ORDER BY tq.id`,
          childTestIds
        );
        qIds = qRows.map(r => r.question_id);
      }
    } else {
      // Normal test - get questions from this test
      const [qRows] = await connection.query('SELECT tq.question_id FROM test_questions tq WHERE tq.test_id = ? ORDER BY tq.id', [testId]);
      qIds = qRows.map(r => r.question_id);
    }

    // Shuffle using Fisher-Yates
    for (let i = qIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qIds[i], qIds[j]] = [qIds[j], qIds[i]];
    }

    if (qIds.length > 0) {
      const values = qIds.map((qid, idx) => [attemptId, qid, idx + 1]);
      const placeholders = values.map(() => '(?, ?, ?)').join(', ');
      await connection.execute(`INSERT INTO student_test_attempt_questions (attempt_id, question_id, position) VALUES ${placeholders}`, values.flat());
    }

    connection.release();

    return res.status(201).json({
      success: true,
      message: 'Test attempt started',
      attemptId: attemptId,
    });
  } catch (error) {
    console.error('Error starting test attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Error starting test attempt',
      error: error.message,
    });
  }
};

// Submit test attempt
export const submitTestAttempt = async (req, res) => {
  const { testId } = req.params;
  const { attemptId, answers } = req.body;
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

    // Verify attempt belongs to student
    const [[attempt]] = await connection.query(
      `SELECT id, started_at 
       FROM student_test_attempts 
       WHERE id = ? AND student_id = ? AND test_id = ?`,
      [attemptId, studentId, testId]
    );

    if (!attempt) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    // Calculate score
    let testQuestions = [];

    // Check if this is a combined test
    const [[testInfo]] = await connection.query('SELECT all_subjects, parent_test_id FROM tests WHERE id = ?', [testId]);
    if (testInfo && testInfo.all_subjects === 1 && testInfo.parent_test_id === null) {
      // This is a combined test - get questions from all child tests
      const [childTests] = await connection.query(
        'SELECT id FROM tests WHERE parent_test_id = ?',
        [testId]
      );
      const childTestIds = childTests.map(ct => ct.id);

      if (childTestIds.length > 0) {
        const placeholders = childTestIds.map(() => '?').join(', ');
        const [questions] = await connection.query(
          `SELECT DISTINCT q.id, q.answer as correctAnswer, q.marks
           FROM test_questions tq
           JOIN questions q ON tq.question_id = q.id
           WHERE tq.test_id IN (${placeholders})`,
          childTestIds
        );
        testQuestions = questions;
      }
    } else {
      // Normal test - get questions from this test
      const [questions] = await connection.query(
        `SELECT q.id, q.answer as correctAnswer, q.marks
         FROM test_questions tq
         JOIN questions q ON tq.question_id = q.id
         WHERE tq.test_id = ?`,
        [testId]
      );
      testQuestions = questions;
    }

    let score = 0;
    const questionMap = new Map(testQuestions.map(q => [q.id, q]));

    // Save each answer and calculate score
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (question && answer.selectedOption) {
        const isCorrect = answer.selectedOption === question.correctAnswer;
        if (isCorrect) {
          score += question.marks;
        } else {
          // Apply negative marking (25% of question marks)
          score -= question.marks * 0.25;
        }

        // Save or update answer
        await connection.execute(
          `INSERT INTO student_answers 
           (attempt_id, question_id, selected_option, is_marked_for_review, is_correct, time_taken) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           selected_option = VALUES(selected_option),
           is_marked_for_review = VALUES(is_marked_for_review),
           is_correct = VALUES(is_correct),
           time_taken = VALUES(time_taken)`,
          [
            attemptId, 
            answer.questionId, 
            answer.selectedOption, 
            answer.isMarkedForReview || false, 
            isCorrect, 
            answer.timeTaken || 0
          ]
        );
      }
    }
    
    // Ensure score is not negative
    score = Math.max(0, score);

    // Calculate time taken (ensure it's a positive number)
    const startTime = new Date(attempt.started_at).getTime();
    const endTime = new Date().getTime();
    const timeTaken = Math.max(0, Math.floor((endTime - startTime) / 1000));

    // Update attempt with score and completion
    await connection.execute(
      `UPDATE student_test_attempts
       SET status = 'completed',
           score = ?,
           completed_at = NOW(),
           time_taken = ?
       WHERE id = ?`,
      [score, timeTaken, attemptId]
    );

    // Get total marks for the test
    let totalMarks = 0;

    if (testInfo && testInfo.all_subjects === 1 && testInfo.parent_test_id === null) {
      // This is a combined test - calculate total marks from all child tests
      const [childTests] = await connection.query(
        'SELECT id FROM tests WHERE parent_test_id = ?',
        [testId]
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
      // Normal test - use stored total_marks
      const [[testMarks]] = await connection.query(
        'SELECT total_marks FROM tests WHERE id = ?',
        [testId]
      );
      totalMarks = testMarks?.total_marks || 100;
    }

    const percentage = (score / totalMarks) * 100;

    // Fetch detailed attempt info and per-question answers to build a report
    const [[attemptRow]] = await connection.query(
      `SELECT
         sta.id AS attemptId,
         sta.test_id AS testId,
         sta.score,
         sta.time_taken AS timeTaken,
         sta.started_at AS startedAt,
         sta.completed_at AS submittedAt,
         t.title AS testTitle,
         t.total_marks AS totalMarks,
         t.duration_minutes AS duration,
         e.name AS examType,
         s.name AS subject
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       JOIN exams e ON t.exam_id = e.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE sta.id = ?`,
      [attemptId]
    );

    // Get all questions with student answers for this attempt
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
         qi.explanation AS explanationImg
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       LEFT JOIN student_answers sa ON sa.attempt_id = ? AND sa.question_id = q.id
       LEFT JOIN question_images qi ON q.use_img = qi.id
       WHERE tq.test_id = ?
       ORDER BY tq.id`,
      [attemptId, testId]
    );

    // Calculate stats
    const totalQuestions = questions.length;
    const attemptedCount = questions.filter(q => q.studentAnswer !== null).length;
    const correctCount = questions.filter(q => q.isCorrect === 1).length;
    const incorrectCount = questions.filter(q => q.isCorrect === 0).length;
    const markedForReviewCount = questions.filter(q => q.isMarkedForReview === 1).length;

    // Helper to format image path
    const formatImagePath = (imagePath) => {
      if (!imagePath) return null;
      if (imagePath.startsWith('/uploads/')) return imagePath;
      if (imagePath.startsWith('/')) return `/uploads/${imagePath.substring(1)}`;
      return `/uploads/${imagePath}`;
    };

    const formattedQuestions = questions.map(q => ({
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
      } : null
    }));

    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      score,
      totalMarks,
      percentage,
      attemptId,
      report: {
        attempt: {
          id: attemptRow.attemptId,
          testId: attemptRow.testId,
          testTitle: attemptRow.testTitle,
          examType: attemptRow.examType,
          subject: attemptRow.subject || 'General',
          score: parseFloat(attemptRow.score),
          totalMarks: attemptRow.totalMarks,
          percentage: parseFloat(((attemptRow.score / attemptRow.totalMarks) * 100).toFixed(1)),
          timeTaken: attemptRow.timeTaken,
          duration: attemptRow.duration,
          startedAt: attemptRow.startedAt,
          submittedAt: attemptRow.submittedAt,
        },
        stats: {
          totalQuestions,
          attempted: attemptedCount,
          unattempted: totalQuestions - attemptedCount,
          correct: correctCount,
          incorrect: incorrectCount,
          markedForReview: markedForReviewCount,
        },
        questions: formattedQuestions,
      }
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting test',
      error: error.message,
    });
  }
};
