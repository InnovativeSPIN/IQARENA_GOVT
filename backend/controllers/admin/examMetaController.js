import pool from '../../config/db.js';

// List all exams (including those without subjects)
export const listAllocatedExams = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT e.id, e.name
       FROM exams e
       ORDER BY e.id`
    );
    connection.release();
    return res.status(200).json({ success: true, exams: rows });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return res.status(500).json({ success: false, message: 'Error fetching exams', error: error.message });
  }
};

export const listAllocatedSubjects = async (req, res) => {
  const { examId } = req.query;
  if (!examId) {
    return res.status(400).json({ success: false, message: 'examId is required' });
  }
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT s.id, s.name
       FROM subjects s
       WHERE s.exam_id = ? AND s.status = 1
       ORDER BY s.id`,
      [examId]
    );
    connection.release();
    return res.status(200).json({ success: true, subjects: rows });
  } catch (error) {
    console.error('Error fetching allocated subjects:', error);
    return res.status(500).json({ success: false, message: 'Error fetching allocated subjects', error: error.message });
  }
};

export const listAllocatedTopics = async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) {
    return res.status(400).json({ success: false, message: 'subjectId is required' });
  }
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT t.id, t.topic_name AS name
       FROM topics t
       WHERE t.subject_id = ?
       ORDER BY t.id`,
      [subjectId]
    );
    connection.release();
    return res.status(200).json({ success: true, topics: rows });
  } catch (error) {
    console.error('Error fetching allocated topics:', error);
    return res.status(500).json({ success: false, message: 'Error fetching allocated topics', error: error.message });
  }
};

export const countQuestions = async (req, res) => {
  const { examId, subjectId, topicId, subtopicId } = req.query;

  try {
    const connection = await pool.getConnection();
    let sql = '';
    const params = [];

    // Prefer most-specific filter available
    if (subtopicId) {
      sql = 'SELECT COUNT(*) as count FROM questions q WHERE q.subtopic_id = ?';
      params.push(subtopicId);
    } else if (topicId) {
      sql = 'SELECT COUNT(*) as count FROM questions q WHERE q.topic_id = ?';
      params.push(topicId);
    } else if (subjectId) {
      // questions link to topics which link to subjects
      sql = 'SELECT COUNT(*) as count FROM questions q JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ?';
      params.push(subjectId);
    } else if (examId) {
      // examId can be either an exam name (string) or numeric id
      if (/^\d+$/.test(String(examId))) {
        // numeric id -> count questions by joining exam name via exams table
        sql = 'SELECT COUNT(*) as count FROM questions q JOIN exams e ON q.exam_type = e.name WHERE e.id = ?';
        params.push(examId);
      } else {
        // string name -> direct match
        sql = 'SELECT COUNT(*) as count FROM questions q WHERE q.exam_type = ?';
        params.push(examId);
      }
    } else {
      // no scope provided
      connection.release();
      return res.status(400).json({ success: false, message: 'At least one of examId, subjectId, topicId or subtopicId is required' });
    }

    const [rows] = await connection.execute(sql, params);
    connection.release();
    const count = rows && rows[0] && (rows[0].count || rows[0]['COUNT(*)'] || 0);
    return res.status(200).json({ success: true, count: Number(count) });
  } catch (error) {
    console.error('Error counting questions:', error);
    return res.status(500).json({ success: false, message: 'Error counting questions', error: error.message });
  }
};

// Create a new exam (admin)
export const createExam = async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Exam name is required' });
  }
  const examName = String(name).trim().toUpperCase().slice(0, 100);

  try {
    const connection = await pool.getConnection();

    // Check uniqueness (case-insensitive)
    const [existing] = await connection.execute('SELECT id FROM exams WHERE LOWER(name) = LOWER(?)', [examName]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Exam with this name already exists' });
    }

    const [result] = await connection.execute('INSERT INTO exams (name) VALUES (?)', [examName]);
    const insertedId = result.insertId;
    const [rows] = await connection.execute('SELECT id, name FROM exams WHERE id = ?', [insertedId]);
    connection.release();

    return res.status(201).json({ success: true, message: 'Exam created successfully', exam: rows[0] });
  } catch (error) {
    console.error('Error creating exam:', error);
    // Helpful message if DB enum prevents insertion
    const msg = (error && (error.errno === 1265 || /Data truncated for column/.test(error.message) || /Incorrect.*value/.test(error.message)))
      ? 'Exam creation failed because the database column type restricts allowed values. Run ALTER TABLE to change exams.name to VARCHAR to allow new exam types.'
      : 'Error creating exam';
    const statusCode = (error && (error.errno === 1265 || /Data truncated for column/.test(error.message) || /Incorrect.*value/.test(error.message))) ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: msg, error: error.message });
  }
};

// Delete an exam (admin) - supports ?force=true
export const deleteExam = async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true' || req.query.force === true;

  if (!id) return res.status(400).json({ success: false, message: 'Exam id is required' });

  let connection;
  try {
    connection = await pool.getConnection();

    const [exRows] = await connection.execute('SELECT id, name FROM exams WHERE id = ?', [id]);
    if (exRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    const exam = exRows[0];
    const examName = exam.name;

    // Check existing dependencies
    const [subCountRows] = await connection.execute('SELECT COUNT(*) as count FROM subjects WHERE exam_id = ?', [id]);
    const [testCountRows] = await connection.execute('SELECT COUNT(*) as count FROM tests WHERE exam_id = ?', [id]);
    const [paperCountRows] = await connection.execute('SELECT COUNT(*) as count FROM offline_papers WHERE exam_id = ?', [id]);
    const [qCountRows] = await connection.execute('SELECT COUNT(*) as count FROM questions WHERE exam_type = ?', [examName]);
    const [batchCountRows] = await connection.execute('SELECT COUNT(*) as count FROM batches WHERE exam_id = ?', [id]);

    const subjectCount = subCountRows[0]?.count || 0;
    const testCount = testCountRows[0]?.count || 0;
    const paperCount = paperCountRows[0]?.count || 0;
    const questionCount = qCountRows[0]?.count || 0;
    const batchCount = batchCountRows[0]?.count || 0;

    const hasDependencies = subjectCount > 0 || testCount > 0 || paperCount > 0 || questionCount > 0 || batchCount > 0;

    if (!force && hasDependencies) {
      connection.release();
      const reasons = [];
      if (subjectCount > 0) reasons.push(`${subjectCount} subject(s)`);
      if (questionCount > 0) reasons.push(`${questionCount} question(s)`);
      if (testCount > 0) reasons.push(`${testCount} test(s)`);
      if (paperCount > 0) reasons.push(`${paperCount} offline paper(s)`);
      if (batchCount > 0) reasons.push(`${batchCount} batch(es)`);
      return res.status(400).json({
        success: false,
        requiresForce: true,
        message: `Cannot delete exam: associated with ${reasons.join(', ')}. Use force delete to remove all associated records.`
      });
    }

    await connection.beginTransaction();

    // 1. Gather all subjects belonging to this exam
    const [subjects] = await connection.execute('SELECT id FROM subjects WHERE exam_id = ?', [id]);
    const subjectIds = subjects.map(s => s.id);

    // 2. Gather topics and subtopics for these subjects
    let topicIds = [];
    let subtopicIds = [];
    if (subjectIds.length > 0) {
      const sPlaceholders = subjectIds.map(() => '?').join(',');
      const [topics] = await connection.execute(
        `SELECT id FROM topics WHERE subject_id IN (${sPlaceholders})`,
        subjectIds
      );
      topicIds = topics.map(t => t.id);

      if (topicIds.length > 0) {
        const tPlaceholders = topicIds.map(() => '?').join(',');
        const [subtopics] = await connection.execute(
          `SELECT id FROM subtopics WHERE topic_id IN (${tPlaceholders})`,
          topicIds
        );
        subtopicIds = subtopics.map(st => st.id);
      }
    }

    // 3. Gather all questions linked by subtopic, topic, or exam_type
    const questionIdSet = new Set();
    if (subtopicIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < subtopicIds.length; i += chunkSize) {
        const chunk = subtopicIds.slice(i, i + chunkSize);
        const [qRows] = await connection.execute(
          `SELECT id FROM questions WHERE subtopic_id IN (${chunk.map(() => '?').join(',')})`,
          chunk
        );
        qRows.forEach(q => questionIdSet.add(q.id));
      }
    }
    if (topicIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < topicIds.length; i += chunkSize) {
        const chunk = topicIds.slice(i, i + chunkSize);
        const [qRows] = await connection.execute(
          `SELECT id FROM questions WHERE topic_id IN (${chunk.map(() => '?').join(',')})`,
          chunk
        );
        qRows.forEach(q => questionIdSet.add(q.id));
      }
    }
    // Also questions with exam_type matching examName
    const [qByExam] = await connection.execute('SELECT id FROM questions WHERE exam_type = ?', [examName]);
    qByExam.forEach(q => questionIdSet.add(q.id));

    const questionIds = Array.from(questionIdSet);

    // 4. Cascade delete questions & all their references
    if (questionIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < questionIds.length; i += chunkSize) {
        const chunk = questionIds.slice(i, i + chunkSize);
        const qPlaceholders = chunk.map(() => '?').join(',');

        await connection.execute(`DELETE FROM test_questions WHERE question_id IN (${qPlaceholders})`, chunk);
        await connection.execute(`DELETE FROM offline_paper_questions WHERE question_id IN (${qPlaceholders})`, chunk);
        await connection.execute(`DELETE FROM student_test_attempt_questions WHERE question_id IN (${qPlaceholders})`, chunk);
        await connection.execute(`DELETE FROM student_answers WHERE question_id IN (${qPlaceholders})`, chunk);
        await connection.execute(`DELETE FROM questions WHERE id IN (${qPlaceholders})`, chunk);
      }
    }

    // 5. Unlink subtopics and topics from tests & offline_papers
    if (subtopicIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < subtopicIds.length; i += chunkSize) {
        const chunk = subtopicIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        await connection.execute(`UPDATE tests SET subtopic_id = NULL WHERE subtopic_id IN (${placeholders})`, chunk);
        await connection.execute(`UPDATE offline_papers SET subtopic_id = NULL WHERE subtopic_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM subtopics WHERE id IN (${placeholders})`, chunk);
      }
    }

    if (topicIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < topicIds.length; i += chunkSize) {
        const chunk = topicIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        await connection.execute(`UPDATE tests SET topic_id = NULL WHERE topic_id IN (${placeholders})`, chunk);
        await connection.execute(`UPDATE offline_papers SET topic_id = NULL WHERE topic_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM topics WHERE id IN (${placeholders})`, chunk);
      }
    }

    // 6. Delete subject allocations and subjects
    if (subjectIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < subjectIds.length; i += chunkSize) {
        const chunk = subjectIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        await connection.execute(`UPDATE tests SET subject_id = NULL WHERE subject_id IN (${placeholders})`, chunk);
        await connection.execute(`UPDATE offline_papers SET subject_id = NULL WHERE subject_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM subject_allocation WHERE subject_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM subjects WHERE id IN (${placeholders})`, chunk);
      }
    }

    // 7. Delete tests for this exam
    const [tests] = await connection.execute('SELECT id FROM tests WHERE exam_id = ?', [id]);
    const testIds = tests.map(t => t.id);
    if (testIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < testIds.length; i += chunkSize) {
        const chunk = testIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');

        // Find attempts for these tests
        const [attempts] = await connection.execute(`SELECT id FROM student_test_attempts WHERE test_id IN (${placeholders})`, chunk);
        const attemptIds = attempts.map(a => a.id);
        if (attemptIds.length > 0) {
          for (let j = 0; j < attemptIds.length; j += chunkSize) {
            const attChunk = attemptIds.slice(j, j + chunkSize);
            const attPlaceholders = attChunk.map(() => '?').join(',');
            await connection.execute(`DELETE FROM student_answers WHERE attempt_id IN (${attPlaceholders})`, attChunk);
            await connection.execute(`DELETE FROM student_test_attempt_questions WHERE attempt_id IN (${attPlaceholders})`, attChunk);
            await connection.execute(`DELETE FROM student_test_attempts WHERE id IN (${attPlaceholders})`, attChunk);
          }
        }

        await connection.execute(`DELETE FROM test_assignments WHERE test_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM school_test_assignments WHERE test_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM test_questions WHERE test_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM tests WHERE parent_test_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM tests WHERE id IN (${placeholders})`, chunk);
      }
    }

    // 8. Delete offline_papers for this exam
    const [offlinePapers] = await connection.execute('SELECT id FROM offline_papers WHERE exam_id = ?', [id]);
    const paperIds = offlinePapers.map(p => p.id);
    if (paperIds.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < paperIds.length; i += chunkSize) {
        const chunk = paperIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        await connection.execute(`DELETE FROM offline_paper_questions WHERE paper_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM offline_papers WHERE parent_paper_id IN (${placeholders})`, chunk);
        await connection.execute(`DELETE FROM offline_papers WHERE id IN (${placeholders})`, chunk);
      }
    }

    // 9. Clean up batches for this exam
    const [batches] = await connection.execute('SELECT id FROM batches WHERE exam_id = ?', [id]);
    const batchIds = batches.map(b => b.id);
    if (batchIds.length > 0) {
      const placeholders = batchIds.map(() => '?').join(',');
      await connection.execute(`UPDATE students SET batch_id = NULL WHERE batch_id IN (${placeholders})`, batchIds);
      await connection.execute(`DELETE FROM batches WHERE id IN (${placeholders})`, batchIds);
    }

    // 10. Clean up students and school_students
    await connection.execute('UPDATE school_students SET exam_id = NULL WHERE exam_id = ?', [id]);
    try {
      await connection.execute('UPDATE students SET exam_id = NULL WHERE exam_id = ?', [id]);
    } catch (_) {
      await connection.execute('DELETE FROM students WHERE exam_id = ?', [id]).catch(() => {});
    }

    // 11. Clean up ebooks
    await connection.execute('UPDATE ebooks SET exam_name = NULL WHERE exam_name = ?', [examName]).catch(() => {});

    // 12. Finally delete the exam
    await connection.execute('DELETE FROM exams WHERE id = ?', [id]);

    await connection.commit();
    connection.release();

    return res.status(200).json({ success: true, message: 'Exam and all associated data deleted successfully' });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
      connection.release();
    }
    console.error('Error deleting exam:', error);
    return res.status(500).json({ success: false, message: 'Error deleting exam', error: error.message });
  }
};

// Classes are listed only for the chosen schools: ?schoolIds=2,4
export const listStandards = async (req, res) => {
  const { examId, schoolIds } = req.query;
  const ids = String(schoolIds || '').split(',').map(Number).filter(Boolean);
  if (ids.length === 0) {
    return res.status(200).json({ success: true, standards: [] });
  }
  try {
    const connection = await pool.getConnection();
    const params = [...ids];
    let where = `WHERE status = 1 AND standard IS NOT NULL AND standard <> '' AND school_id IN (${ids.map(() => '?').join(',')})`;
    if (examId) {
      where += ' AND (exam_id = ? OR exam_id IS NULL)';
      params.push(examId);
    }
    const [rows] = await connection.execute(
      `SELECT standard, COUNT(*) AS studentCount FROM school_students ${where} GROUP BY standard ORDER BY standard`,
      params
    );
    connection.release();
    return res.status(200).json({ success: true, standards: rows });
  } catch (error) {
    console.error('Error fetching standards:', error);
    return res.status(500).json({ success: false, message: 'Error fetching standards', error: error.message });
  }
};
