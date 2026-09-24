import pool from '../../config/db.js';
import emailSender from '../../lib/emailSender.js';
import { generateStudentReportPdf } from '../../lib/pdfGenerator.js';

export const getFacultyTests = async (req, res) => {
  const facultyUserId = req.user?.id;
  const { examId, subjectId, topicId, status, search } = req.query;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT 
        t.id,
        t.title,
        t.duration_minutes as duration,
        COALESCE(t.total_marks, (SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id)) as totalMarks,
        t.start_Time,
        t.end_Time,
        t.status,
        t.created_at as createdAt,
        t.created_by as createdBy,
        e.id as examId,
        e.name as examType,
        s.id as subjectId,
        s.name as subject,
        t.topic_id as topicId,
        top.topic_name as topicName,
        t.subtopic_id as subtopicId,
        st.subtopic_name as subtopicName,
        t.all_subjects as all_subjects,
        t.parent_test_id as parent_test_id,
        b.id as batchId,
        b.batch_name as batchName,
        IF(t.all_subjects = 1, (SELECT COALESCE(COUNT(DISTINCT tq.question_id),0) FROM test_questions tq JOIN tests ch ON tq.test_id = ch.id WHERE ch.parent_test_id = t.id), (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id)) as questionCount,
        IF(t.all_subjects = 1, (SELECT COALESCE(COUNT(*),0) FROM student_test_attempts sta JOIN tests ch ON sta.test_id = ch.id WHERE ch.parent_test_id = t.id), (SELECT COUNT(*) FROM student_test_attempts sta WHERE sta.test_id = t.id)) as attemptsCount
      FROM tests t
      JOIN exams e ON t.exam_id = e.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN topics top ON t.topic_id = top.id
      LEFT JOIN subtopics st ON t.subtopic_id = st.id
      LEFT JOIN batches b ON t.batch_id = b.id
      LEFT JOIN subject_allocation sa ON t.subject_id = sa.subject_id AND sa.faculty_user_id = ?
      WHERE t.created_by = ?
    `;

    const params = [facultyUserId, facultyUserId];

    if (examId) {
      query += ' AND t.exam_id = ?';
      params.push(examId);
    }

    if (subjectId) {
      query += ' AND t.subject_id = ?';
      params.push(subjectId);
    }

    if (topicId) {
      query += ' AND t.topic_id = ?';
      params.push(topicId);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND t.title LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY t.created_at DESC';

    const [rows] = await connection.execute(query, params);
    connection.release();

    return res.status(200).json({
      success: true,
      tests: rows,
      total: rows.length
    });
  } catch (error) {
    console.error('Error fetching faculty tests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching tests',
      error: error.message
    });
  }
};

/**
 * Get single test by ID with questions
 */
export const getFacultyTestById = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Get test details
    const [rows] = await connection.execute(
      `SELECT 
        t.id,
        t.title,
        t.duration_minutes as duration,
        COALESCE(t.total_marks, (SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id)) as totalMarks,
        DATE_FORMAT(t.start_time, '%Y-%m-%d %H:%i:%s') as startTime,
        DATE_FORMAT(t.end_time, '%Y-%m-%d %H:%i:%s') as endTime,
        t.status,
        t.created_at as createdAt,
        t.created_by as createdBy,
        e.id as examId,
        e.name as examType,
        s.id as subjectId,
        s.name as subject,
        t.topic_id as topicId,
        top.topic_name as topicName,
        t.subtopic_id as subtopicId,
        st.subtopic_name as subtopicName,
        t.all_subjects as all_subjects,
        t.parent_test_id as parent_test_id,
        b.id as batchId,
        b.batch_name as batchName,
        (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) as questionCount
      FROM tests t
      JOIN exams e ON t.exam_id = e.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN topics top ON t.topic_id = top.id
      LEFT JOIN subtopics st ON t.subtopic_id = st.id
      LEFT JOIN batches b ON t.batch_id = b.id
      WHERE t.id = ? AND t.created_by = ?`,
      [id, facultyUserId]
    );

    console.debug('getFacultyTestById - DB row:', rows[0]);
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Get test questions
    const [questions] = await connection.execute(
      `SELECT 
        q.id,
        q.question_text as text,
        q.use_img as useImg,
        q.option_a as optionA,
        q.option_b as optionB,
        q.option_c as optionC,
        q.option_d as optionD,
        q.answer as correctAnswer,
        q.marks,
        q.explanation,
        t.topic_name as topicName,
        s.name as subjectName
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE tq.test_id = ?
      ORDER BY tq.id`,
      [id]
    );

    connection.release();

    return res.status(200).json({
      success: true,
      test: rows[0],
      questions: questions
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching test',
      error: error.message
    });
  }
};

/**
 * Create new test
 */
export const createFacultyTest = async (req, res) => {
  const facultyUserId = req.user?.id;
  const {
    title,
    examId: providedExamId,
    subjectId,
    topicId,
    subtopicId,
    duration,
    questionCount,
    batchId,
    startTime,
    endTime,
    status
  } = req.body;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  console.log('Received test creation request:', req.body);

  if (!title || !subjectId || !duration) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: title, subjectId, duration'
    });
  }

  // Calculate total marks: each question is 4 marks
  // Ensure at least 1 question when creating a test
  let finalQuestionCount = Number(questionCount) || 0;
  if (finalQuestionCount < 1) finalQuestionCount = 1;
  const totalMarks = finalQuestionCount * 4;

  try {
    const connection = await pool.getConnection();

    // Verify faculty has access to this subject and get exam_id from subjects table
    const [allocation] = await connection.execute(
      `SELECT sa.*, s.exam_id 
       FROM subject_allocation sa
       INNER JOIN subjects s ON sa.subject_id = s.id
       WHERE sa.faculty_user_id = ? AND sa.subject_id = ?`,
      [facultyUserId, subjectId]
    );

    if (allocation.length === 0) {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this subject'
      });
    }

    // Use examId from subjects table if not provided
    const examId = providedExamId || allocation[0].exam_id;

    if (!examId) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Could not determine exam ID for this subject'
      });
    }

    // Insert test
    const [result] = await connection.execute(
      `INSERT INTO tests 
       (title, exam_id, subject_id, topic_id, subtopic_id, duration_minutes, total_marks, 
        batch_id, start_time, end_time, status, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title,
        examId,
        subjectId,
        topicId || null,
        subtopicId || null,
        duration,
        totalMarks,
        batchId || null,
        startTime || null,
        endTime || null,
        status || 'active',
        facultyUserId
      ]
    );

    // Auto-allocate questions if needed (ensure at least one question exists on the test)
    try {
      // count currently allocated (should be zero immediately after create)
      const [existing] = await connection.execute('SELECT COUNT(*) as cnt FROM test_questions WHERE test_id = ?', [result.insertId]);
      const already = existing && existing[0] ? Number(existing[0].cnt) : 0;
      const need = Math.max(0, finalQuestionCount - already);

      if (need > 0) {
        // pick available questions matching subtopic -> topic if provided, otherwise subject
        let pickQuery = '';
        let pickParams = [];
        if (subtopicId) {
          pickQuery = `SELECT id FROM questions WHERE subtopic_id = ? ORDER BY created_at DESC LIMIT ?`;
          pickParams = [subtopicId, need];
        } else if (topicId) {
          pickParams = [topicId, need];
        } else {
          pickQuery = `SELECT q.id FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ? ORDER BY q.created_at DESC LIMIT ?`;
          pickParams = [subjectId, need];
        }

        const [candidates] = await connection.execute(pickQuery, pickParams);
        if (candidates && candidates.length > 0) {
          const values = candidates.map(c => [result.insertId, c.id]);
          const placeholders = values.map(() => '(?, ?)').join(', ');
          await connection.execute(
            `INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders}`,
            values.flat()
          );
        }
      }
    } catch (e) {
      console.warn('Auto-allocation failed after test create:', e && e.message);
    }

    connection.release();

    return res.status(201).json({
      success: true,
      message: 'Test created successfully',
      testId: result.insertId
    });
  } catch (error) {
    console.error('Error creating test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating test',
      error: error.message
    });
  }
};

/**
 * Update test
 */
