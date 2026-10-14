import pool from '../../config/db.js';

const topicSelectSql = `
  SELECT t.id,
         t.topic_name AS name,
         COALESCE(t.description, '') AS description,
         t.subject_id AS subjectId,
         s.name AS subjectName
  FROM topics t
  JOIN subjects s ON s.id = t.subject_id
`;

export const listTopics = async (req, res) => {
  const { subjectId, search } = req.query;
  try {
    const connection = await pool.getConnection();
    const clauses = [];
    const params = [];

    if (subjectId) {
      clauses.push('t.subject_id = ?');
      params.push(subjectId);
    }

    if (search) {
      clauses.push('(LOWER(t.topic_name) LIKE ? OR LOWER(t.description) LIKE ?)');
      const term = `%${String(search).toLowerCase()}%`;
      params.push(term, term);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await connection.execute(`${topicSelectSql} ${whereClause} ORDER BY t.id DESC`, params);
    connection.release();
    return res.status(200).json({ success: true, topics: rows });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({ success: false, message: 'Error fetching topics', error: error.message });
  }
};

export const createTopic = async (req, res) => {
  const { subjectId, name, description } = req.body;
  if (!subjectId || !name) {
    return res.status(400).json({ success: false, message: 'subjectId and name are required' });
  }

  try {
    const connection = await pool.getConnection();
    const [subjectRows] = await connection.execute('SELECT id, name FROM subjects WHERE id = ?', [subjectId]);
    if (subjectRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const [dupe] = await connection.execute(
      'SELECT id FROM topics WHERE subject_id = ? AND LOWER(topic_name) = LOWER(?)',
      [subjectId, name]
    );
    if (dupe.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Topic already exists for this subject' });
    }

    const [result] = await connection.execute(
      'INSERT INTO topics (subject_id, topic_name, description) VALUES (?, ?, ?)',
      [subjectId, name, description || null]
    );

    const [rows] = await connection.execute(`${topicSelectSql} WHERE t.id = ?`, [result.insertId]);
    connection.release();
    return res.status(201).json({ success: true, topic: rows[0] });
  } catch (error) {
    console.error('Error creating topic:', error);
    return res.status(500).json({ success: false, message: 'Error creating topic', error: error.message });
  }
};

export const updateTopic = async (req, res) => {
  const { id } = req.params;
  const { subjectId, name, description } = req.body;

  if (!subjectId && !name && description === undefined) {
    return res.status(400).json({ success: false, message: 'No updates provided' });
  }

  try {
    const connection = await pool.getConnection();
    const [existingRows] = await connection.execute('SELECT id, subject_id, topic_name AS name, description FROM topics WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    const existing = existingRows[0];
    let targetSubjectId = subjectId || existing.subject_id;

    if (subjectId && String(subjectId) !== String(existing.subject_id)) {
      const [subjectRows] = await connection.execute('SELECT id FROM subjects WHERE id = ?', [subjectId]);
      if (subjectRows.length === 0) {
        connection.release();
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }
      targetSubjectId = subjectId;
    }

    if (name && name !== existing.name) {
      const [dupe] = await connection.execute(
        'SELECT id FROM topics WHERE subject_id = ? AND LOWER(topic_name) = LOWER(?) AND id != ?',
        [targetSubjectId, name, id]
      );
      if (dupe.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Another topic with this name already exists for the selected subject' });
      }
    }

    const nextName = name ?? existing.name;
    const nextDescription = description !== undefined ? description : existing.description;

    await connection.execute(
      'UPDATE topics SET subject_id = ?, topic_name = ?, description = ? WHERE id = ?',
      [targetSubjectId, nextName, nextDescription, id]
    );

    const [rows] = await connection.execute(`${topicSelectSql} WHERE t.id = ?`, [id]);
    connection.release();
    return res.status(200).json({ success: true, topic: rows[0] });
  } catch (error) {
    console.error('Error updating topic:', error);
    return res.status(500).json({ success: false, message: 'Error updating topic', error: error.message });
  }
};

export const deleteTopic = async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true' || req.query.force === '1';
  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM topics WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    // If not forcing, prevent deletion when questions exist under topic
    const [questionRows] = await connection.execute('SELECT id FROM questions WHERE topic_id = ? LIMIT 1', [id]);
    const [subtopicRows] = await connection.execute('SELECT id FROM subtopics WHERE topic_id = ?', [id]);
    if (!force) {
      if (questionRows.length > 0 || subtopicRows.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Topic has linked subtopics or questions. Use ?force=true to delete topic and all dependent data.' });
      }
    }

    // If force delete requested, perform cascading deletes in a transaction
    if (force) {
      await connection.beginTransaction();
      try {
        // Collect subtopic ids
        const [subs] = await connection.execute('SELECT id FROM subtopics WHERE topic_id = ?', [id]);
        const subIds = subs.map(s => s.id);

        // Collect question ids under topic or its subtopics
        let qRows = [];
        if (subIds.length > 0) {
          const subPlaceholders = subIds.map(() => '?').join(',');
          const [qr] = await connection.execute(
            `SELECT id FROM questions WHERE topic_id = ? OR subtopic_id IN (${subPlaceholders})`,
            [id, ...subIds]
          );
          qRows = qr;
        } else {
          const [qr] = await connection.execute('SELECT id FROM questions WHERE topic_id = ?', [id]);
          qRows = qr;
        }
        const qIds = qRows.map(q => q.id);

        // Helper to run delete in batches of 500
        const deleteBatch = async (table, column, ids) => {
          for (let i = 0; i < ids.length; i += 500) {
            const batch = ids.slice(i, i + 500);
            const placeholders = batch.map(() => '?').join(',');
            await connection.execute(`DELETE FROM ${table} WHERE ${column} IN (${placeholders})`, batch);
          }
        };

        // Helper to run update null in batches of 500
        const updateNullBatch = async (table, column, ids) => {
          for (let i = 0; i < ids.length; i += 500) {
            const batch = ids.slice(i, i + 500);
            const placeholders = batch.map(() => '?').join(',');
            await connection.execute(`UPDATE ${table} SET ${column} = NULL WHERE ${column} IN (${placeholders})`, batch);
          }
        };

        // Delete all dependent rows referencing these questions
        if (qIds.length > 0) {
          await deleteBatch('test_questions', 'question_id', qIds);
          await deleteBatch('offline_paper_questions', 'question_id', qIds);
          await deleteBatch('student_test_attempt_questions', 'question_id', qIds);
          await deleteBatch('student_answers', 'question_id', qIds);
          await deleteBatch('questions', 'id', qIds);
        }

        // Unlink and delete subtopics
        if (subIds.length > 0) {
          await updateNullBatch('tests', 'subtopic_id', subIds);
          await updateNullBatch('offline_papers', 'subtopic_id', subIds);
          await deleteBatch('subtopics', 'id', subIds);
        }

        // Unlink topic from tests and offline_papers before deleting topic
        await connection.execute('UPDATE tests SET topic_id = NULL WHERE topic_id = ?', [id]);
        await connection.execute('UPDATE offline_papers SET topic_id = NULL WHERE topic_id = ?', [id]);

        // Finally delete topic
        await connection.execute('DELETE FROM topics WHERE id = ?', [id]);

        await connection.commit();
        connection.release();
        return res.status(200).json({
          success: true,
          message: 'Topic and dependent subtopics/questions deleted successfully',
          deleted: { topicId: id, subtopicCount: subIds.length, questionCount: qIds.length }
        });
      } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error during forced topic delete:', err);
        return res.status(500).json({ success: false, message: 'Failed to force delete topic', error: err.message });
      }
    }

    // Default safe delete (no dependencies)
    await connection.execute('DELETE FROM topics WHERE id = ?', [id]);
    connection.release();
    return res.status(200).json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return res.status(500).json({ success: false, message: 'Error deleting topic', error: error.message });
  }
};

export default {
  listTopics,
  createTopic,
  updateTopic,
  deleteTopic,
};
