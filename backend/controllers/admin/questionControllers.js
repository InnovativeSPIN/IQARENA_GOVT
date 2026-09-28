import pool from '../../config/db.js';

export const getQuestions = async (req, res) => {
  const { examId, subjectId, topicId, subtopicId, search } = req.query;

  try {
    const connection = await pool.getConnection();
    let query = `SELECT q.*, t.topic_name, s.name as subjectName, s.id as subject_id, e.name as examType, e.id as exam_id,
      qi.question_img, qi.option_a as img_option_a, qi.option_b as img_option_b, 
      qi.option_c as img_option_c, qi.option_d as img_option_d, qi.explanation as img_explanation,
      u.name as created_by_user_name,
      st.id as subtopic_id, st.subtopic_name as subtopicName
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subtopics st ON q.subtopic_id = st.id
      JOIN subjects s ON t.subject_id = s.id
      JOIN exams e ON s.exam_id = e.id
      LEFT JOIN question_images qi ON q.use_img = qi.id
      LEFT JOIN users u ON q.created_by_user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (topicId) { 
      query += ' AND t.id = ?'; 
      params.push(topicId); 
      console.log('Filtering by topicId:', topicId);
    }
    if (req.query.subtopicId) {
      query += ' AND q.subtopic_id = ?';
      params.push(req.query.subtopicId);
      console.log('Filtering by subtopicId:', req.query.subtopicId);
    }
    else if (subjectId) { 
      query += ' AND s.id = ?'; 
      params.push(subjectId); 
      console.log('Filtering by subjectId:', subjectId);
    }
    else if (examId) { 
      query += ' AND e.id = ?'; 
      params.push(examId); 
      console.log('Filtering by examId:', examId);
    }
    if (search) {
      query += ` AND (
        q.question_text LIKE ? OR 
        q.option_a LIKE ? OR 
        q.option_b LIKE ? OR 
        q.option_c LIKE ? OR 
        q.option_d LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    query += ' ORDER BY q.created_at DESC';
    const [rows] = await connection.execute(query, params);
    
    // Helper to add /uploads/ prefix if filename exists
    const formatImageUrl = (filename) => {
      if (!filename) return null;
      // If already has /uploads/, return as is
      if (filename.startsWith('/uploads/') || filename.startsWith('http')) return filename;
      // Add /uploads/ prefix
      return `/uploads/${filename}`;
    };
    
    // Map results: return both text and images (if available) per-field so mixed text/image options are supported
    const mappedRows = rows.map(r => {
      // Determine created by: admin, user name, or system
      let createdBy = 'System';
      if (r.created_by_admin === 1) {
        createdBy = 'Admin';
      } else if (r.created_by_user_id && r.created_by_user_name) {
        createdBy = r.created_by_user_name;
      }

      return {
        id: r.id,
        text: r.question_text, // Always return question text
        textTa: r.question_ta,
        questionText: r.question_text, // Also include questionText for compatibility
        // Return each image field individually if present
        questionImage: r.question_img ? formatImageUrl(r.question_img) : null,
        optionA: r.option_a, // Always return option text (may be empty)
        optionATa: r.option_a_ta,
        optionAImage: r.img_option_a ? formatImageUrl(r.img_option_a) : null,
        optionB: r.option_b,
        optionBTa: r.option_b_ta,
        optionBImage: r.img_option_b ? formatImageUrl(r.img_option_b) : null,
        optionC: r.option_c,
        optionCTa: r.option_c_ta,
        optionCImage: r.img_option_c ? formatImageUrl(r.img_option_c) : null,
        optionD: r.option_d,
        optionDTa: r.option_d_ta,
        optionDImage: r.img_option_d ? formatImageUrl(r.img_option_d) : null,
        correctAnswer: r.answer,
        answer: r.answer, // Include both for compatibility
        explanation: r.explanation, // Always return text explanation
        explanationImage: r.img_explanation ? formatImageUrl(r.img_explanation) : null,
        marks: r.marks,
        status: 'active', // Default status
        createdBy: createdBy,
        createdByAdmin: r.created_by_admin,
        createdByUserId: r.created_by_user_id,
        createdAt: r.created_at,
        topicId: r.topic_id,
        topicName: r.topic_name,
        subjectId: r.subject_id,
        subjectName: r.subjectName,
        subtopicId: r.subtopic_id || null,
        subtopicName: r.subtopicName || null,
        examId: r.exam_id,
        examType: r.examType,
        useImg: r.use_img
      };
    });
    connection.release();
    
    console.log(`Returning ${mappedRows.length} questions`);
    if (mappedRows.length > 0) {
      console.log('Sample question:', {
        id: mappedRows[0].id,
        topicId: mappedRows[0].topicId,
        topicName: mappedRows[0].topicName,
        questionText: mappedRows[0].questionText?.substring(0, 50)
      });
    }
    
    return res.status(200).json({
      success: true,
      questions: mappedRows,
      total: mappedRows.length
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

export const getQuestionById = async (req, res) => {
  const { id } = req.params;
  
  // Helper to add /uploads/ prefix if filename exists
  const formatImageUrl = (filename) => {
    if (!filename) return null;
    // If already has /uploads/, return as is
    if (filename.startsWith('/uploads/') || filename.startsWith('http')) return filename;
    // Add /uploads/ prefix
    return `/uploads/${filename}`;
  };
  
  try {
    const connection = await pool.getConnection();
    // Get question with all details by ID, including image options if use_img is set, also join users table
    const [rows] = await connection.execute(`
      SELECT q.*, t.topic_name, s.name as subjectName, e.name as examType, 
      st.id as subtopic_id, st.subtopic_name as subtopic_name,
      qi.question_img, qi.option_a as img_option_a, qi.option_b as img_option_b, 
      qi.option_c as img_option_c, qi.option_d as img_option_d, qi.explanation as img_explanation,
      u.name as created_by_user_name
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subtopics st ON q.subtopic_id = st.id
      JOIN subjects s ON t.subject_id = s.id
      JOIN exams e ON s.exam_id = e.id
      LEFT JOIN question_images qi ON q.use_img = qi.id
      LEFT JOIN users u ON q.created_by_user_id = u.id
      WHERE q.id = ?
    `, [id]);
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    const r = rows[0];

    // Determine created by: admin, user name, or system
    let createdBy = 'System';
    if (r.created_by_admin === 1) {
      createdBy = 'Admin';
    } else if (r.created_by_user_id && r.created_by_user_name) {
      createdBy = r.created_by_user_name;
    }

    const question = {
      id: r.id,
      text: r.question_text, // Always return question text
      textTa: r.question_ta,
      // Return image fields individually so mixed image/text options work
      questionImage: r.question_img ? formatImageUrl(r.question_img) : null,
      optionA: r.option_a, // Always return option text (may be empty)
      optionATa: r.option_a_ta,
      optionAImage: r.img_option_a ? formatImageUrl(r.img_option_a) : null,
      optionB: r.option_b,
      optionBTa: r.option_b_ta,
      optionBImage: r.img_option_b ? formatImageUrl(r.img_option_b) : null,
      optionC: r.option_c,
      optionCTa: r.option_c_ta,
      optionCImage: r.img_option_c ? formatImageUrl(r.img_option_c) : null,
      optionD: r.option_d,
      optionDTa: r.option_d_ta,
      optionDImage: r.img_option_d ? formatImageUrl(r.img_option_d) : null,
      correctAnswer: r.answer,
      explanation: r.explanation, // Always return text explanation
      explanationImage: r.img_explanation ? formatImageUrl(r.img_explanation) : null,
      marks: r.marks,
      createdBy: createdBy, // Properly formatted creator name
      createdByAdmin: r.created_by_admin,
      createdByUserId: r.created_by_user_id,
      createdAt: r.created_at,
      topicId: r.topic_id,
      topicName: r.topic_name,
      subtopicId: r.subtopic_id || null,
      subtopicName: r.subtopic_name || null,
      subjectName: r.subjectName,
      examType: r.examType,
      useImg: r.use_img
    };

    return res.status(200).json({
      success: true,
      question
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching question',
      error: error.message
    });
  }
};

// Get tests containing a specific question
export const getTestsForQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT t.id, t.title, t.description, t.start_time, t.end_time FROM tests t JOIN test_questions tq ON t.id = tq.test_id WHERE tq.question_id = ? ORDER BY t.created_at DESC`,
      [id]
    );
    connection.release();

    return res.status(200).json({ success: true, tests: rows });
  } catch (error) {
    console.error('Error fetching tests for question:', error);
    return res.status(500).json({ success: false, message: 'Error fetching tests for question', error: error.message });
  }
};

// Create new question (with image table support)
export const createQuestion = async (req, res) => {
  // Debug logging
  console.log('=== CREATE QUESTION CONTROLLER ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body is empty?', Object.keys(req.body || {}).length === 0);
  console.log('Raw body:', req.body);
  
  const {
    topicId,
    subtopicId,
    questionText,
    questionImage,
    optionA,
    optionAImage,
    optionB,
    optionBImage,
    optionC,
    optionCImage,
    optionD,
    optionDImage,
    correctAnswer,
    explanation,
    explanationImage,
    marks,
    useImageMode // boolean: true if using image table
  } = req.body;
  
  console.log('Destructured topicId:', topicId, 'Type:', typeof topicId);
  console.log('Destructured questionText:', questionText);
  
  // Validate required fields
  if (!topicId) {
    console.error('Validation failed: topicId is missing or falsy');
    return res.status(400).json({
      success: false,
      message: 'Topic ID is required'
    });
  }

  // If subtopicId provided, validate it belongs to the topic
  
  if (!questionText || questionText.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Question text is required'
    });
  }
  
  if (!correctAnswer) {
    return res.status(400).json({
      success: false,
      message: 'Correct answer is required'
    });
  }
  
  // Helper function to extract filename from URL path
  const extractFilename = (url) => {
    if (!url) return null;
    // If it's already just a filename, return it
    if (!url.includes('/')) return url;
    // Extract filename from path like "/uploads/image-123.jpg" -> "image-123.jpg"
    const parts = url.split('/');
    return parts[parts.length - 1];
  };
  
  try {
    const connection = await pool.getConnection();
    // If subtopicId provided, validate it belongs to the topic (now that we have a DB connection)
    if (subtopicId) {
      const [subRows] = await connection.execute('SELECT id, topic_id FROM subtopics WHERE id = ?', [subtopicId]);
      if (subRows.length === 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Invalid subtopic ID' });
      }
      if (String(subRows[0].topic_id) !== String(topicId)) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Subtopic does not belong to the provided topic' });
      }
    }
    // If useImageMode, create question_images row first (store only filenames)
    let useImgId = null;
    if (useImageMode) {
      const [imgResult] = await connection.execute(
        `INSERT INTO question_images (question_img, option_a, option_b, option_c, option_d, explanation) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          extractFilename(questionImage) || null,
          extractFilename(optionAImage) || null,
          extractFilename(optionBImage) || null,
          extractFilename(optionCImage) || null,
          extractFilename(optionDImage) || null,
          extractFilename(explanationImage) || null
        ]
      );
      useImgId = imgResult.insertId;
    }
    // Now create question row
    // Question text is ALWAYS required. Options can have text even in image mode.
    const [result] = await connection.execute(
      `INSERT INTO questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, answer, explanation, marks, created_by_admin, created_by_user_id, use_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          topicId,
          subtopicId || null,
          questionText.trim(), // Already validated - not empty
          optionA !== undefined ? (optionA || '') : '', // Options text - always save (can be empty string)
          optionB !== undefined ? (optionB || '') : '', 
          optionC !== undefined ? (optionC || '') : '', 
          optionD !== undefined ? (optionD || '') : '', 
          correctAnswer, // Already validated - not null
          explanation !== undefined ? (explanation || '') : '', // Explanation can be empty string
          marks !== undefined && marks !== null ? marks : 4, 
          req.adminId || req.user?.id || 1, 
          null, 
          useImgId !== undefined ? useImgId : null
        ]
    );
    connection.release();
    return res.status(201).json({
      success: true,
      message: 'Question created successfully',
      questionId: result.insertId
    });
  } catch (error) {
    console.error('Error creating question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error.message
    });
  }
};

// Update question (and image table if needed)
export const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const {
    topicId,
    subtopicId,
    questionText,
    questionImage,
    optionA,
    optionAImage,
    optionB,
    optionBImage,
    optionC,
    optionCImage,
    optionD,
    optionDImage,
    correctAnswer,
    explanation,
    explanationImage,
    marks,
    useImageMode // boolean
  } = req.body;
  
  // Helper function to extract filename from URL path
  const extractFilename = (url) => {
    if (!url) return null;
    // If it's already just a filename, return it
    if (!url.includes('/')) return url;
    // Extract filename from path like "/uploads/image-123.jpg" -> "image-123.jpg"
    const parts = url.split('/');
    return parts[parts.length - 1];
  };
  
  try {
    const connection = await pool.getConnection();
    // Get question to check use_img
    const [rows] = await connection.execute('SELECT use_img FROM questions WHERE id = ?', [id]);
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    const useImgId = rows[0].use_img;
    
    // If useImageMode, update or create question_images row (store only filenames)
    if (useImageMode) {
      if (useImgId) {
        // Update existing image record
        await connection.execute(
          `UPDATE question_images SET question_img=?, option_a=?, option_b=?, option_c=?, option_d=?, explanation=? WHERE id=?`,
          [
            extractFilename(questionImage),
            extractFilename(optionAImage),
            extractFilename(optionBImage),
            extractFilename(optionCImage),
            extractFilename(optionDImage),
            extractFilename(explanationImage),
            useImgId
          ]
        );
      } else {
        // Create new image record if switching to image mode
        const [imgResult] = await connection.execute(
          `INSERT INTO question_images (question_img, option_a, option_b, option_c, option_d, explanation) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            extractFilename(questionImage),
            extractFilename(optionAImage),
            extractFilename(optionBImage),
            extractFilename(optionCImage),
            extractFilename(optionDImage),
            extractFilename(explanationImage)
          ]
        );
        // Update question to link to new image record
        await connection.execute('UPDATE questions SET use_img=? WHERE id=?', [imgResult.insertId, id]);
      }
    }
    
    // If subtopicId provided, validate it belongs to the topic
    if (subtopicId) {
      const [subRows] = await connection.execute('SELECT id, topic_id FROM subtopics WHERE id = ?', [subtopicId]);
      if (subRows.length === 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Invalid subtopic ID' });
      }
      if (String(subRows[0].topic_id) !== String(topicId)) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Subtopic does not belong to the provided topic' });
      }
    }

    // Update question row (question text always required, options text always saved)
    await connection.execute(
      `UPDATE questions SET topic_id=?, subtopic_id=?, question_text=?, option_a=?, option_b=?, option_c=?, option_d=?, answer=?, explanation=?, marks=? WHERE id=?`,
      [
        topicId,
        subtopicId || null,
        questionText || '', // Question text always required
        optionA || '', // Options text - always save (can be empty string)
        optionB || '',
        optionC || '',
        optionD || '',
        correctAnswer,
        explanation || '', // Explanation can be empty
        marks,
        id
      ]
    );
    connection.release();
    return res.status(200).json({ success: true, message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error updating question:', error);
    return res.status(500).json({ success: false, message: 'Error updating question', error: error.message });
  }
};