export const updateFacultyTest = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;
  const {
    title,
    duration,
    totalMarks,
    batchId,
    startTime,
    endTime,
    status,
    markPublish,
    subtopicId,
    subjectId, topicId, questionCount
  } = req.body;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT * FROM tests WHERE id = ? AND created_by = ?`,
      [id, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Get current number of questions allocated to this test
    const [qCountRows] = await connection.execute('SELECT COUNT(*) as cnt FROM test_questions WHERE test_id = ?', [id]);
    const prevQuestionCount = qCountRows && qCountRows[0] ? Number(qCountRows[0].cnt) : 0;

    // Build dynamic update query based on provided fields
    const updates = [];
    const params = [];

    // If subject change is requested, verify faculty has access and determine exam_id
    if (subjectId !== undefined) {
      const [allocation] = await connection.execute(
        `SELECT sa.*, s.exam_id FROM subject_allocation sa INNER JOIN subjects s ON sa.subject_id = s.id WHERE sa.faculty_user_id = ? AND sa.subject_id = ?`,
        [facultyUserId, subjectId]
      );
      if (allocation.length === 0) {
        connection.release();
        return res.status(403).json({ success: false, message: 'You do not have access to this subject' });
      }
      // set both subject_id and exam_id
      updates.push('subject_id = ?');
      params.push(subjectId);
      updates.push('exam_id = ?');
      params.push(allocation[0].exam_id || null);
    }

    // If topic change is requested
    if (topicId !== undefined) {
      updates.push('topic_id = ?');
      params.push(topicId || null);
    }

    if (subtopicId !== undefined) {
      updates.push('subtopic_id = ?');
      params.push(subtopicId || null);
    }

    // If questionCount provided, update total_marks accordingly (each question=4 marks)
    if (questionCount !== undefined) {
      // enforce minimum of 1
      const newCount = Math.max(1, Number(questionCount) || 0);
      updates.push('total_marks = ?');
      params.push(newCount * 4);
    }

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (duration !== undefined) {
      updates.push('duration_minutes = ?');
      params.push(duration);
    }
    if (totalMarks !== undefined) {
      updates.push('total_marks = ?');
      params.push(totalMarks);
    }
    if (batchId !== undefined) {
      updates.push('batch_id = ?');
      params.push(batchId || null);
    }
    if (startTime !== undefined) {
      updates.push('start_time = ?');
      params.push(startTime || null);
    }
    if (endTime !== undefined) {
      updates.push('end_time = ?');
      params.push(endTime || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    // Support publishing marks: if markPublish is provided, set mark_publish to 1/0
    if (markPublish !== undefined) {
      updates.push('mark_publish = ?');
      params.push(markPublish ? 1 : 0);
    }

    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    // Update test
    await connection.execute(
      `UPDATE tests SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // If the requested questionCount is less than previously allocated questions, remove surplus questions
    let removedCount = 0;
    if (questionCount !== undefined) {
      const newCount = Math.max(1, Number(questionCount) || 0);
      if (newCount < prevQuestionCount) {
        const toRemove = prevQuestionCount - newCount;
        // remove the most recently added questions first
        const [delResult] = await connection.execute(
          'DELETE FROM test_questions WHERE test_id = ? ORDER BY id DESC LIMIT ?',
          [id, toRemove]
        );
        // delResult.affectedRows exists for mysql2
        removedCount = delResult && delResult.affectedRows ? delResult.affectedRows : toRemove;
      }
    }
    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Test updated successfully',
      removedCount
    });
  } catch (error) {
    console.error('Error updating test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating test',
      error: error.message
    });
  }
};

/**
 * Delete test
 */
