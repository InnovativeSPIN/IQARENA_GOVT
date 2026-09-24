import pool from '../../config/db.js';

const subtopicSelectSql = `
  SELECT st.id,
         st.subtopic_name AS name,
         COALESCE(st.description, '') AS description,
         st.topic_id AS topicId,
         t.topic_name AS topicName
  FROM subtopics st
  JOIN topics t ON t.id = st.topic_id
`;

export const listSubtopics = async (req, res) => {
  const { topicId, search } = req.query;
  try {
    const connection = await pool.getConnection();
    const clauses = [];
    const params = [];

    if (topicId) {
      clauses.push('st.topic_id = ?');
      params.push(topicId);
    }

    if (search) {
      clauses.push('(LOWER(st.subtopic_name) LIKE ? OR LOWER(st.description) LIKE ?)');
      const term = `%${String(search).toLowerCase()}%`;
      params.push(term, term);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await connection.execute(`${subtopicSelectSql} ${whereClause} ORDER BY st.id DESC`, params);
    connection.release();
    return res.status(200).json({ success: true, subtopics: rows });
  } catch (error) {
    console.error('Error fetching subtopics:', error);
    return res.status(500).json({ success: false, message: 'Error fetching subtopics', error: error.message });
  }
};

export const createSubtopic = async (req, res) => {
  const { topicId, name, description } = req.body;
  if (!topicId || !name) {
    return res.status(400).json({ success: false, message: 'topicId and name are required' });
  }

  try {
    const connection = await pool.getConnection();
    const [topicRows] = await connection.execute('SELECT id, topic_name FROM topics WHERE id = ?', [topicId]);
    if (topicRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Parent topic not found' });
    }

    const [dupe] = await connection.execute(
      'SELECT id FROM subtopics WHERE topic_id = ? AND LOWER(subtopic_name) = LOWER(?)',
      [topicId, name]
    );
    if (dupe.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Subtopic already exists for this topic' });
    }

    const [result] = await connection.execute(
      'INSERT INTO subtopics (topic_id, subtopic_name, description) VALUES (?, ?, ?)',
      [topicId, name, description || null]
    );

    const [rows] = await connection.execute(`${subtopicSelectSql} WHERE st.id = ?`, [result.insertId]);
    connection.release();
    return res.status(201).json({ success: true, subtopic: rows[0] });
  } catch (error) {
    console.error('Error creating subtopic:', error);
    return res.status(500).json({ success: false, message: 'Error creating subtopic', error: error.message });
  }
};

export const updateSubtopic = async (req, res) => {
  const { id } = req.params;
  const { topicId, name, description } = req.body;

  if (!topicId && !name && description === undefined) {
    return res.status(400).json({ success: false, message: 'No updates provided' });
  }

  try {
    const connection = await pool.getConnection();
    const [existingRows] = await connection.execute('SELECT id, topic_id, subtopic_name AS name, description FROM subtopics WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Subtopic not found' });
    }

    const existing = existingRows[0];
    let targetTopicId = topicId || existing.topic_id;

    if (topicId && String(topicId) !== String(existing.topic_id)) {
      const [topicRows] = await connection.execute('SELECT id FROM topics WHERE id = ?', [topicId]);
      if (topicRows.length === 0) {
        connection.release();
        return res.status(404).json({ success: false, message: 'Parent topic not found' });
      }
      targetTopicId = topicId;
    }

    if (name && name !== existing.name) {
      const [dupe] = await connection.execute(
        'SELECT id FROM subtopics WHERE topic_id = ? AND LOWER(subtopic_name) = LOWER(?) AND id != ?',
        [targetTopicId, name, id]
      );
      if (dupe.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Another subtopic with this name already exists for the selected topic' });
      }
    }

    const nextName = name ?? existing.name;
    const nextDescription = description !== undefined ? description : existing.description;

    await connection.execute(
      'UPDATE subtopics SET topic_id = ?, subtopic_name = ?, description = ? WHERE id = ?',
      [targetTopicId, nextName, nextDescription, id]
    );

    const [rows] = await connection.execute(`${subtopicSelectSql} WHERE st.id = ?`, [id]);
    connection.release();
    return res.status(200).json({ success: true, subtopic: rows[0] });
  } catch (error) {
    console.error('Error updating subtopic:', error);
    return res.status(500).json({ success: false, message: 'Error updating subtopic', error: error.message });
  }
};

export const deleteSubtopic = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM subtopics WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Subtopic not found' });
    }
    await connection.execute('DELETE FROM subtopics WHERE id = ?', [id]);
    connection.release();
    return res.status(200).json({ success: true, message: 'Subtopic deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtopic:', error);
    return res.status(500).json({ success: false, message: 'Error deleting subtopic', error: error.message });
  }
};

export default {
  listSubtopics,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
};