// Delete question (and image table row if linked)
export const deleteQuestion = async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // STEP 1: Get use_img reference
    const [rows] = await connection.execute(
      'SELECT use_img FROM questions WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const useImgId = rows[0].use_img;

    // STEP 2: Delete from test_questions where this question is used
    await connection.execute(
      'DELETE FROM test_questions WHERE question_id = ?',
      [id]
    );

    // STEP 3: Delete question row
    await connection.execute(
      'DELETE FROM questions WHERE id = ?',
      [id]
    );

    // STEP 4: Delete from question_images if needed
    if (useImgId) {
      await connection.execute(
        'DELETE FROM question_images WHERE id = ?',
        [useImgId]
      );
    }

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully (including test mappings).'
    });

  } catch (error) {
    console.error('Error deleting question:', error);

    return res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
};

// Bulk upload handler — accepts either a multipart file OR a JSON body { rows: [...] }
export const bulkUploadQuestions = async (req, res) => {
  try {
    // --- Path 1: JSON body from the preview-confirmed upload ---
    if (req.body && Array.isArray(req.body.rows)) {
      const items = req.body.rows;
      if (items.length === 0) {
        return res.status(400).json({ success: false, message: 'No rows provided' });
      }
      const { subjectId } = req.body;
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      const [allTopics] = await connection.execute(`
        SELECT t.id, t.topic_name, t.subject_id, s.exam_id 
        FROM topics t 
        JOIN subjects s ON t.subject_id = s.id
      `);
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const topicName = item['Topic'] || item.Topic || '';
        let tId = null;
        let tExamId = null;
        if (topicName) {
          const matched = allTopics.find(t =>
            t.topic_name && t.topic_name.toLowerCase() === topicName.toLowerCase()
          );
          if (matched) {
            tId = matched.id;
            tExamId = matched.exam_id;
          }
        }
        if (!tId) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ success: false, message: `Unmatched topic '${topicName}' on row ${index + 1}` });
        }
        const qTextEn = item['Question (EN)'] || '';
        const qTextTa = item['Question (TA)'] || '';
        const optAEn = item['Option A (EN)'] || ''; const optATa = item['Option A (TA)'] || '';
        const optBEn = item['Option B (EN)'] || ''; const optBTa = item['Option B (TA)'] || '';
        const optCEn = item['Option C (EN)'] || ''; const optCTa = item['Option C (TA)'] || '';
        const optDEn = item['Option D (EN)'] || ''; const optDTa = item['Option D (TA)'] || '';
        const ans = String(item['Answer'] || item.answer || '').toUpperCase();
        const explanation = item['Explanation'] || item.explanation || '';
        const marks = Number(item['Marks'] || item.marks || 4);
        await connection.execute(
          `INSERT INTO questions (exam_type, topic_id, subtopic_id, question_text, question_ta, option_a, option_a_ta, option_b, option_b_ta, option_c, option_c_ta, option_d, option_d_ta, answer, explanation, marks, created_by_admin, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tExamId || '', tId, null, qTextEn, qTextTa, optAEn, optATa, optBEn, optBTa, optCEn, optCTa, optDEn, optDTa, ans, explanation, marks, req.adminId || req.user?.id || 1, null]
        );
      }
      await connection.commit();
      connection.release();
      return res.status(200).json({ success: true, message: `Imported ${items.length} questions successfully` });
    }

    // --- Path 2: multipart file upload ---
    const file = req.file || (req.files && req.files.file);
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // If buffer present (for multer memory storage)
    let fileBuffer = null;
    if (file.buffer) fileBuffer = file.buffer;
    else if (file.data) fileBuffer = file.data;
    else if (file.path) {
      const fs = await import('fs');
      fileBuffer = fs.readFileSync(file.path);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
    }

    // Parse XLSX, JSON or CSV based on file extension/mimetype
    const originalName = (file.originalname || '').toLowerCase();
    const contentType = file.mimetype || '';
    let items = [];

    if (
      originalName.endsWith('.xlsx') ||
      originalName.endsWith('.xls') ||
      contentType.includes('spreadsheetml') ||
      contentType.includes('ms-excel')
    ) {
      // Parse XLSX using xlsx library
      const XLSX = (await import('xlsx')).default || (await import('xlsx'));
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', codepage: 65001 });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // header: 1 returns array of arrays; defval ensures empty cells are ''
      items = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      // Trim whitespace from keys
      items = items.map(row => {
        const cleaned = {};
        for (const [k, v] of Object.entries(row)) {
          cleaned[k.trim()] = v;
        }
        return cleaned;
      });
    } else if (contentType.includes('json') || originalName.endsWith('.json')) {
      const text = fileBuffer.toString('utf-8');
      try {
        items = JSON.parse(text);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON file' });
      }
    } else {
      // CSV fallback
      const text = fileBuffer.toString('utf-8');
      const { Readable } = await import('stream');
      const csvParser = (await import('csv-parser')).default || (await import('csv-parser'));
      
      items = await new Promise((resolve, reject) => {
        const results = [];
        Readable.from([text])
          .pipe(typeof csvParser === 'function' ? csvParser() : csvParser.default())
          .on('data', (data) => {
            const cleanedData = {};
            for (const [key, value] of Object.entries(data)) {
              cleanedData[key.trim()] = value;
            }
            results.push(cleanedData);
          })
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'File contained no items to upload' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // We support optional form fields examId, subjectId, topicId, subtopicId (apply to all)
    const { examId, subjectId, topicId, subtopicId } = req.body || {};

    // Fetch all topics to map topic names from CSV to topic IDs
    const [allTopics] = await connection.execute('SELECT id, topic_name, subject_id FROM topics');

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const topicName = item.Topic || item.topic || '';
      
      // Coerce numeric fields
      let tId = topicId || item.topicId || item.topic_id || null;
      if (!tId && topicName) {
        // Try to match topic name (case insensitive)
        const matched = allTopics.find(t => t.topic_name.toLowerCase() === topicName.toLowerCase() && (!subjectId || String(t.subject_id) === String(subjectId)));
        if (matched) tId = matched.id;
      }
      
      const sId = subtopicId || item.subtopicId || item.subtopic_id || null;
      
      const qTextEn = item['Question (EN)'] || item.questionText || item.question || item.question_text || '';
      const qTextTa = item['Question (TA)'] || item.question_ta || '';
      
      const optAEn = item['Option A (EN)'] || item.optionA || item.option_a || '';
      const optATa = item['Option A (TA)'] || item.option_a_ta || '';
      
      const optBEn = item['Option B (EN)'] || item.optionB || item.option_b || '';
      const optBTa = item['Option B (TA)'] || item.option_b_ta || '';
      
      const optCEn = item['Option C (EN)'] || item.optionC || item.option_c || '';
      const optCTa = item['Option C (TA)'] || item.option_c_ta || '';
      
      const optDEn = item['Option D (EN)'] || item.optionD || item.option_d || '';
      const optDTa = item['Option D (TA)'] || item.option_d_ta || '';
      
      const ans = item.Answer || item.correctAnswer || item.answer || item.correct_answer || '';
      const explanation = item.Explanation || item.explanation || '';
      const marks = item.Marks || item.marks ? Number(item.Marks || item.marks) : 4;

      if (!tId) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: `Topic ID missing or unrecognized Topic Name '${topicName}' for row ${index + 1}` });
      }

      // If subtopic provided, validate belongs to topic
      if (sId) {
        const [srows] = await connection.execute('SELECT id, topic_id FROM subtopics WHERE id = ?', [sId]);
        if (srows.length === 0 || String(srows[0].topic_id) !== String(tId)) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ success: false, message: `Invalid subtopic ${sId} for topic ${tId} on row ${index + 1}` });
        }
      }

      await connection.execute(
        `INSERT INTO questions (
          topic_id, subtopic_id, 
          question_text, question_ta,
          option_a, option_a_ta,
          option_b, option_b_ta,
          option_c, option_c_ta,
          option_d, option_d_ta,
          answer, explanation, marks, created_by_admin, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tId, sId || null, 
          qTextEn, qTextTa, 
          optAEn, optATa, 
          optBEn, optBTa, 
          optCEn, optCTa, 
          optDEn, optDTa, 
          ans, explanation, marks, req.adminId || req.user?.id || 1, null
        ]
      );
    }

    await connection.commit();
    connection.release();

    return res.status(200).json({ success: true, message: `Imported ${items.length} questions` });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return res.status(500).json({ success: false, message: 'Error processing bulk upload', error: error.message });
  }
};