export const deleteFacultyTest = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;
  const force = req.query.force === 'true';
  const unlink = req.query.unlink === 'true' || req.query.unlink === true;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT * FROM tests WHERE id = ? AND created_by = ?`,
      [id, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Check for existing student attempts
    const [[attemptCountRow]] = await connection.execute('SELECT COUNT(*) as cnt FROM student_test_attempts WHERE test_id = ?', [id]);
    const attemptCount = attemptCountRow && attemptCountRow.cnt ? Number(attemptCountRow.cnt) : 0;

    if (attemptCount > 0 && !force) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete test with existing student attempts',
        attempts: attemptCount
      });
    }

    const parentId = test[0].parent_test_id;

    // If the test is a parent (has child tests), detect children
    const [childRows] = await connection.execute('SELECT id FROM tests WHERE parent_test_id = ?', [id]);
    const childIds = childRows.map(r => r.id).filter(Boolean);

    // NOTE: Auto-unlink behavior: when deleting a parent that has child tests, we will
    // unlink the children (set parent_test_id = NULL) by default, unless the caller
    // explicitly used force=true to delete children as well. This keeps the operation
    // safe while making delete action convenient.

    // Begin transaction for delete/unlink operations
    await connection.beginTransaction();
    try {
      if (childIds.length > 0) {
        const childPlaceholders = childIds.map(() => '?').join(',');

        if (force) {
          // Delete child tests and associated data (force delete of parent + children)
          // delete student_test_attempt_questions for attempts of child tests
          await connection.execute(
            `DELETE staq FROM student_test_attempt_questions staq
             JOIN student_test_attempts sta ON staq.attempt_id = sta.id
             WHERE sta.test_id IN (${childPlaceholders})`,
            childIds
          );
          // delete attempts for child tests
          await connection.execute(`DELETE FROM student_test_attempts WHERE test_id IN (${childPlaceholders})`, childIds);
          // delete test_questions for child tests
          await connection.execute(`DELETE FROM test_questions WHERE test_id IN (${childPlaceholders})`, childIds);
          // delete child tests
          await connection.execute(`DELETE FROM tests WHERE id IN (${childPlaceholders})`, childIds);
        } else {
          // Auto-unlink children: set their parent_test_id to NULL (children remain)
          await connection.execute('UPDATE tests SET parent_test_id = NULL WHERE parent_test_id = ?', [id]);
        }
      }

      // If force delete requested, remove student attempts and their related mappings for parent
      if (attemptCount > 0 && force) {
        await connection.execute(
          `DELETE staq FROM student_test_attempt_questions staq
           JOIN student_test_attempts sta ON staq.attempt_id = sta.id
           WHERE sta.test_id = ?`,
          [id]
        );
        await connection.execute('DELETE FROM student_test_attempts WHERE test_id = ?', [id]);
      }

      // Delete test questions for parent
      await connection.execute('DELETE FROM test_questions WHERE test_id = ?', [id]);

      // Delete parent test
      await connection.execute('DELETE FROM tests WHERE id = ?', [id]);

      // Note: parent totals update is only relevant when child tests were deleted (not when unlinked)
      if (force && parentId) {
        try {
          const [sumRows] = await connection.execute(`SELECT COALESCE(SUM(total_marks), 0) as totalMarks, COUNT(*) as childCount FROM tests WHERE parent_test_id = ?`, [parentId]);
          const totalMarksForParent = (sumRows && sumRows[0]) ? Number(sumRows[0].totalMarks || 0) : 0;
          const childCount = (sumRows && sumRows[0]) ? Number(sumRows[0].childCount || 0) : 0;
          if (childCount === 0) {
            // No more children - unset all_subjects on parent and clear total
            await connection.execute('UPDATE tests SET all_subjects = 0, total_marks = 0 WHERE id = ?', [parentId]);
          } else {
            await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarksForParent, parentId]);
          }
        } catch (e) {
          console.warn('Failed to update parent totals after child deletion', e && e.message);
        }
      }

      await connection.commit();
      connection.release();

      // Respond differently if we performed unlink (children preserved)
      if (!force && childIds.length > 0) {
        return res.status(200).json({ success: true, message: 'Parent unlinked and deleted; children preserved' });
      }

      return res.status(200).json({ success: true, message: 'Test deleted successfully' });
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error('Error deleting test (transaction):', err);
      return res.status(500).json({ success: false, message: 'Error deleting test', error: err.message });
    }

    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting test',
      error: error.message
    });
  }
};

/**
 * Clone a test: create a new test with provided manual details and copy questions from an existing test
 */
export const cloneFacultyTest = async (req, res) => {
  const { id } = req.params; // source test id
  const facultyUserId = req.user?.id;
  const {
    title,
    subjectId: providedSubjectId,
    topicId: providedTopicId,
    duration,
    questionCount: requestedQuestionCount,
    batchId,
    startTime,
    endTime,
    status
  } = req.body;

  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const connection = await pool.getConnection();

    // Verify source test exists and belongs to faculty
    const [sourceRows] = await connection.execute('SELECT * FROM tests WHERE id = ? AND created_by = ?', [id, facultyUserId]);
    if (sourceRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Source test not found or unauthorized' });
    }
    const source = sourceRows[0];

    // Determine subject/topic for new test: prefer provided, otherwise use source's
    const subject = providedSubjectId || source.subject_id;
    const topic = providedTopicId !== undefined ? providedTopicId : source.topic_id;

    // Verify faculty has access to subject
    const [allocation] = await connection.execute(
      `SELECT sa.*, s.exam_id FROM subject_allocation sa INNER JOIN subjects s ON sa.subject_id = s.id WHERE sa.faculty_user_id = ? AND sa.subject_id = ?`,
      [facultyUserId, subject]
    );
    if (allocation.length === 0) {
      connection.release();
      return res.status(403).json({ success: false, message: 'You do not have access to this subject' });
    }

    const examId = allocation[0].exam_id || source.exam_id;

    // Determine question ids from source test
    const [qRows] = await connection.execute('SELECT question_id FROM test_questions WHERE test_id = ? ORDER BY id', [id]);
    const sourceQuestionIds = qRows.map(r => r.question_id);

    let finalQuestionCount = Math.max(1, Number(requestedQuestionCount) || sourceQuestionIds.length || 1);

    // Insert new test
    const totalMarks = finalQuestionCount * 4;
    const [insertResult] = await connection.execute(
      `INSERT INTO tests (title, exam_id, subject_id, topic_id, duration_minutes, total_marks, batch_id, start_time, end_time, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title || (`Copy of ${source.title || 'Test'}`),
        examId,
        subject,
        topic || null,
        duration || source.duration_minutes || 45,
        totalMarks,
        batchId || null,
        startTime || null,
        endTime || null,
        status || 'draft',
        facultyUserId
      ]
    );

    const newTestId = insertResult.insertId;

    // Add questions: copy as many as available up to requested count
    const toCopy = sourceQuestionIds.slice(0, finalQuestionCount);
    if (toCopy.length > 0) {
      const values = toCopy.map(qid => [newTestId, qid]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      await connection.execute(`INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders}`, values.flat());
    }

    // If more questions requested than available in source, attempt to auto-allocate from subject/topic
    if (toCopy.length < finalQuestionCount) {
      const need = finalQuestionCount - toCopy.length;
      let pickQuery = '';
      let pickParams = [];
      if (topic) {
        pickQuery = `SELECT id FROM questions WHERE topic_id = ? AND id NOT IN (${toCopy.length ? toCopy.map(()=>'?').join(',') : 'NULL'}) ORDER BY created_at DESC LIMIT ?`;
        pickParams = [topic, ...toCopy, need];
      } else {
        pickQuery = `SELECT q.id FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ? AND q.id NOT IN (${toCopy.length ? toCopy.map(()=>'?').join(',') : 'NULL'}) ORDER BY q.created_at DESC LIMIT ?`;
        pickParams = [subject, ...toCopy, need];
      }
      if (need > 0) {
        try {
          const [candidates] = await connection.execute(pickQuery, pickParams);
          if (candidates && candidates.length > 0) {
            const addValues = candidates.map(c => [newTestId, c.id]);
            const placeholders2 = addValues.map(() => '(?, ?)').join(', ');
            await connection.execute(`INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders2}`, addValues.flat());
          }
        } catch (e) {
          console.warn('Auto-allocation during clone failed:', e && e.message);
        }
      }
    }

    // Recompute and persist accurate total marks based on inserted questions (use DISTINCT to avoid duplicates)
    try {
      const [sumMarksRows] = await connection.execute(
        `SELECT COALESCE(SUM(distinct_q.marks), 0) as totalMarks FROM (
           SELECT DISTINCT q.id, q.marks
           FROM test_questions tq
           JOIN questions q ON q.id = tq.question_id
           WHERE tq.test_id = ?
         ) as distinct_q`,
        [newTestId]
      );
      const totalMarksForNewTest = (sumMarksRows && sumMarksRows[0]) ? Number(sumMarksRows[0].totalMarks || 0) : 0;
      await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarksForNewTest, newTestId]);
      connection.release();
      return res.status(201).json({ success: true, message: 'Test cloned successfully', testId: newTestId, totalMarks: totalMarksForNewTest });
    } catch (e) {
      console.warn('Failed to recompute total marks for cloned test', e && e.message);
      connection.release();
      return res.status(201).json({ success: true, message: 'Test cloned successfully', testId: newTestId });
    }
  } catch (error) {
    console.error('Error cloning test:', error);
    return res.status(500).json({ success: false, message: 'Error cloning test', error: error.message });
  }
};

/**
 * Combine a source test into per-subject child tests (faculty)
 */
