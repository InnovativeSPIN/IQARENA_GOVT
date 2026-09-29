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

// Delete an exam (admin)
export const deleteExam = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Exam id is required' });

  try {
    const connection = await pool.getConnection();
    const [exRows] = await connection.execute('SELECT id, name FROM exams WHERE id = ?', [id]);
    if (exRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    const exam = exRows[0];

    // Prevent deletion if subjects exist
    const [subCountRows] = await connection.execute('SELECT COUNT(*) as count FROM subjects WHERE exam_id = ?', [id]);
    if (subCountRows[0].count > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot delete exam: subjects are associated with this exam' });
    }

    // Prevent deletion if questions reference this exam name
    const [qCountRows] = await connection.execute('SELECT COUNT(*) as count FROM questions WHERE exam_type = ?', [exam.name]);
    if (qCountRows[0].count > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot delete exam: questions reference this exam' });
    }

    await connection.execute('DELETE FROM exams WHERE id = ?', [id]);
    connection.release();

    return res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
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