// Toggle question status (active/inactive)
export const toggleQuestionStatus = async (req, res) => {
  const { id } = req.params;
  
  try {
    const connection = await pool.getConnection();
    // Ensure 'status' column exists before toggling
    const [cols] = await connection.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='questions' AND COLUMN_NAME='status'`);
    if (!cols || cols.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: "Status toggle not supported: 'status' column is missing" });
    }
    await connection.execute(
      `UPDATE questions 
       SET status = CASE 
         WHEN status = 'active' THEN 'inactive' 
         ELSE 'active' 
       END 
       WHERE id = ?`,
      [id]
    );
    
    connection.release();
    
    return res.status(200).json({
      success: true,
      message: 'Question status toggled successfully'
    });
  } catch (error) {
    console.error('Error toggling question status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error toggling question status',
      error: error.message
    });
  }
};

// Remove a specific image field for a question (e.g., option_a or question_img)
export const removeQuestionImage = async (req, res) => {
  const { id } = req.params;
  const { field } = req.body; // expected DB column name

  const ALLOWED = ['question_img', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'];
  if (!ALLOWED.includes(field)) {
    return res.status(400).json({ success: false, message: 'Invalid image field' });
  }

  try {
    const connection = await pool.getConnection();
    const [qRows] = await connection.execute('SELECT use_img FROM questions WHERE id = ?', [id]);
    if (qRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    const useImgId = qRows[0].use_img;
    if (!useImgId) {
      connection.release();
      return res.status(400).json({ success: false, message: 'No images associated with this question' });
    }

    // Optionally read current filename to delete the file from disk (skipped for now)
    await connection.execute(`UPDATE question_images SET ${field} = NULL WHERE id = ?`, [useImgId]);
    connection.release();
    return res.status(200).json({ success: true, message: 'Image removed' });
  } catch (error) {
    console.error('Error removing question image:', error);
    return res.status(500).json({ success: false, message: 'Error removing image', error: error.message });
  }
};