export const combineFromTest = async (req, res) => {
  const { id } = req.params; // source test id
  const { copyQuestions = true } = req.body;
  const facultyUserId = req.user?.id;
  let connection;

  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    connection = await pool.getConnection();

    // Verify source test exists and belongs to this faculty
    const [testRows] = await connection.execute('SELECT * FROM tests WHERE id = ? AND created_by = ?', [id, facultyUserId]);
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Source test not found or unauthorized' });
    }
    const source = testRows[0];

    // Find distinct subjects present in the source test's questions
    const [subjects] = await connection.execute(
      `SELECT s.id as subjectId, s.name as subjectName
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       JOIN topics t ON q.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE tq.test_id = ?
       GROUP BY s.id, s.name`,
      [id]
    );

    if (subjects.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Source test has no subject-specific questions to combine' });
    }

    const created = [];
    let parentTotalMarks = 0;

    await connection.beginTransaction();

    const createdChildIds = [];
    for (const s of subjects) {
      const subjectId = s.subjectId;
      const subjectName = s.subjectName;

      // If a child for this parent+subject already exists, skip creation
      const [existing] = await connection.execute('SELECT id FROM tests WHERE parent_test_id = ? AND subject_id = ?', [id, subjectId]);
      if (existing.length > 0) {
        created.push({ subjectId, subjectName, testId: existing[0].id, existed: true });
        continue;
      }

      // Create child test - do not set topic/subtopic as per spec
      const title = source.title ? `${source.title} - ${subjectName}` : `Test - ${subjectName}`;
      const [ins] = await connection.execute(
        `INSERT INTO tests (exam_id, subject_id, all_subjects, topic_id, subtopic_id, batch_id, title, duration_minutes, total_marks, start_time, end_time, status, created_by, parent_test_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [source.exam_id, subjectId, 0, null, null, source.batch_id, title, source.duration_minutes, 0, source.start_time, source.end_time, source.status, source.created_by, id]
      );

      const newTestId = ins.insertId;
      createdChildIds.push(newTestId);

      // Ensure subject is correctly set on the created child test (defensive update)
      try {
        await connection.execute('UPDATE tests SET subject_id = ? WHERE id = ?', [Number(subjectId) || null, newTestId]);
      } catch (uErr) {
        console.warn('Failed to enforce subject_id on child test', newTestId, uErr && uErr.message);
      }

      let totalMarks = 0;

      if (copyQuestions) {
        // Copy questions belonging to this subject from source test into child test
        const [qRows] = await connection.execute(
          `SELECT q.id as questionId, q.marks as marks
           FROM test_questions tq
           JOIN questions q ON tq.question_id = q.id
           JOIN topics t ON q.topic_id = t.id
           WHERE tq.test_id = ? AND t.subject_id = ?`,
          [id, subjectId]
        );

        if (qRows.length > 0) {
          const values = qRows.map(q => [newTestId, q.questionId]);
          const placeholders = values.map(() => '(?, ?)').join(', ');
          await connection.execute(`INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders}`, values.flat());
          totalMarks = qRows.reduce((s, q) => s + (Number(q.marks || 0)), 0);

          // Update total marks for created test
          await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, newTestId]);
        }
      }

      created.push({ subjectId, subjectName, testId: newTestId, created: true, totalMarks });
    }

    // After creating children, ensure source is marked as combined and update its total_marks from children
    try {
      if (createdChildIds.length > 0) {
        const placeholders = createdChildIds.map(() => '?').join(',');
        // Compute unique question marks across created children to avoid double-counting
        const [sumRows] = await connection.execute(
          `SELECT COALESCE(SUM(distinct_q.marks), 0) as totalMarks
           FROM (
             SELECT DISTINCT q.id, q.marks
             FROM test_questions tq
             JOIN questions q ON q.id = tq.question_id
             WHERE tq.test_id IN (${placeholders})
           ) as distinct_q`,
          createdChildIds
        );
        parentTotalMarks = (sumRows && sumRows[0]) ? Number(sumRows[0].totalMarks || 0) : 0;
        await connection.execute('UPDATE tests SET all_subjects = 1, total_marks = ? WHERE id = ?', [parentTotalMarks, id]);
      }
    } catch (e) {
      console.warn('Failed to update parent totals or all_subjects flag', e && e.message);
    }

    await connection.commit();
    connection.release();

    return res.status(201).json({ success: true, created, totalMarks: parentTotalMarks });
  } catch (error) {
    if (connection) await connection.rollback();
    if (connection) connection.release();
    console.error('Error combining test (faculty):', error);
    return res.status(500).json({ success: false, message: 'Error combining test', error: error.message });
  }
};

/**
 * Create a new test by combining questions from multiple source tests
 */
export const cloneFromTests = async (req, res) => {
  const facultyUserId = req.user?.id;
  const { sourceTestIds, title, examId: providedExamId, subjectId: providedSubjectId, topicId: providedTopicId, duration, questionCount: requestedQuestionCount, batchId, startTime, endTime, status, combine } = req.body;

  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!Array.isArray(sourceTestIds) || sourceTestIds.length === 0) return res.status(400).json({ success: false, message: 'No source tests provided' });

  try {
    const connection = await pool.getConnection();

    // Verify ownership and collect source tests
    const sourcePlaceholders = sourceTestIds.map(() => '?').join(',');
    const [tests] = await connection.execute(`SELECT id, title, subject_id, topic_id, exam_id, total_marks, parent_test_id FROM tests WHERE id IN (${sourcePlaceholders}) AND created_by = ?`, [...sourceTestIds, facultyUserId]);
    if (!tests || tests.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'No valid source tests found or unauthorized' });
    }

    // Prevent combining tests that are already children of another combined test
    const alreadyChild = tests.find(t => t.parent_test_id !== undefined && t.parent_test_id !== null);
    if (combine && alreadyChild) {
      connection.release();
      return res.status(400).json({ success: false, message: 'One or more selected tests are already combined into another parent test' });
    }

    if (combine) {
      // Create a combined parent test (all_subjects = 1) and attach selected tests as children
      await connection.beginTransaction();
      try {
        // Use provided duration/batch/start/end/status or fallback to first test values
        const parentDuration = duration || tests[0].duration_minutes || tests[0].duration || 45;
        const parentStatus = status || 'draft';
        const parentTitle = title || `Combined Test - ${new Date().toLocaleString()}`;

        const parentExam = providedExamId || tests[0].exam_id || null;
        const [ins] = await connection.execute(
          `INSERT INTO tests (title, exam_id, subject_id, topic_id, subtopic_id, all_subjects, duration_minutes, total_marks, batch_id, start_time, end_time, status, created_by, parent_test_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW())`,
          [parentTitle, parentExam, null, null, null, 1, parentDuration, 0, batchId || null, startTime || null, endTime || null, parentStatus, facultyUserId]
        );
        const parentTestId = ins.insertId;

        // Attach children to parent
        const updatePlaceholders = sourceTestIds.map(() => '?').join(',');
        await connection.execute(`UPDATE tests SET parent_test_id = ?, all_subjects = 0 WHERE id IN (${updatePlaceholders})`, [parentTestId, ...sourceTestIds]);

        // Compute totals for parent from unique questions across children (avoid double-counting duplicates)
        try {
          const [sumRows] = await connection.execute(
            `SELECT COALESCE(SUM(distinct_q.marks), 0) as totalMarks, COUNT(*) as questionCount
             FROM (
               SELECT DISTINCT q.id, q.marks
               FROM test_questions tq
               JOIN questions q ON q.id = tq.question_id
               WHERE tq.test_id IN (${updatePlaceholders})
             ) as distinct_q`,
            [...sourceTestIds]
          );
          const totalMarks = (sumRows && sumRows[0]) ? Number(sumRows[0].totalMarks || 0) : 0;
          await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, parentTestId]);
        } catch (e) {
          console.warn('Failed to compute parent totals from child unique questions', e && e.message);
        }

        await connection.commit();
        connection.release();
        return res.status(201).json({ success: true, message: 'Combined parent test created', testId: parentTestId });
      } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error creating combined parent test:', err);
        return res.status(500).json({ success: false, message: 'Error creating combined parent test', error: err.message });
      }
    }

    // end combine branch

    // Collect question IDs from source tests in order
    const [qRows] = await connection.execute(`SELECT DISTINCT tq.question_id FROM test_questions tq WHERE tq.test_id IN (${sourcePlaceholders}) ORDER BY FIELD(tq.test_id, ${sourcePlaceholders}), tq.id`, [...sourceTestIds, ...sourceTestIds]);
    const sourceQuestionIds = qRows.map(r => r.question_id);

    // dedupe preserving order
    const uniqueQuestionIds = Array.from(new Set(sourceQuestionIds));

    const finalQuestionCount = Math.max(1, Number(requestedQuestionCount) || uniqueQuestionIds.length || 1);
    const totalMarks = finalQuestionCount * 4;

    // Determine exam id from allocation
    const examId = allocation[0].exam_id || tests[0].exam_id;

    // Insert new test
    const [insertResult] = await connection.execute(`INSERT INTO tests (title, exam_id, subject_id, topic_id, duration_minutes, total_marks, batch_id, start_time, end_time, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [title || `Combined Test - ${new Date().toLocaleString()}`, examId, subject, topic || null, duration || 45, totalMarks, batchId || null, startTime || null, endTime || null, status || 'draft', facultyUserId]);
    const newTestId = insertResult.insertId;

    // Insert questions up to requested count
    const toInsert = uniqueQuestionIds.slice(0, finalQuestionCount);
    if (toInsert.length > 0) {
      const values = toInsert.map(qid => [newTestId, qid]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      await connection.execute(`INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders}`, values.flat());
    }

    // If not enough, auto-allocate additional questions from subject/topic
    if (toInsert.length < finalQuestionCount) {
      const need = finalQuestionCount - toInsert.length;
      let pickQuery = '';
      let pickParams = [];
      if (topic) {
        pickQuery = `SELECT id FROM questions WHERE topic_id = ? AND id NOT IN (${toInsert.length ? toInsert.map(()=>'?').join(',') : 'NULL'}) ORDER BY created_at DESC LIMIT ?`;
        pickParams = [topic, ...toInsert, need];
      } else {
        pickQuery = `SELECT q.id FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ? AND q.id NOT IN (${toInsert.length ? toInsert.map(()=>'?').join(',') : 'NULL'}) ORDER BY q.created_at DESC LIMIT ?`;
        pickParams = [subject, ...toInsert, need];
      }
      try {
        const [candidates] = await connection.execute(pickQuery, pickParams);
        if (candidates && candidates.length > 0) {
          const addValues = candidates.map(c => [newTestId, c.id]);
          const placeholders2 = addValues.map(() => '(?, ?)').join(', ');
          await connection.execute(`INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders2}`, addValues.flat());
        }
      } catch (e) {
        console.warn('Auto-allocation during combined clone failed:', e && e.message);
      }
    }

    // Recompute and store accurate total marks based on inserted questions
    try {
      const [sumMarksRows] = await connection.execute(
        `SELECT COALESCE(SUM(q.marks), 0) as totalMarks FROM test_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.test_id = ?`,
        [newTestId]
      );
      const totalMarksForNewTest = (sumMarksRows && sumMarksRows[0]) ? Number(sumMarksRows[0].totalMarks || 0) : 0;
      await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarksForNewTest, newTestId]);

      connection.release();
      return res.status(201).json({ success: true, message: 'Combined test created', testId: newTestId, totalMarks: totalMarksForNewTest });
    } catch (e) {
      // If recompute failed, still return success but warn in logs
      console.warn('Failed to compute total marks after creating combined test', e && e.message);
      connection.release();
      return res.status(201).json({ success: true, message: 'Combined test created', testId: newTestId });
    }
  } catch (error) {
    console.error('Error creating combined test:', error);
    return res.status(500).json({ success: false, message: 'Error creating combined test', error: error.message });
  }
};

/**
 * Recompute & persist parent totals from unique child questions (useful to correct existing parents)
 */
export const recomputeParentTotals = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM tests WHERE id = ? AND created_by = ?', [id, facultyUserId]);
    if (!rows || rows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found or unauthorized' });
    }
    const test = rows[0];
    if (!test.all_subjects) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Not a combined parent test' });
    }

    // Sum unique question marks across children
    try {
      const [sumRows] = await connection.execute(
        `SELECT COALESCE(SUM(distinct_q.marks), 0) as totalMarks, COUNT(*) as questionCount
         FROM (
           SELECT DISTINCT q.id, q.marks
           FROM test_questions tq
           JOIN questions q ON q.id = tq.question_id
           JOIN tests ch ON tq.test_id = ch.id
           WHERE ch.parent_test_id = ?
         ) as distinct_q`,
        [id]
      );
      const totalMarks = (sumRows && sumRows[0]) ? Number(sumRows[0].totalMarks || 0) : 0;
      const questionCount = (sumRows && sumRows[0]) ? Number(sumRows[0].questionCount || 0) : 0;
      await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, id]);
      connection.release();
      return res.status(200).json({ success: true, message: 'Recomputed parent totals', totalMarks, questionCount });
    } catch (e) {
      connection.release();
      console.error('Failed to recompute parent totals:', e && e.message);
      return res.status(500).json({ success: false, message: 'Failed to recompute parent totals', error: e && e.message });
    }
  } catch (error) {
    console.error('Error in recomputeParentTotals:', error);
    return res.status(500).json({ success: false, message: 'Error recomputing parent totals', error: error.message });
  }
};


/**
 * Uncombine (dissolve) a combined parent test: unlink children and delete parent
 */
export const uncombineTest = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;
  const force = req.query.force === 'true';

  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const connection = await pool.getConnection();

    // Verify test exists and is a parent combined test
    const [rows] = await connection.execute('SELECT * FROM tests WHERE id = ? AND created_by = ?', [id, facultyUserId]);
    if (!rows || rows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found or unauthorized' });
    }
    const test = rows[0];
    if (!test.all_subjects || test.parent_test_id !== null) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Not a combined parent test' });
    }

    // Check for existing student attempts on parent
    const [[attemptCountRow]] = await connection.execute('SELECT COUNT(*) as cnt FROM student_test_attempts WHERE test_id = ?', [id]);
    const attemptCount = attemptCountRow && attemptCountRow.cnt ? Number(attemptCountRow.cnt) : 0;
    if (attemptCount > 0 && !force) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot delete test with existing student attempts', attempts: attemptCount });
    }

    await connection.beginTransaction();
    try {
      // Unlink children
      await connection.execute('UPDATE tests SET parent_test_id = NULL WHERE parent_test_id = ?', [id]);
      // Optionally delete parent test
      // If there are attempts and force=true, remove attempt mappings
      if (attemptCount > 0 && force) {
        await connection.execute(
          `DELETE staq FROM student_test_attempt_questions staq
           JOIN student_test_attempts sta ON staq.attempt_id = sta.id
           WHERE sta.test_id = ?`,
          [id]
        );
        await connection.execute('DELETE FROM student_test_attempts WHERE test_id = ?', [id]);
      }
      await connection.execute('DELETE FROM tests WHERE id = ?', [id]);

      await connection.commit();
      connection.release();
      return res.status(200).json({ success: true, message: 'Uncombined successfully' });
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error('Failed to uncombine test:', err);
      return res.status(500).json({ success: false, message: 'Failed to uncombine test', error: err.message });
    }
  } catch (error) {
    console.error('Error in uncombineTest:', error);
    return res.status(500).json({ success: false, message: 'Error uncombining test', error: error.message });
  }
};

/**
 * Get allocated subjects for faculty
 */
export const getAggregatedTestQuestions = async (req, res) => {
  const facultyUserId = req.user?.id;
  const { id } = req.params;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();
    // verify test exists and belongs to faculty (or is a combined parent created by them)
    const [tRows] = await connection.execute('SELECT id, created_by, all_subjects FROM tests WHERE id = ?', [id]);
    if (!tRows || tRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    const t = tRows[0];
    if (String(t.created_by) !== String(facultyUserId) && Number(t.all_subjects || 0) !== 1) {
      // allow faculty to aggregate their own tests or combined parents
      connection.release();
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // If it's a combined parent, gather unique questions across children
    if (Number(t.all_subjects || 0) === 1) {
      const [qRows] = await connection.execute(
        `SELECT DISTINCT q.id as id, q.marks as marks
         FROM test_questions tq
         JOIN questions q ON q.id = tq.question_id
         JOIN tests ch ON tq.test_id = ch.id
         WHERE ch.parent_test_id = ?`,
        [id]
      );
      const questions = qRows.map(r => ({ id: r.id, marks: Number(r.marks || 0) }));
      const totalQuestions = questions.length;
      const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
      connection.release();
      return res.status(200).json({ success: true, questions, totalQuestions, totalMarks });
    }

    // Otherwise gather questions from the test itself
    const [qRows] = await connection.execute(
      `SELECT q.id as id, q.marks as marks
       FROM test_questions tq
       JOIN questions q ON q.id = tq.question_id
       WHERE tq.test_id = ?`,
      [id]
    );
    const questions = qRows.map(r => ({ id: r.id, marks: Number(r.marks || 0) }));
    const totalQuestions = questions.length;
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
    connection.release();
    return res.status(200).json({ success: true, questions, totalQuestions, totalMarks });
  } catch (err) {
    console.error('Error aggregating test questions:', err);
    return res.status(500).json({ success: false, message: 'Failed to aggregate test questions', error: err.message });
  }
};

export const getAllocatedSubjects = async (req, res) => {
  const facultyUserId = req.user?.id;
  const { examId } = req.query;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    let query = `
      SELECT DISTINCT
        s.id,
        s.name as subjectName,
        s.exam_id as examId,
        e.name as examType
      FROM subject_allocation sa
      JOIN subjects s ON sa.subject_id = s.id
      JOIN exams e ON s.exam_id = e.id
      WHERE sa.faculty_user_id = ?
    `;

    const params = [facultyUserId];

    if (examId) {
      query += ' AND s.exam_id = ?';
      params.push(examId);
    }

    query += ' ORDER BY e.name, s.name';

    const [rows] = await connection.execute(query, params);
    connection.release();

    return res.status(200).json({
      success: true,
      subjects: rows
    });
  } catch (error) {
    console.error('Error fetching allocated subjects:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
};

/**
 * Get topics for a subject (or all topics for faculty's subjects)
 */
export const getTopicsForSubject = async (req, res) => {
  const { subjectId } = req.query;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    if (subjectId) {
      // Verify faculty has access to this subject
      const [allocation] = await connection.execute(
        `SELECT * FROM subject_allocation 
         WHERE faculty_user_id = ? AND subject_id = ?`,
        [facultyUserId, subjectId]
      );

      if (allocation.length === 0) {
        connection.release();
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this subject'
        });
      }

      // Get topics for specific subject
      const [rows] = await connection.execute(
        `SELECT 
          id,
          topic_name as name,
          subject_id as subjectId
         FROM topics
         WHERE subject_id = ?
         ORDER BY topic_name`,
        [subjectId]
      );

      connection.release();

      return res.status(200).json({
        success: true,
        topics: rows
      });
    } else {
      // Get all topics for faculty's allocated subjects
      const [rows] = await connection.execute(
        `SELECT DISTINCT
          t.id,
          t.topic_name as name,
          t.subject_id as subjectId
         FROM topics t
         INNER JOIN subject_allocation sa ON t.subject_id = sa.subject_id
         WHERE sa.faculty_user_id = ?
         ORDER BY t.topic_name`,
        [facultyUserId]
      );

      connection.release();

      return res.status(200).json({
        success: true,
        topics: rows
      });
    }
  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching topics',
      error: error.message
    });
  }
};

/**
 * Ensure a test has at least one question; if none, auto-allocate one
 */
export const ensureMinQuestions = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership and get subject/topic
    const [tests] = await connection.execute('SELECT id, subject_id, topic_id FROM tests WHERE id = ? AND created_by = ?', [id, facultyUserId]);
    if (!tests || tests.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found or unauthorized' });
    }

    const test = tests[0];

    // Count existing questions
    const [countRows] = await connection.execute('SELECT COUNT(*) as cnt FROM test_questions WHERE test_id = ?', [id]);
    const existing = countRows && countRows[0] ? Number(countRows[0].cnt) : 0;

    if (existing > 0) {
      connection.release();
      return res.status(200).json({ success: true, addedCount: 0, message: 'Test already has questions' });
    }

    // Find one candidate question for this topic or subject
    let pickQuery, pickParams;
    if (test.topic_id) {
      pickQuery = 'SELECT id FROM questions WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1';
      pickParams = [test.topic_id];
    } else {
      pickQuery = 'SELECT q.id FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ? ORDER BY q.created_at DESC LIMIT 1';
      pickParams = [test.subject_id];
    }

    const [candidates] = await connection.execute(pickQuery, pickParams);
    if (!candidates || candidates.length === 0) {
      connection.release();
      return res.status(200).json({ success: true, addedCount: 0, message: 'No available questions to allocate' });
    }

    const qid = candidates[0].id;
    await connection.execute('INSERT IGNORE INTO test_questions (test_id, question_id) VALUES (?, ?)', [id, qid]);

    connection.release();
    return res.status(200).json({ success: true, addedCount: 1, message: 'Allocated 1 question to test' });
  } catch (error) {
    console.error('Error ensuring min questions for test:', error);
    return res.status(500).json({ success: false, message: 'Error ensuring min questions', error: error.message });
  }
};

/**
 * Ensure all tests for the current faculty have at least one question
 */
export const ensureMinForAllTests = async (req, res) => {
  const facultyUserId = req.user?.id;
  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();
    const [tests] = await connection.execute('SELECT id, subject_id, topic_id FROM tests WHERE created_by = ?', [facultyUserId]);
    let totalAdded = 0;

    for (const test of tests) {
      const [countRows] = await connection.execute('SELECT COUNT(*) as cnt FROM test_questions WHERE test_id = ?', [test.id]);
      const existing = countRows && countRows[0] ? Number(countRows[0].cnt) : 0;
      if (existing > 0) continue;

      // pick a candidate
      let pickQuery, pickParams;
      if (test.topic_id) {
        pickQuery = 'SELECT id FROM questions WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1';
        pickParams = [test.topic_id];
      } else {
        pickQuery = 'SELECT q.id FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ? ORDER BY q.created_at DESC LIMIT 1';
        pickParams = [test.subject_id];
      }

      const [candidates] = await connection.execute(pickQuery, pickParams);
      if (candidates && candidates.length > 0) {
        await connection.execute('INSERT IGNORE INTO test_questions (test_id, question_id) VALUES (?, ?)', [test.id, candidates[0].id]);
        totalAdded += 1;
      }
    }

    connection.release();
    return res.status(200).json({ success: true, totalAdded, message: `Added ${totalAdded} questions to tests` });
  } catch (error) {
    console.error('Error ensuring min for all tests:', error);
    return res.status(500).json({ success: false, message: 'Error ensuring min for all tests', error: error.message });
  }
};

/**
 * Get available questions for test creation
 */
export const getAvailableQuestions = async (req, res) => {
  const { subjectId, topicId, examId, search, limit = 100 } = req.query;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    let query = `
      SELECT 
        q.id,
        q.question_text as text,
        q.marks,
        t.topic_name as topicName,
        s.name as subjectName
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (topicId) {
      query += ' AND q.topic_id = ?';
      params.push(topicId);
    } else if (subjectId) {
      query += ' AND t.subject_id = ?';
      params.push(subjectId);
    } else if (examId) {
      query += ' AND s.exam_id = ?';
      params.push(examId);
    }

    if (search) {
      query += ' AND q.question_text LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY q.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await connection.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE 1=1
    `;
    const countParams = [];

    if (topicId) {
      countQuery += ' AND q.topic_id = ?';
      countParams.push(topicId);
    } else if (subjectId) {
      countQuery += ' AND t.subject_id = ?';
      countParams.push(subjectId);
    } else if (examId) {
      countQuery += ' AND s.exam_id = ?';
      countParams.push(examId);
    }

    if (search) {
      countQuery += ' AND q.question_text LIKE ?';
      countParams.push(`%${search}%`);
    }

    const [countRows] = await connection.execute(countQuery, countParams);

    connection.release();

    return res.status(200).json({
      success: true,
      questions: rows,
      total: countRows[0].total
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

/**
 * Add questions to test
 */
export const addQuestionsToTest = async (req, res) => {
  const { id } = req.params;
  const { questionIds } = req.body;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'questionIds array is required'
    });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT * FROM tests WHERE id = ? AND created_by = ?`,
      [id, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Add questions
    const values = questionIds.map(qId => [id, qId]);
    const placeholders = values.map(() => '(?, ?)').join(', ');

    await connection.execute(
      `INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders}`,
      values.flat()
    );

    connection.release();

    return res.status(200).json({
      success: true,
      message: `${questionIds.length} questions added to test`
    });
  } catch (error) {
    console.error('Error adding questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding questions',
      error: error.message
    });
  }
};

/**
 * Get test questions
 */
export const getTestQuestions = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT * FROM tests WHERE id = ? AND created_by = ?`,
      [id, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Get questions
    const [rows] = await connection.execute(
      `SELECT 
        q.id,
        q.question_text as text,
        q.marks,
        t.topic_name as topicName,
        s.name as subjectName
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE tq.test_id = ?
      ORDER BY tq.id`,
      [id]
    );

    connection.release();

    return res.status(200).json({
      success: true,
      questions: rows
    });
  } catch (error) {
    console.error('Error fetching test questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

/**
 * Remove question from test
 */
export const removeQuestionFromTest = async (req, res) => {
  const { testId, questionId } = req.params;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT * FROM tests WHERE id = ? AND created_by = ?`,
      [testId, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Remove question
    await connection.execute(
      `DELETE FROM test_questions WHERE test_id = ? AND question_id = ?`,
      [testId, questionId]
    );

    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Question removed from test'
    });
  } catch (error) {
    console.error('Error removing question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing question',
      error: error.message
    });
  }
};

/**
 * Get test report with statistics
 */
export const getFacultyTestReport = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT 
        t.*,
        e.name as examType,
        s.name as subjectName,
        top.topic_name as topicName
      FROM tests t
      JOIN exams e ON t.exam_id = e.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN topics top ON t.topic_id = top.id
      WHERE t.id = ? AND t.created_by = ?`,
      [id, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    const [statsRows] = await connection.execute(
      `SELECT
         COUNT(*) as totalAttempts,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedStudents,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgressStudents,
         AVG(CASE WHEN status = 'completed' THEN score END) as averageScore,
         MAX(CASE WHEN status = 'completed' THEN score END) as highestScore,
         MIN(CASE WHEN status = 'completed' THEN score END) as lowestScore,
         AVG(CASE WHEN status = 'completed' THEN time_taken END) as averageTimeTaken
       FROM student_test_attempts
       WHERE test_id = ?`,
      [id]
    );

    const stats = statsRows[0] || {};

    // Top performers (limit 5)
    const [topRows] = await connection.execute(
      `SELECT u.id as studentId, u.name as studentName, u.userid as rollNo, sta.score, sta.time_taken as timeTaken,
        (sta.score / ? * 100) as percentage
       FROM student_test_attempts sta
       JOIN users u ON sta.student_id = u.id
       WHERE sta.test_id = ? AND sta.status = 'completed'
       ORDER BY sta.score DESC, sta.time_taken ASC
       LIMIT 5`,
      [test[0].total_marks, id]
    );

    // Score distribution buckets (percent ranges)
    const [distribution] = await connection.execute(
      `SELECT
         CASE
           WHEN (score / ? * 100) >= 90 THEN '90-100%'
           WHEN (score / ? * 100) >= 80 THEN '80-89%'
           WHEN (score / ? * 100) >= 70 THEN '70-79%'
           WHEN (score / ? * 100) >= 60 THEN '60-69%'
           ELSE 'Below 60%'
         END as scoreRange,
         COUNT(*) as count
       FROM student_test_attempts
       WHERE test_id = ? AND status = 'completed'
       GROUP BY scoreRange
       ORDER BY scoreRange DESC`,
      [test[0].total_marks, test[0].total_marks, test[0].total_marks, test[0].total_marks, id]
    );

    // Full student attempts list (all attempts with student info)
    const [attempts] = await connection.execute(
      `SELECT u.id as studentId, u.name as studentName, u.userid as rollNo, sta.status, sta.score, sta.time_taken as timeTaken, sta.started_at, sta.completed_at
       FROM student_test_attempts sta
       JOIN users u ON sta.student_id = u.id
       WHERE sta.test_id = ?
       ORDER BY sta.status DESC, sta.score DESC, sta.completed_at ASC`,
      [id]
    );

    connection.release();

    // compute pass rate (completed students with >= 50% of total marks)
    const completedCount = Number(stats.completedStudents || 0);
    let passCount = 0;
    if (completedCount > 0) {
      // compute passCount directly
      const conn2 = await pool.getConnection();
      try {
        const [passRows] = await conn2.execute(
          `SELECT COUNT(*) as passCount FROM student_test_attempts WHERE test_id = ? AND status = 'completed' AND (score / ? * 100) >= ?`,
          [id, test[0].total_marks, 50]
        );
        passCount = (passRows && passRows[0] && passRows[0].passCount) ? Number(passRows[0].passCount) : 0;
      } catch (err) {
        console.warn('passCount query failed', err);
      } finally {
        conn2.release();
      }
    }

    const passRate = completedCount > 0 ? Math.round((passCount / completedCount) * 100) : 0;

    const completionRate = Number(stats.totalAttempts || 0) > 0 ? Math.round((completedCount / Number(stats.totalAttempts || 0)) * 100) : 0;

    const statistics = {
      totalAttempts: Number(stats.totalAttempts || 0),
      averageScore: Math.round(Number(stats.averageScore || 0) * 100) / 100,
      highestScore: Number(stats.highestScore || 0),
      lowestScore: Number(stats.lowestScore || 0),
      passRate,
      averageTimeTaken: Math.round(Number(stats.averageTimeTaken || 0)),
      completionRate
    };

    const topPerformers = topRows.map((p, idx) => ({
      rank: idx + 1,
      name: p.studentName,
      rollNo: p.rollNo,
      score: Number(p.score || 0),
      percentage: Math.round(Number(p.percentage || 0) * 10) / 10,
      timeTaken: Number(p.timeTaken || 0)
    }));

    const scoreDistribution = distribution.map(d => ({
      range: d.scoreRange,
      count: d.count,
      percentage: Math.round((d.count / (completedCount || 1)) * 100 * 10) / 10
    }));

    // difficulty breakdown - server doesn't track per-question difficulty in schema -> return empty/derived values
    const difficultyBreakdown = [
      { level: 'Easy', count: 0, avgAccuracy: 0 },
      { level: 'Medium', count: 0, avgAccuracy: 0 },
      { level: 'Hard', count: 0, avgAccuracy: 0 }
    ];

    // Build attempts list for detailed view
    const attemptsList = attempts.map(a => ({
      studentId: a.studentId,
      name: a.studentName,
      rollNo: a.rollNo,
      status: a.status,
      score: Number(a.score || 0),
      percentage: Math.round(((Number(a.score || 0) / Number(test[0].total_marks || 1)) * 100) * 10) / 10,
      timeTaken: Number(a.timeTaken || 0),
      startedAt: a.started_at,
      completedAt: a.completed_at
    }));

    return res.status(200).json({
      success: true,
      test: {
        title: test[0].title || `${test[0].subjectName}${test[0].topicName ? ' - ' + test[0].topicName : ''}`,
        id: test[0].id,
        subjectName: test[0].subjectName,
        topicName: test[0].topicName,
        examType: test[0].examType,
        difficulty: 'medium',
        questionCount: test[0].questionCount || 0,
        suggestedDuration: test[0].duration_minutes,
        notes: test[0].notes || '',
        submittedAt: test[0].created_at
      },
      statistics,
      topPerformers,
      difficultyBreakdown,
      scoreDistribution,
      attempts: attemptsList
    });
  } catch (error) {
    console.error('Error fetching test report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
};

/**
 * Get all exams
 */
export const getExamsForFaculty = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, name FROM exams ORDER BY name`
    );
    connection.release();

    return res.status(200).json({
      success: true,
      exams: rows
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching exams',
      error: error.message
    });
  }
};

/**
 * Send report PDFs to students who attended the test
 */
export const sendReportEmails = async (req, res) => {
  const { id } = req.params;
  const facultyUserId = req.user?.id;
  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [testRows] = await connection.execute(
      `SELECT t.*, s.name as subjectName, top.topic_name as topicName
       FROM tests t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN topics top ON t.topic_id = top.id
       WHERE t.id = ? AND t.created_by = ?`,
      [id, facultyUserId]
    );

    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found or unauthorized' });
    }

    const test = testRows[0];

    // Get attempts for students who attended (in_progress or completed)
    const [students] = await connection.execute(
      `SELECT sta.id as attemptId, sta.student_id, sta.status, sta.score, sta.time_taken, u.email, u.name, u.userid
       FROM student_test_attempts sta
       JOIN users u ON sta.student_id = u.id
       WHERE sta.test_id = ? AND sta.status IN ('completed','in_progress')`,
      [id]
    );

    if (!students || students.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'No attending students found to send reports' });
    }

    const results = [];

    for (const stu of students) {
      // fetch answers for the attempt
      const [answers] = await connection.execute(
        `SELECT q.id as question_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation, sa.selected_option, sa.is_correct, sa.time_taken
         FROM student_answers sa
         JOIN questions q ON sa.question_id = q.id
         WHERE sa.attempt_id = ?`,
        [stu.attemptId]
      );

      // If a student has no answers (in_progress with none), prepare empty list of questions by selecting test question list
      let questions = answers;
      if (!questions || questions.length === 0) {
        const [testQuestions] = await connection.execute(
          `SELECT q.id as question_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation
           FROM test_questions tq
           JOIN questions q ON tq.question_id = q.id
           WHERE tq.test_id = ?`,
          [id]
        );
        questions = testQuestions.map(q => ({ ...q, selected_option: null }));
      }

      try {
        const buffer = await generateStudentReportPdf(test, { name: stu.name, rollNo: stu.userid }, questions);

        const subject = `Test Report: ${test.title || 'Test'}`;
        const html = `<p>Dear ${stu.name},</p><p>Please find attached your test report for <strong>${test.title}</strong>.</p>`;

        await emailSender.sendMail({
          to: stu.email,
          subject,
          html,
          attachments: [
            { filename: `${test.title || 'test'}-${stu.name || stu.userid}.pdf`, content: buffer }
          ]
        });

        // log email
        await connection.execute(
          `INSERT INTO email_logs (user_id, email, subject, status) VALUES (?, ?, ?, ?)`,
          [stu.student_id, stu.email, subject, 'sent']
        );

        results.push({ studentId: stu.student_id, email: stu.email, status: 'sent' });
      } catch (err) {
        console.error('Failed to send report to', stu.email, err);
        // If the error is due to invalid sender configuration, surface a helpful error to the caller and abort, as retries won't help
        if (err && ((err.code && (err.code === 'SMTP_NOT_ACTIVATED' || err.code === 'GMAIL_AUTH_ERROR' || err.code === 'GMAIL_NOT_CONFIGURED' || err.code === 'GMAIL_INSUFFICIENT_SCOPES')) || (err.message && (err.message.includes('Invalid SMTP sender') || (err.message.includes('SMTP account not activated') || (err.message.includes('sender') && err.message.includes('not valid'))))))) {
          // release connection and return explicit error
          connection.release();
          // If activation issue, return 502 with actionable message
          if (err.code === 'SMTP_NOT_ACTIVATED' || (err.message && err.message.includes('SMTP account not activated'))) {
            return res.status(502).json({ success: false, message: 'SMTP account is not activated. Please contact Sendinblue/Brevo at contact@sendinblue.com to request activation.', error: err.message });
          }
          if (err.code === 'GMAIL_AUTH_ERROR' || (err.message && err.message.includes('GMAIL_AUTH_ERROR'))) {
            return res.status(502).json({ success: false, message: 'Gmail authorization failed. Ensure `credentials.json` and `token.json` are present and valid. Re-run the OAuth flow if required.', error: err.message });
          }
          if (err.code === 'GMAIL_INSUFFICIENT_SCOPES') {
            return res.status(502).json({ success: false, message: 'Gmail token lacks required scopes. Re-run the OAuth helper (`node scripts/gmail-oauth.js`) and grant the gmail.send scope.', error: err.message });
          }
          if (err.code === 'GMAIL_NOT_CONFIGURED') {
            return res.status(502).json({ success: false, message: 'Gmail is not configured. Place `credentials.json` and `token.json` in the server directory, or configure SMTP (set SMTP_USER and SMTP_PASS).', error: err.message });
          }
          return res.status(400).json({ success: false, message: 'SMTP sender invalid: please set SMTP_FROM to a verified sender email or authenticate your domain in Brevo', error: err.message });
        }
        await connection.execute(
          `INSERT INTO email_logs (user_id, email, subject, status) VALUES (?, ?, ?, ?)`,
          [stu.student_id, stu.email, `Test Report: ${test.title || 'Test'}`, 'failed']
        );
        results.push({ studentId: stu.student_id, email: stu.email, status: 'failed', error: err.message });
      }
    }

    connection.release();

    return res.status(200).json({ success: true, message: 'Reports queued/sent', results });
  } catch (error) {
    console.error('Error sending reports:', error);
    return res.status(500).json({ success: false, message: 'Failed to send reports', error: error.message });
  }
};

/**
 * (Test helper) Send single report PDF to a specified email address (faculty-only)
 * Body: { to: string }
 */
export const sendReportToRecipient = async (req, res) => {
  const { id } = req.params;
  const { to } = req.body || {};
  const facultyUserId = req.user?.id;
  if (!facultyUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!to) return res.status(400).json({ success: false, message: 'Recipient email required in request body as { to }' });

  try {
    const connection = await pool.getConnection();
    const [testRows] = await connection.execute(`SELECT t.*, s.name as subjectName, top.topic_name as topicName FROM tests t LEFT JOIN subjects s ON t.subject_id = s.id LEFT JOIN topics top ON t.topic_id = top.id WHERE t.id = ? AND t.created_by = ?`, [id, facultyUserId]);
    if (testRows.length === 0) { connection.release(); return res.status(404).json({ success: false, message: 'Test not found or unauthorized' }); }
    const test = testRows[0];

    // fetch test questions
    const [testQuestions] = await connection.execute(`SELECT q.id as question_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ?`, [id]);

    const buffer = await generateStudentReportPdf(test, { name: to, rollNo: '' }, testQuestions.map(q => ({ ...q, selected_option: null })));
    const subject = `Test Report: ${test.title || 'Test'}`;
    const html = `<p>Dear user,</p><p>Please find attached the test report for <strong>${test.title}</strong>.</p>`;

    try {
      await emailSender.sendMail({ to, subject, html, attachments: [{ filename: `${test.title || 'test'}-report.pdf`, content: buffer }] });
      await connection.execute(`INSERT INTO email_logs (user_id, email, subject, status) VALUES (?, ?, ?, ?)`, [null, to, subject, 'sent']);
      connection.release();
      return res.status(200).json({ success: true, message: 'Report sent', to });
    } catch (err) {
      connection.release();
      console.error('Send to recipient failed', err);
      if (err && ((err.code && (err.code === 'SMTP_NOT_ACTIVATED' || err.code === 'GMAIL_AUTH_ERROR' || err.code === 'GMAIL_NOT_CONFIGURED' || err.code === 'GMAIL_INSUFFICIENT_SCOPES')) || (err.message && (err.message.includes('Invalid SMTP sender') || err.message.includes('SMTP account not activated') || err.message.includes('GMAIL_AUTH_ERROR'))))) {
        if (err.code === 'SMTP_NOT_ACTIVATED' || (err.message && err.message.includes('SMTP account not activated'))) {
          return res.status(502).json({ success: false, message: 'SMTP account is not activated. Please contact Sendinblue/Brevo at contact@sendinblue.com to request activation.', error: err.message });
        }
        if (err.code === 'GMAIL_AUTH_ERROR' || (err.message && err.message.includes('GMAIL_AUTH_ERROR'))) {
          return res.status(502).json({ success: false, message: 'Gmail authorization failed. Ensure `credentials.json` and `token.json` are present and valid. Re-run the OAuth flow if required.', error: err.message });
        }
        if (err.code === 'GMAIL_INSUFFICIENT_SCOPES') {
          return res.status(502).json({ success: false, message: 'Gmail token lacks required scopes. Re-run the OAuth helper (`node scripts/gmail-oauth.js`) and grant the gmail.send scope.', error: err.message });
        }
        if (err.code === 'GMAIL_NOT_CONFIGURED') {
          return res.status(502).json({ success: false, message: 'Gmail is not configured. Place `credentials.json` and `token.json` in the server directory, or configure SMTP (set SMTP_USER and SMTP_PASS).', error: err.message });
        }
        return res.status(400).json({ success: false, message: 'SMTP sender invalid: please set SMTP_FROM to a verified sender email or authenticate your domain in Brevo', error: err.message });
      }
      return res.status(500).json({ success: false, message: 'Failed to send report', error: err.message });
    }
  } catch (error) {
    console.error('Error in sendReportToRecipient:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Get batches for an exam (or all batches)
 */
export const getBatchesForExam = async (req, res) => {
  const { examId, active } = req.query;

  try {
    const connection = await pool.getConnection();

    let query = `
      SELECT 
        b.id,
        b.batch_name as name,
        b.exam_id as examId,
        e.name as examType
      FROM batches b
      LEFT JOIN exams e ON b.exam_id = e.id
      WHERE 1=1
    `;

    const params = [];

    if (examId) {
      query += ' AND b.exam_id = ?';
      params.push(examId);
    }
    if (active !== undefined) {
      // Database uses tinyint(1): 1 = active, 0 = inactive
      query += ' AND b.status = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    query += ' ORDER BY e.name, b.batch_name';

    const [rows] = await connection.execute(query, params);
    connection.release();

    return res.status(200).json({
      success: true,
      batches: rows
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching batches',
      error: error.message
    });
  }
};

/**
 * Auto-allocate questions to test based on topic/subject
 */
export const autoAllocateQuestions = async (req, res) => {
  const { id } = req.params;
  const { numQuestions } = req.body;
  const { topicId, subjectId } = req.query;
  const facultyUserId = req.user?.id;

  if (!facultyUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!numQuestions || numQuestions <= 0) {
    return res.status(400).json({
      success: false,
      message: 'numQuestions is required and must be greater than 0'
    });
  }

  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [test] = await connection.execute(
      `SELECT * FROM tests WHERE id = ? AND created_by = ?`,
      [id, facultyUserId]
    );

    if (test.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // Get available questions
    let query = `
      SELECT q.id
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?)
    `;

    const params = [id];

    if (topicId) {
      query += ' AND q.topic_id = ?';
      params.push(topicId);
    } else if (subjectId) {
      query += ' AND t.subject_id = ?';
      params.push(subjectId);
    }

    query += ' ORDER BY RAND() LIMIT ?';
    params.push(parseInt(numQuestions));

    const [questions] = await connection.execute(query, params);

    if (questions.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'No available questions found'
      });
    }

    // Add questions to test
    const values = questions.map(q => [id, q.id]);
    const placeholders = values.map(() => '(?, ?)').join(', ');

    await connection.execute(
      `INSERT IGNORE INTO test_questions (test_id, question_id) VALUES ${placeholders}`,
      values.flat()
    );

    connection.release();

    return res.status(200).json({
      success: true,
      message: `${questions.length} questions allocated to test`,
      addedCount: questions.length
    });
  } catch (error) {
    console.error('Error auto-allocating questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error allocating questions',
      error: error.message
    });
  }
};
