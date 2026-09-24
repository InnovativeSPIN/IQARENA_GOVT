import pool from '../../config/db.js';

export const getTests = async (req, res) => {
  const { examId, subjectId, batchId, status, search, subtopicId } = req.query;
  
  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT 
        t.id,
        t.title,
        t.parent_test_id as parentTestId,
          t.all_subjects as allSubjects,
        t.duration_minutes as duration,
        t.subtopic_id as subtopicId,
        sst.subtopic_name as subtopicName,
        COALESCE((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id), 0) as totalMarks,
        t.start_time as startTime,
        t.end_time as endTime,
        t.status,
        t.created_at as createdAt,
        t.created_by as createdBy,
        e.id as examId,
        e.name as examType,
        s.id as subjectId,
        s.name as subject,
        t.topic_id as topicId,
        top.topic_name as topicName,
        b.id as batchId,
        b.batch_name as batchName,
        u.name as createdByName,
        (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) as questionCount
      FROM tests t
      JOIN exams e ON t.exam_id = e.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN topics top ON t.topic_id = top.id
      LEFT JOIN subtopics sst ON t.subtopic_id = sst.id
      LEFT JOIN batches b ON t.batch_id = b.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Apply filters
    if (examId) {
      query += ' AND t.exam_id = ?';
      params.push(examId);
    }
    
    if (subjectId) {
      query += ' AND t.subject_id = ?';
      params.push(subjectId);
    }
    
    if (batchId) {
      query += ' AND t.batch_id = ?';
      params.push(batchId);
    }

    if (subtopicId) {
      query += ' AND t.subtopic_id = ?';
      params.push(subtopicId);
    }
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    // Test type filter: single | combined | child
    if (req.query.testType) {
      if (req.query.testType === 'single') {
        query += ' AND t.parent_test_id IS NULL AND t.all_subjects = 0';
      } else if (req.query.testType === 'combined') {
        query += ' AND t.parent_test_id IS NULL AND t.all_subjects = 1';
      } else if (req.query.testType === 'child') {
        query += ' AND t.parent_test_id IS NOT NULL';
      }
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
    console.error('Error fetching tests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching tests',
      error: error.message
    });
  }
};

// Get single test by ID
export const getTestById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        t.id,
        t.title,
        t.parent_test_id as parentTestId,
        t.duration_minutes as duration,
        COALESCE((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id), 0) as totalMarks,
        t.start_time as startTime,
        t.end_time as endTime,
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
        sst.subtopic_name as subtopicName,
        b.id as batchId,
        b.batch_name as batchName,
        u.name as createdByName,
        (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) as questionCount
      FROM tests t
      JOIN exams e ON t.exam_id = e.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN topics top ON t.topic_id = top.id
      LEFT JOIN subtopics sst ON t.subtopic_id = sst.id
      LEFT JOIN batches b ON t.batch_id = b.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }
    
    // Get test questions with full details.
    // The previous implementation used to filter questions by allocations stored in `test_subject_allocations`.
    // That table has been removed, so return all questions associated with this test from `test_questions`.
    const [qRows] = await connection.execute(
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
        s.id as subjectId,
        s.name as subjectName
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE tq.test_id = ?
      ORDER BY tq.id`,
      [id]
    );
    const questions = qRows;

    // For each question, if use_img is greater than 0, fetch images from question_images table
    const questionsWithImages = await Promise.all(
      questions.map(async (question) => {
        // Check if useImg is truthy (> 0 or true)
        if (question.useImg && Number(question.useImg) > 0) {
          // Fetch images from question_images table using use_img as the foreign key
          const [imageRows] = await connection.execute(
            `SELECT 
              question_img as questionImage,
              option_a as optionAImage,
              option_b as optionBImage,
              option_c as optionCImage,
              option_d as optionDImage,
              explanation as explanationImage
            FROM question_images
            WHERE id = ?`,
            [question.useImg]
          );

          if (imageRows.length > 0) {
            return {
              ...question,
              questionImage: imageRows[0].questionImage || null,
              optionAImage: imageRows[0].optionAImage || null,
              optionBImage: imageRows[0].optionBImage || null,
              optionCImage: imageRows[0].optionCImage || null,
              optionDImage: imageRows[0].optionDImage || null,
              explanationImage: imageRows[0].explanationImage || null,
              // preserve subject info from outer query
              subjectId: question.subjectId || null,
              subjectName: question.subjectName || null
            };
          }
        }

        // If use_img is 0/false or no images found, return question with null images
        // No images; still include subject metadata
        return {
          ...question,
          questionImage: null,
          optionAImage: null,
          optionBImage: null,
          optionCImage: null,
          optionDImage: null,
          explanationImage: null,
          subjectId: question.subjectId || null,
          subjectName: question.subjectName || null
        };
      })
    );

    // Compute derived counts and subject breakdown from the returned questions so
    // the API is self-consistent (questionCount matches returned questions).
    const computedQuestionCount = questionsWithImages.length;

    // Build per-subject counts for UI (used for subject tabs)
    const subjectMap = new Map();
    for (const q of questionsWithImages) {
      const sid = q.subjectId || null;
      const sname = q.subjectName || 'N/A';
      const key = `${sid}:${sname}`;
      const cur = subjectMap.get(key) || { id: sid, name: sname, count: 0 };
      cur.count += 1;
      subjectMap.set(key, cur);
    }
    const viewSubjects = Array.from(subjectMap.values());

    // Fetch child tests (combined children) if any
    const [childRows] = await connection.execute(
      `SELECT t2.id, t2.title, t2.subject_id as subjectId, t2.topic_id as topicId, t2.subtopic_id as subtopicId, t2.duration_minutes as duration, t2.total_marks as totalMarks, (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t2.id) as questionCount FROM tests t2 WHERE t2.parent_test_id = ?`,
      [id]
    );
    // If there are child tests, fetch their questions and include them in response
    let allQuestions = questionsWithImages.slice();
    if (Array.isArray(childRows) && childRows.length > 0) {
      // For each child test, fetch its questions and enrich with images and subject info
      for (const ct of childRows) {
        try {
          const [cqRows] = await connection.execute(
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
              s.id as subjectId,
              s.name as subjectName
            FROM test_questions tq
            JOIN questions q ON tq.question_id = q.id
            LEFT JOIN topics t ON q.topic_id = t.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE tq.test_id = ?
            ORDER BY tq.id`,
            [ct.id]
          );

          if (Array.isArray(cqRows) && cqRows.length > 0) {
            const cqWithImages = await Promise.all(
              cqRows.map(async (question) => {
                if (question.useImg && Number(question.useImg) > 0) {
                  const [imageRows] = await connection.execute(
                    `SELECT 
                      question_img as questionImage,
                      option_a as optionAImage,
                      option_b as optionBImage,
                      option_c as optionCImage,
                      option_d as optionDImage,
                      explanation as explanationImage
                    FROM question_images
                    WHERE id = ?`,
                    [question.useImg]
                  );
                  if (imageRows.length > 0) {
                    return {
                      ...question,
                      questionImage: imageRows[0].questionImage || null,
                      optionAImage: imageRows[0].optionAImage || null,
                      optionBImage: imageRows[0].optionBImage || null,
                      optionCImage: imageRows[0].optionCImage || null,
                      optionDImage: imageRows[0].optionDImage || null,
                      explanationImage: imageRows[0].explanationImage || null,
                      subjectId: question.subjectId || null,
                      subjectName: question.subjectName || null,
                      sourceTestId: ct.id
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
                  explanationImage: null,
                  subjectId: question.subjectId || null,
                  subjectName: question.subjectName || null,
                  sourceTestId: ct.id
                };
              })
            );
            allQuestions = allQuestions.concat(cqWithImages);
          }
        } catch (e) {
          console.error('Failed to load questions for child test', ct.id, e);
        }
      }
    }

    // Compute aggregated counts from combined question list
    const finalQuestionCount = allQuestions.length;
    const finalTotalMarks = allQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

    // Rebuild viewSubjects from combined question list
    const subjectMap2 = new Map();
    for (const q of allQuestions) {
      const sid = q.subjectId || null;
      const sname = q.subjectName || 'N/A';
      const key = `${sid}:${sname}`;
      const cur = subjectMap2.get(key) || { id: sid, name: sname, count: 0 };
      cur.count += 1;
      subjectMap2.set(key, cur);
    }

    const finalViewSubjects = Array.from(subjectMap2.values());

    connection.release();

    return res.status(200).json({
      success: true,
      test: {
        ...rows[0],
        questionCount: finalQuestionCount,
        totalMarks: finalTotalMarks,
        questions: allQuestions,
        allocations: [],
        viewSubjects: finalViewSubjects,
        childTests: childRows
      }
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

// Create new test
export const createTest = async (req, res) => {
  console.log('=== CREATE TEST ===');
  console.log('Request URL:', req.url);
  console.log('Request body:', req.body);
  console.log('===================');
  
  const {
    title,
    examId,
    subjectId,
    topicId,
    subtopicId,
    batchId,
    duration,
    totalMarks,
    startTime,
    endTime,
    status = 'draft',
    createdBy
  } = req.body;
  
  // Validation
  if (!title || !examId || !duration || !totalMarks) {
    return res.status(400).json({
      success: false,
      message: 'Exam and duration are required'
    });
  }
  
  // Validate createdBy if provided
  if (createdBy && typeof createdBy !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'createdBy must be a valid user ID'
    });
  }
  
  try {
    const connection = await pool.getConnection();
    
    // Verify exam exists
    const [examRows] = await connection.execute(
      'SELECT id FROM exams WHERE id = ?',
      [examId]
    );
    
    if (examRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Does request include allocations? Treat as an all-subjects allocation-driven test
    const hasAlloc = Array.isArray(req.body.allocations) && req.body.allocations.length > 0;
    
    // Verify subject exists if provided and not using allocations (allocations imply per-subject allocations will be stored separately)
    if (!hasAlloc && subjectId) {
      const [subjectRows] = await connection.execute(
        'SELECT id FROM subjects WHERE id = ? AND exam_id = ?',
        [subjectId, examId]
      );

      if (subjectRows.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Subject not found or does not belong to the selected exam'
        });
      }
    }
    
    // Verify topic exists if provided
    if (topicId) {
      const [topicRows] = await connection.execute(
        'SELECT id FROM topics WHERE id = ? AND subject_id = ?',
        [topicId, subjectId]
      );

      if (topicRows.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Topic not found or does not belong to the selected subject'
        });
      }
    }

    // Verify subtopic exists if provided and belongs to the topic (if topic provided)
    if (subtopicId) {
      const [subtopicRows] = await connection.execute(
        'SELECT id, topic_id FROM subtopics WHERE id = ?',
        [subtopicId]
      );
      if (subtopicRows.length === 0) {
        connection.release();
        return res.status(404).json({ success: false, message: 'Subtopic not found' });
      }
      if (topicId && Number(subtopicRows[0].topic_id) !== Number(topicId)) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Subtopic does not belong to the selected topic' });
      }
    }
    
    // Verify batch exists if provided
    if (batchId) {
      const [batchRows] = await connection.execute(
        'SELECT id FROM batches WHERE id = ?',
        [batchId]
      );
      
      if (batchRows.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Batch not found'
        });
      }
    }
    

    if (hasAlloc) {
      await connection.beginTransaction();
    }

    let allocationResult = null;

    // If allocations provided, we treat this as an all-subjects test and clear subject/topic/subtopic on the tests row
    let finalSubjectId = hasAlloc ? null : (subjectId || null);
    let finalTopicId = hasAlloc ? null : (topicId || null);
    let finalSubtopicId = hasAlloc ? null : (subtopicId || null);
    // If creating a parent test that attaches existing tests (combine mode), mark it as all_subjects
    const finalAllSubjects = (Array.isArray(req.body.parentFor) && req.body.parentFor.length > 0) ? 1 : 0;

    // When creating a combined parent test, ensure we do NOT save subject/topic/subtopic on the parent
    if (finalAllSubjects === 1) {
      finalSubjectId = null;
      finalTopicId = null;
      finalSubtopicId = null;
    }

    const finalTitle = title || `Test - ${new Date().toLocaleString()}`;
    const finalTotalMarks = typeof totalMarks !== 'undefined' ? totalMarks : 0;

    const [result] = await connection.execute(
      `INSERT INTO tests 
        (exam_id, subject_id, all_subjects, topic_id, subtopic_id, batch_id, title, duration_minutes, total_marks, start_time, end_time, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [examId, finalSubjectId, finalAllSubjects, finalTopicId, finalSubtopicId, batchId || null, finalTitle, duration, finalTotalMarks, startTime || null, endTime || null, status, createdBy || null]
    );
    const testId = result.insertId;

    // If allocations provided in request body, apply them directly (no allocations table)
    if (hasAlloc) {
      try {
        const applyResult = await applyAllocationsToTest(connection, testId, req.body.allocations);
        await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [applyResult.totalMarks || 0, testId]);
        allocationResult = applyResult;

        await connection.commit();
        connection.release();
      } catch (allocErr) {
        await connection.rollback();
        connection.release();
        console.error('Allocation error:', allocErr);
        return res.status(500).json({ success: false, message: 'Failed to allocate questions', error: allocErr.message });
      }
    } else {
      connection.release();
    }

    // If parentFor provided (array of existing test IDs), attach them as children of this new test
    if (Array.isArray(req.body.parentFor) && req.body.parentFor.length > 0) {
      const childIds = req.body.parentFor.map(id => Number(id));
      let conn2;
      try {
        conn2 = await pool.getConnection();
        await conn2.beginTransaction();
        const placeholders = childIds.map(() => '?').join(',');
        await conn2.execute(`UPDATE tests SET parent_test_id = ? WHERE id IN (${placeholders})`, [testId, ...childIds]);
        // Update parent total_marks to sum of children's total_marks and mark as all_subjects
        const [sumRows] = await conn2.execute(`SELECT COALESCE(SUM(total_marks), 0) as total FROM tests WHERE id IN (${placeholders})`, childIds);
        const parentTotal = (sumRows && sumRows.length > 0) ? (sumRows[0].total || 0) : 0;
        await conn2.execute('UPDATE tests SET total_marks = ?, all_subjects = 1, subject_id = NULL, topic_id = NULL, subtopic_id = NULL WHERE id = ?', [parentTotal, testId]);
        await conn2.commit();
      } catch (err) {
        if (conn2) await conn2.rollback();
        console.error('Failed to attach child tests to parent:', err);
      } finally {
        if (conn2) conn2.release();
      }
    }
    
    return res.status(201).json({
      success: true,
      message: 'Test created successfully',
      testId: testId,
      allocationResult: allocationResult
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
 * Allocate questions for a test based on rows in test_subject_allocations.
 * Expects an open connection (optionally inside a transaction). Returns an object with totals and warnings.
 */
// NOTE: Legacy function allocateQuestionsForTest removed. Allocations are applied via applyAllocationsToTest which handles adding/removing questions based on provided allocations.



/**
 * Preview allocations: simulate adding/removing questions according to provided allocations
 * Does NOT modify the database. Returns per-allocation summaries and sample question ids for additions/removals.
 */
async function previewAllocationsForTest(connection, testId, allocations) {
  const warnings = [];
  const perAlloc = [];
  let totalWillAdd = 0;
  let totalWillRemove = 0;

  // Precompute existing question ids for this test
  const [existingQuestions] = await connection.execute('SELECT tq.question_id, q.topic_id, q.subtopic_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ?', [testId]);
  const existingQuestionIds = new Set(existingQuestions.map(q => q.question_id));

  for (const a of allocations) {
    const sId = a.subjectId || null;
    const tId = a.topicId || null;
    const stId = a.subtopicId || null;
    const desired = Number(a.questionCount) || 0;
    const marks = Number(a.marksPerQuestion) || 4;

    if (!sId) {
      warnings.push('Allocation requires subjectId');
      continue;
    }

    // Count existing allocated questions that match this allocation scope
    let existingMatchQuery;
    let params = [testId];
    if (stId) {
      existingMatchQuery = 'SELECT tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ? AND q.subtopic_id = ?';
      params.push(stId);
    } else if (tId) {
      existingMatchQuery = 'SELECT tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ? AND q.topic_id = ?';
      params.push(tId);
    } else {
      existingMatchQuery = 'SELECT tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id JOIN topics top ON q.topic_id = top.id WHERE tq.test_id = ? AND top.subject_id = ?';
      params.push(sId);
    }

    const [existingMatchRows] = await connection.execute(existingMatchQuery, params);
    const existingCount = existingMatchRows.length;

    let toAdd = 0;
    let toRemove = 0;
    let addSample = [];
    let removeSample = [];

    if (desired > existingCount) {
      toAdd = desired - existingCount;
      // Find candidate questions to add (exclude any already in test)
      let candidateQuery;
      let cparams = [];
      if (stId) {
        candidateQuery = `SELECT q.id FROM questions q WHERE q.subtopic_id = ? AND q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?) ORDER BY RAND() LIMIT ?`;
        cparams = [stId, testId, toAdd];
      } else if (tId) {
        candidateQuery = `SELECT q.id FROM questions q WHERE q.topic_id = ? AND q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?) ORDER BY RAND() LIMIT ?`;
        cparams = [tId, testId, toAdd];
      } else {
        candidateQuery = `SELECT q.id FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? AND q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?) ORDER BY RAND() LIMIT ?`;
        cparams = [sId, testId, toAdd];
      }
      const [candRows] = await connection.execute(candidateQuery, cparams);
      addSample = candRows.map(r => r.id);
      if (addSample.length < toAdd) {
        warnings.push(`Allocation for subject ${sId} requested ${desired} but only ${existingCount + addSample.length} available`);
        toAdd = addSample.length;
      }
    } else if (desired < existingCount) {
      toRemove = existingCount - desired;
      // Choose last added questions (by tq.id desc) as sample removals
      let removeQuery;
      let rparams = [testId, toRemove];
      if (stId) {
        removeQuery = `SELECT tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ? AND q.subtopic_id = ? ORDER BY tq.id DESC LIMIT ?`;
        rparams = [testId, stId, toRemove];
      } else if (tId) {
        removeQuery = `SELECT tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ? AND q.topic_id = ? ORDER BY tq.id DESC LIMIT ?`;
        rparams = [testId, tId, toRemove];
      } else {
        removeQuery = `SELECT tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id JOIN topics top ON q.topic_id = top.id WHERE tq.test_id = ? AND top.subject_id = ? ORDER BY tq.id DESC LIMIT ?`;
        rparams = [testId, sId, toRemove];
      }
      const [remRows] = await connection.execute(removeQuery, rparams);
      removeSample = remRows.map(r => r.question_id);
    }

    perAlloc.push({ subjectId: sId, topicId: tId, subtopicId: stId, desired, existing: existingCount, willAdd: toAdd, willRemove: toRemove, addSample, removeSample, marksPerQuestion: marks });
    totalWillAdd += toAdd;
    totalWillRemove += toRemove;
  }

  return { totalWillAdd, totalWillRemove, warnings, perAllocation: perAlloc };
}

/**
 * Apply allocations incrementally to a test: add missing questions and remove excess questions according to allocations.
 * Expects allocations already inserted into test_subject_allocations for this test (or uses provided allocations data).
 * Returns summary: { totalAdded, totalRemoved, totalMarks, warnings, perAllocation: [...] }
 */
async function applyAllocationsToTest(connection, testId, allocations) {
  const warnings = [];
  const perAlloc = [];
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalMarks = 0;

  for (const a of allocations) {
    const sId = a.subjectId || null;
    const tId = a.topicId || null;
    const stId = a.subtopicId || null;
    const desired = Number(a.questionCount) || 0;
    const marks = Number(a.marksPerQuestion) || 4;

    if (!sId) {
      warnings.push('Allocation requires subjectId');
      continue;
    }

    // Count existing allocated questions that match this allocation scope
    let existingMatchQuery;
    let params = [testId];
    if (stId) {
      existingMatchQuery = 'SELECT tq.id as tqid, tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ? AND q.subtopic_id = ? ORDER BY tq.id';
      params.push(stId);
    } else if (tId) {
      existingMatchQuery = 'SELECT tq.id as tqid, tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ? AND q.topic_id = ? ORDER BY tq.id';
      params.push(tId);
    } else {
      existingMatchQuery = 'SELECT tq.id as tqid, tq.question_id FROM test_questions tq JOIN questions q ON tq.question_id = q.id JOIN topics top ON q.topic_id = top.id WHERE tq.test_id = ? AND top.subject_id = ? ORDER BY tq.id';
      params.push(sId);
    }

    const [existingMatchRows] = await connection.execute(existingMatchQuery, params);
    const existingCount = existingMatchRows.length;

    let added = 0;
    let removed = 0;
    const addedIds = [];
    const removedIds = [];

    if (desired > existingCount) {
      const toAdd = desired - existingCount;
      // Find candidate questions to add (exclude any already in test)
      let candidateQuery;
      let cparams = [];
      if (stId) {
        candidateQuery = `SELECT q.id FROM questions q WHERE q.subtopic_id = ? AND q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?) ORDER BY RAND() LIMIT ?`;
        cparams = [stId, testId, toAdd];
      } else if (tId) {
        candidateQuery = `SELECT q.id FROM questions q WHERE q.topic_id = ? AND q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?) ORDER BY RAND() LIMIT ?`;
        cparams = [tId, testId, toAdd];
      } else {
        candidateQuery = `SELECT q.id FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? AND q.id NOT IN (SELECT question_id FROM test_questions WHERE test_id = ?) ORDER BY RAND() LIMIT ?`;
        cparams = [sId, testId, toAdd];
      }
      const [candRows] = await connection.execute(candidateQuery, cparams);
      for (const r of candRows) {
        const [ins] = await connection.execute('INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)', [testId, r.id]);
        if (ins.affectedRows > 0) {
          added++;
          addedIds.push(r.id);
        }
      }
      if (added < toAdd) {
        warnings.push(`Allocation for subject ${sId} requested ${desired} but only ${existingCount + added} available`);
      }
    } else if (desired < existingCount) {
      const toRemove = existingCount - desired;
      // Remove last added questions (by tq.id desc)
      const idsToRemove = existingMatchRows.slice(-toRemove).map(r => r.question_id);
      if (idsToRemove.length > 0) {
        const placeholders = idsToRemove.map(() => '?').join(',');
        const [delRes] = await connection.execute(`DELETE FROM test_questions WHERE test_id = ? AND question_id IN (${placeholders})`, [testId, ...idsToRemove]);
        removed = delRes.affectedRows || 0;
        removedIds.push(...idsToRemove.slice(0, removed));
      }
    }

    const finalAllocated = existingCount + added - removed;
    totalAdded += added;
    totalRemoved += removed;
    totalMarks += finalAllocated * marks;

    perAlloc.push({ subjectId: sId, topicId: tId, subtopicId: stId, desired, existing: existingCount, added, removed, addedIds, removedIds, marksPerQuestion: marks });
  }

  return { totalAdded, totalRemoved, totalMarks, warnings, perAllocation: perAlloc };
}

// Preview allocations (does not modify DB)
export const previewAllocations = async (req, res) => {
  const { id } = req.params;
  const { allocations } = req.body;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ success: false, message: 'allocations must be a non-empty array' });
  }

  try {
    const connection = await pool.getConnection();
    // Verify test exists
    const [testRows] = await connection.execute('SELECT id FROM tests WHERE id = ?', [id]);
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const preview = await previewAllocationsForTest(connection, id, allocations);
    connection.release();
    return res.status(200).json({ success: true, preview });
  } catch (err) {
    console.error('Error previewing allocations:', err);
    return res.status(500).json({ success: false, message: 'Error previewing allocations', error: err.message });
  }
};

/**
 * Ensure a test exists for the given exam and subject. If a test exists, return it; otherwise create one.
 * Body may include optional fields: title, duration, totalMarks, batchId, status, createdBy
 */
export const ensureTestForSubject = async (req, res) => {
  const { examId, subjectId } = req.body;
  if (!examId || !subjectId) {
    return res.status(400).json({ success: false, message: 'examId and subjectId are required' });
  }

  try {
    const connection = await pool.getConnection();
    // Check for existing test
    const [existing] = await connection.execute('SELECT id FROM tests WHERE exam_id = ? AND subject_id = ?', [examId, subjectId]);
    if (existing.length > 0) {
      connection.release();
      return res.status(200).json({ success: true, created: false, testId: existing[0].id });
    }

    // Create a new test for this exam and subject
    const title = req.body.title || `Test - ${new Date().toLocaleString()}`;
    const duration = typeof req.body.duration !== 'undefined' ? req.body.duration : 45;
    const totalMarks = typeof req.body.totalMarks !== 'undefined' ? req.body.totalMarks : 0;
    const batchId = req.body.batchId || null;
    const status = req.body.status || 'draft';
    const createdBy = req.body.createdBy || null;

    const [result] = await connection.execute(
      `INSERT INTO tests (exam_id, subject_id, all_subjects, topic_id, subtopic_id, batch_id, title, duration_minutes, total_marks, start_time, end_time, status, created_by) VALUES (?, ?, 0, NULL, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [examId, subjectId, batchId, title, duration, totalMarks, status, createdBy]
    );
    const testId = result.insertId;
    connection.release();
    return res.status(201).json({ success: true, created: true, testId });
  } catch (err) {
    console.error('Error ensuring test for subject:', err);
    return res.status(500).json({ success: false, message: 'Error ensuring test for subject', error: err.message });
  }
};

/**
 * Preview or apply allocations for a subject within an exam. Optionally create the subject test if missing.
 * Route: POST /api/admin/exams/:examId/subjects/:subjectId/allocations
 * Body: { allocations: [...], preview: boolean, createIfMissing: boolean, title?, duration?, totalMarks? }
 */
export const applyAllocationsForSubject = async (req, res) => {
  const { examId, subjectId } = req.params;
  const { allocations, preview = false, createIfMissing = false } = req.body;

  if (!examId || !subjectId) {
    return res.status(400).json({ success: false, message: 'examId and subjectId are required' });
  }
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ success: false, message: 'allocations must be a non-empty array' });
  }

  try {
    const connection = await pool.getConnection();

    // Find an existing per-subject test
    const [existing] = await connection.execute('SELECT id FROM tests WHERE exam_id = ? AND subject_id = ?', [examId, subjectId]);
    let testId = existing.length > 0 ? existing[0].id : null;
    let created = false;

    if (!testId && createIfMissing && !preview) {
      // Create test and then apply
      const title = req.body.title || `Test - ${new Date().toLocaleString()}`;
      const duration = typeof req.body.duration !== 'undefined' ? req.body.duration : 45;
      const totalMarks = typeof req.body.totalMarks !== 'undefined' ? req.body.totalMarks : 0;
      const batchId = req.body.batchId || null;
      const status = req.body.status || 'draft';
      const createdBy = req.body.createdBy || null;

      const [ins] = await connection.execute(
        `INSERT INTO tests (exam_id, subject_id, all_subjects, topic_id, subtopic_id, batch_id, title, duration_minutes, total_marks, start_time, end_time, status, created_by) VALUES (?, ?, 0, NULL, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        [examId, subjectId, batchId, title, duration, totalMarks, status, createdBy]
      );
      testId = ins.insertId;
      created = true;
    }

    if (preview) {
      // If test exists, call previewAllocationsForTest; otherwise simulate for missing test
      let previewResult;
      if (testId) {
        previewResult = await previewAllocationsForTest(connection, testId, allocations);
      } else {
        // simulate: existingCount = 0 and sample candidates
        const perAlloc = [];
        const warnings = [];
        let totalWillAdd = 0;
        let totalWillRemove = 0;
        for (const a of allocations) {
          const sId = a.subjectId || subjectId;
          const tId = a.topicId || null;
          const stId = a.subtopicId || null;
          const desired = Number(a.questionCount) || 0;

          let addSample = [];
          if (desired > 0) {
            let candidateQuery;
            let cparams = [];
            if (stId) {
              candidateQuery = `SELECT q.id FROM questions q WHERE q.subtopic_id = ? ORDER BY RAND() LIMIT ?`;
              cparams = [stId, desired];
            } else if (tId) {
              candidateQuery = `SELECT q.id FROM questions q WHERE q.topic_id = ? ORDER BY RAND() LIMIT ?`;
              cparams = [tId, desired];
            } else {
              candidateQuery = `SELECT q.id FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? ORDER BY RAND() LIMIT ?`;
              cparams = [sId, desired];
            }
            const [candRows] = await connection.execute(candidateQuery, cparams);
            addSample = candRows.map(r => r.id);
            if (addSample.length < desired) {
              warnings.push(`Allocation for subject ${sId} requested ${desired} but only ${addSample.length} available`);
            }
            totalWillAdd += Math.min(desired, addSample.length);
          }
          perAlloc.push({ subjectId: sId, topicId: tId, subtopicId: stId, desired, existing: 0, willAdd: Math.min(desired, addSample.length), willRemove: 0, addSample, removeSample: [] });
        }
        previewResult = { totalWillAdd, totalWillRemove: 0, warnings, perAllocation: perAlloc };
      }
      connection.release();
      return res.status(200).json({ success: true, preview: previewResult, testId, created });
    }

    // Not preview: testId must exist now (either preexisting or created if requested)
    if (!testId) {
      connection.release();
      return res.status(404).json({ success: false, message: 'No test exists for subject; set createIfMissing=true to create one' });
    }

    try {
      await connection.beginTransaction();

      // Apply allocations incrementally directly from the provided allocations (no persistence to allocations table)
      const applyResult = await applyAllocationsToTest(connection, testId, allocations);
      await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [applyResult.totalMarks || 0, testId]);

      await connection.commit();
      connection.release();
      return res.status(200).json({ success: true, applied: true, testId, applyResult, created });
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error('Error applying allocations for subject:', err);
      return res.status(500).json({ success: false, message: 'Error applying allocations for subject', error: err.message });
    }
  } catch (err) {
    console.error('Error in applyAllocationsForSubject:', err);
    return res.status(500).json({ success: false, message: 'Error processing request', error: err.message });
  }
};

// Update test
export const updateTest = async (req, res) => {
  const { id } = req.params;
  let propagationWarningsGlobal = [];
  const {
    title,
    examId,
    subjectId,
    topicId,
    subtopicId,
    batchId,
    duration,
    totalMarks,
    startTime,
    endTime,
    status,
    createdBy,
    applyToAllTopics
  } = req.body;
  
  try {
    const connection = await pool.getConnection();
    
    // Check if test exists
    const [existingTest] = await connection.execute(
      'SELECT id FROM tests WHERE id = ?',
      [id]
    );
    
    if (existingTest.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (examId !== undefined) {
      updates.push('exam_id = ?');
      params.push(examId);
    }
    if (subjectId !== undefined) {
      updates.push('subject_id = ?');
      params.push(subjectId);
    }
    if (topicId !== undefined) {
      updates.push('topic_id = ?');
      params.push(topicId);
    }
    if (subtopicId !== undefined) {
      // Validate subtopic exists and (if topicId provided) belongs to that topic
      const [subRows] = await connection.execute('SELECT id, topic_id FROM subtopics WHERE id = ?', [subtopicId]);
      if (subRows.length === 0) {
        connection.release();
        return res.status(404).json({ success: false, message: 'Subtopic not found' });
      }
      if (topicId !== undefined && Number(subRows[0].topic_id) !== Number(topicId)) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Subtopic does not belong to the selected topic' });
      }
      updates.push('subtopic_id = ?');
      params.push(subtopicId);
    }
    // If non-empty allocations are provided, clear subject/topic/subtopic
    if (Array.isArray(req.body.allocations) && req.body.allocations.length > 0) {
      updates.push('subject_id = NULL');
      updates.push('topic_id = NULL');
      updates.push('subtopic_id = NULL');
    }
    // If applyToAllTopics flag is provided, ensure topicId is not supplied (it should be 'all topics')
    if (applyToAllTopics === true) {
      if (topicId !== undefined && topicId !== null) {
        connection.release();
        return res.status(400).json({ success: false, message: 'applyToAllTopics requires topicId to be null/unspecified' });
      }
      // Note: applyToAllTopics is accepted for downstream logic (e.g., propagating updates across topics)
      // Currently we just accept the flag; more propagation behavior can be implemented as needed.
    }
    if (batchId !== undefined) {
      updates.push('batch_id = ?');
      params.push(batchId);
    }
    if (duration !== undefined) {
      updates.push('duration_minutes = ?');
      params.push(duration);
    }
    if (totalMarks !== undefined) {
      updates.push('total_marks = ?');
      params.push(totalMarks);
    }
    if (startTime !== undefined) {
      updates.push('start_time = ?');
      params.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push('end_time = ?');
      params.push(endTime);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (createdBy !== undefined) {
      updates.push('created_by = ?');
      params.push(createdBy);
    }

    // Allow setting/unsetting parent test relationship for a single test
    if (typeof req.body.parentTestId !== 'undefined') {
      updates.push('parent_test_id = ?');
      params.push(req.body.parentTestId || null);
    }


    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    params.push(id);
    const query = `UPDATE tests SET ${updates.join(', ')} WHERE id = ?`;
    
    await connection.execute(query, params);

    // If non-empty allocations were provided in the request body, replace them and re-run allocation
    if (Array.isArray(req.body.allocations) && req.body.allocations.length > 0) {
      // If caller requested a preview, simulate and return preview without modifying DB
      if (req.body.preview === true) {
        try {
          const preview = await previewAllocationsForTest(connection, id, req.body.allocations);
          connection.release();
          return res.status(200).json({ success: true, preview });
        } catch (err) {
          console.error('Failed to preview allocations for test:', err);
          connection.release();
          return res.status(500).json({ success: false, message: 'Failed to preview allocations', error: err.message });
        }
      }

      try {
        await connection.beginTransaction();

        // Apply allocations incrementally directly from provided allocations (no allocations table)
        const applyResult = await applyAllocationsToTest(connection, id, req.body.allocations);

        // Update test total_marks based on apply result
        await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [applyResult.totalMarks || 0, id]);

        await connection.commit();

        // Attach applyResult to response via a local var for later inclusion
        propagationWarningsGlobal.push(...(applyResult.warnings || []));
      } catch (err) {
        await connection.rollback();
        console.error('Failed to update allocations for test:', err);
        // proceed — allocation failure should not block metadata update, but inform client
      }
    }
    // Per-subject propagation and creation has been removed; updates and allocations are applied only to the target test itself.
    // The previous logic that propagated allocations/tests across all subjects has been intentionally removed to simplify behavior and avoid implicit creation of per-subject tests.

    // If caller provided parentFor array during update, replace child mappings for this parent test
    if (Array.isArray(req.body.parentFor)) {
      const childIds = req.body.parentFor.map(id => Number(id));
      let conn2;
      try {
        conn2 = await pool.getConnection();
        await conn2.beginTransaction();
        // Clear existing children for this parent
        await conn2.execute('UPDATE tests SET parent_test_id = NULL WHERE parent_test_id = ?', [id]);
        if (childIds.length > 0) {
          const placeholders = childIds.map(() => '?').join(',');
          await conn2.execute(`UPDATE tests SET parent_test_id = ? WHERE id IN (${placeholders})`, [id, ...childIds]);
          // Recompute parent total as sum of children's total_marks and mark as all_subjects
          const [sumRows] = await conn2.execute(`SELECT COALESCE(SUM(total_marks), 0) as total FROM tests WHERE id IN (${placeholders})`, childIds);
          const newTotal = (sumRows && sumRows.length > 0) ? (sumRows[0].total || 0) : 0;
          await conn2.execute('UPDATE tests SET total_marks = ?, all_subjects = 1, subject_id = NULL, topic_id = NULL, subtopic_id = NULL WHERE id = ?', [newTotal, id]);
        }
        await conn2.commit();
      } catch (err) {
        if (conn2) await conn2.rollback();
        console.error('Failed to update parent/child mappings:', err);
      } finally {
        if (conn2) conn2.release();
      }
    }

    connection.release();
    
    return res.status(200).json({
      success: true,
      message: 'Test updated successfully',
      propagationWarnings: propagationWarningsGlobal.length > 0 ? propagationWarningsGlobal : undefined
    });
  } catch (error) {
    console.error('Error updating test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating test',
      error: error.message,
      propagationWarnings: propagationWarningsGlobal.length > 0 ? propagationWarningsGlobal : undefined
    });
  }
};

// Delete test
export const deleteTest = async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true' || req.body?.force === true;

  try {
    const connection = await pool.getConnection();
    // Check if test has any student attempts
    const [attempts] = await connection.execute(
      'SELECT COUNT(*) as count FROM student_test_attempts WHERE test_id = ?',
      [id]
    );

    const attemptCount = attempts[0].count || 0;

    if (attemptCount > 0 && !force) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete test with existing student attempts',
        attemptCount
      });
    }

    // Start transaction so deletes are atomic when force deleting attempts
    await connection.beginTransaction();
    try {
      if (attemptCount > 0 && force) {
        // Delete student_answers for attempts of this test
        await connection.execute(
          `DELETE sa FROM student_answers sa
           JOIN student_test_attempts sta ON sa.attempt_id = sta.id
           WHERE sta.test_id = ?`,
          [id]
        );

        // Delete student_test_attempts for this test
        await connection.execute(
          'DELETE FROM student_test_attempts WHERE test_id = ?',
          [id]
        );
      }

      // Clear parent references from any child tests so deleting this parent won't violate FK constraints
      await connection.execute('UPDATE tests SET parent_test_id = NULL WHERE parent_test_id = ?', [id]);

      // Delete test questions first
      await connection.execute(
        'DELETE FROM test_questions WHERE test_id = ?',
        [id]
      );

      // Delete the test
      const [result] = await connection.execute(
        'DELETE FROM tests WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: 'Test deleted successfully',
        attemptsDeleted: force ? attemptCount : 0
      });
    } catch (innerErr) {
      await connection.rollback();
      connection.release();
      console.error('Error during delete transaction:', innerErr);
      return res.status(500).json({ success: false, message: 'Error deleting test', error: innerErr.message });
    }
  } catch (error) {
    console.error('Error deleting test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting test',
      error: error.message
    });
  }
};

// Toggle test status
export const toggleTestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['draft', 'published', 'unpublished'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be draft, published, or unpublished'
    });
  }
  
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      'UPDATE tests SET status = ? WHERE id = ?',
      [status, id]
    );
    
    connection.release();
    
    return res.status(200).json({
      success: true,
      message: `Test ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating test status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating test status',
      error: error.message
    });
  }
};

// Add questions to test
export const addQuestionsToTest = async (req, res) => {
  const { id } = req.params;
  
  const { questionIds } = req.body; 


  if (!Array.isArray(questionIds)) {
    console.error('Type:', typeof questionIds);
    console.error('Value:', JSON.stringify(questionIds));
    return res.status(400).json({
      success: false,
      message: 'questionIds must be an array'
    });
  }
  
  if (questionIds.length === 0) {
    console.error('❌ questionIds is an empty array');
    return res.status(400).json({
      success: false,
      message: 'questionIds must be a non-empty array'
    });
  }
  
 
  try {
    const connection = await pool.getConnection();
    
    // Verify test exists
    const [testRows] = await connection.execute(
      'SELECT id FROM tests WHERE id = ?',
      [id]
    );
    
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }
    
    // Get already allocated question IDs for this test
    const [existingQuestions] = await connection.execute(
      'SELECT question_id FROM test_questions WHERE test_id = ?',
      [id]
    );
    
    const existingQuestionIds = existingQuestions.map(q => q.question_id);
    
    // Filter out questions that are already allocated
    const newQuestionIds = questionIds.filter(qId => !existingQuestionIds.includes(qId));
    
    // Insert only new questions
    let addedCount = 0;
    for (const questionId of newQuestionIds) {
      const [result] = await connection.execute(
        'INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)',
        [id, questionId]
      );
      if (result.affectedRows > 0) {
        addedCount++;
      }
    }
    
    connection.release();
    
    const skippedCount = questionIds.length - addedCount;
    
    return res.status(200).json({
      success: true,
      message: `Questions added successfully. ${addedCount} new questions added, ${skippedCount} already allocated.`,
      addedCount,
      skippedCount,
      totalRequested: questionIds.length
    });
  } catch (error) {
    console.error('Error adding questions to test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding questions to test',
      error: error.message
    });
  }
};

export const allocateQuestionsToTest = async (req, res) => {
  const { id } = req.params;
  const { numQuestions } = req.body;
  const { subtopicId, topicId, subjectId, examId } = req.query;
  

  
  if (!numQuestions || numQuestions <= 0) {
    return res.status(400).json({
      success: false,
      message: 'numQuestions must be a positive number'
    });
  }
  
  try {
    const connection = await pool.getConnection();
    
    const [testRows] = await connection.execute(
      'SELECT id, exam_id, subject_id, topic_id FROM tests WHERE id = ?',
      [id]
    );
    
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }
    
    const test = testRows[0];
    
    // Build query to fetch questions. Note: questions table does not have subject_id or exam_id
    // columns directly — subjects are represented via topics and exam is stored in questions.exam_type
    let query;
    const params = [];

    if (subtopicId) {
      query = 'SELECT id FROM questions WHERE subtopic_id = ?';
      params.push(subtopicId);
    } else if (topicId) {
      query = 'SELECT id FROM questions WHERE topic_id = ?';
      params.push(topicId);
    } else if (subjectId) {
      // questions -> topics -> subjects
      query = 'SELECT q.id FROM questions q JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ?';
      params.push(subjectId);
    } else if (examId) {
      // translate exam id to exam name (questions.exam_type stores names like 'NEET'/'JEE')
      const [examRows] = await connection.execute('SELECT name FROM exams WHERE id = ?', [examId]);
      if (examRows.length === 0) {
        connection.release();
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      query = 'SELECT id FROM questions WHERE exam_type = ?';
      params.push(examRows[0].name);
    } else {
      // Use test's topic/subject/exam
      if (test.topic_id) {
        query = 'SELECT id FROM questions WHERE topic_id = ?';
        params.push(test.topic_id);
      } else if (test.subject_id) {
        query = 'SELECT q.id FROM questions q JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ?';
        params.push(test.subject_id);
      } else if (test.exam_id) {
        const [examRows2] = await connection.execute('SELECT name FROM exams WHERE id = ?', [test.exam_id]);
        if (examRows2.length === 0) {
          connection.release();
          return res.status(404).json({ success: false, message: 'Exam not found' });
        }
        query = 'SELECT id FROM questions WHERE exam_type = ?';
        params.push(examRows2[0].name);
      } else {
        // fallback: select all
        query = 'SELECT id FROM questions';
      }
    }

    // Note: questions table doesn't have a status column, so we don't filter by it

    const [questions] = await connection.execute(query, params);
    
    if (questions.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'No questions available for the selected criteria'
      });
    }
    
    if (questions.length < numQuestions) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Only ${questions.length} questions available, cannot allocate ${numQuestions}`
      });
    }
    
    // Get already allocated question IDs for this test
    const [existingQuestions] = await connection.execute(
      'SELECT question_id FROM test_questions WHERE test_id = ?',
      [id]
    );
    
    const existingQuestionIds = new Set(existingQuestions.map(q => q.question_id));
    
    // Filter out already allocated questions
    const availableQuestions = questions.filter(q => !existingQuestionIds.has(q.id));
    
    if (availableQuestions.length < numQuestions) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Only ${availableQuestions.length} new questions available, ${existingQuestionIds.size} already allocated`
      });
    }
    
    // Randomly shuffle and select questions
    const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, numQuestions);
    
    // Insert selected questions
    let addedCount = 0;
    for (const question of selectedQuestions) {
      const [result] = await connection.execute(
        'INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)',
        [id, question.id]
      );
      if (result.affectedRows > 0) {
        addedCount++;
      }
    }

    // Recompute total marks for the test (sum of question.marks)
    try {
      const [totalRows] = await connection.execute(
        `SELECT COALESCE(SUM(q.marks), 0) as total FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ?`,
        [id]
      );
      const totalMarks = (totalRows && totalRows.length > 0) ? (totalRows[0].total || 0) : 0;
      await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, id]);
    } catch (err) {
      console.error('Failed to update total_marks after allocation:', err);
    }
    
    connection.release();
    
    console.log(`Allocated ${addedCount} questions successfully`);
    
    return res.status(200).json({
      success: true,
      message: `${addedCount} questions allocated successfully`,
      addedCount,
      totalRequested: numQuestions
    });
  } catch (error) {
    console.error('Error allocating questions to test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error allocating questions to test',
      error: error.message
    });
  }
};

// Combine a source test into per-subject child tests
export const combineFromTest = async (req, res) => {
  const { id } = req.params; // source test id
  const { copyQuestions = true } = req.body;
  let connection;

  try {
    connection = await pool.getConnection();

    // Verify source test exists
    const [testRows] = await connection.execute('SELECT * FROM tests WHERE id = ?', [id]);
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Source test not found' });
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

    await connection.beginTransaction();

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
          for (const q of qRows) {
            await connection.execute('INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)', [newTestId, q.questionId]);
            totalMarks += Number(q.marks || 0);
          }

          // Update total marks for created test
          await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, newTestId]);
        }
      }

      created.push({ subjectId, subjectName, testId: newTestId, created: true, totalMarks });
    }

    await connection.commit();
    connection.release();

    return res.status(201).json({ success: true, created });
  } catch (error) {
    if (connection) await connection.rollback();
    if (connection) connection.release();
    console.error('Error combining test:', error);
    return res.status(500).json({ success: false, message: 'Error combining test', error: error.message });
  }
};

// Remove question from test
export const removeQuestionFromTest = async (req, res) => {
  const { id, questionId } = req.params;
  const { count } = req.body;
  
  try {
    const connection = await pool.getConnection();
    
    // If 'remove-excess' route and count is provided, remove that many questions
    if (req.path.includes('remove-excess') && count) {
      // Get the last N questions from the test (FIFO: remove oldest added)
      const [questionsToRemove] = await connection.execute(
        `SELECT question_id FROM test_questions 
         WHERE test_id = ? 
         ORDER BY id DESC 
         LIMIT ?`,
        [id, count]
      );
      
      if (questionsToRemove.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'No questions found to remove'
        });
      }
      
      const questionIds = questionsToRemove.map(q => q.question_id);
      const placeholders = questionIds.map(() => '?').join(',');
      
      const [result] = await connection.execute(
        `DELETE FROM test_questions WHERE test_id = ? AND question_id IN (${placeholders})`,
        [id, ...questionIds]
      );
      
      // Recompute total marks after removals
      try {
        const [totalRows] = await connection.execute(
          `SELECT COALESCE(SUM(q.marks), 0) as total FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ?`,
          [id]
        );
        const totalMarks = (totalRows && totalRows.length > 0) ? (totalRows[0].total || 0) : 0;
        await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, id]);
      } catch (err) {
        console.error('Failed to update total_marks after removal:', err);
      }
      
      connection.release();
      
      return res.status(200).json({
        success: true,
        message: `${result.affectedRows} questions removed from test successfully`,
        removed: result.affectedRows
      });
    } else {
      // Remove single question by ID
      const [result] = await connection.execute(
        'DELETE FROM test_questions WHERE test_id = ? AND question_id = ?',
        [id, questionId]
      );

      // Recompute total marks after single-question removal
      try {
        const [totalRows] = await connection.execute(
          `SELECT COALESCE(SUM(q.marks), 0) as total FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = ?`,
          [id]
        );
        const totalMarks = (totalRows && totalRows.length > 0) ? (totalRows[0].total || 0) : 0;
        await connection.execute('UPDATE tests SET total_marks = ? WHERE id = ?', [totalMarks, id]);
      } catch (err) {
        console.error('Failed to update total_marks after single removal:', err);
      }
      
      connection.release();
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Question not found in test'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Question removed from test successfully'
      });
    }
  } catch (error) {
    console.error('Error removing question from test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing question from test',
      error: error.message
    });
  }
};

// Get test report/analytics
export const getTestReport = async (req, res) => {
  const { id } = req.params;
  
  try {
    const connection = await pool.getConnection();
    
    // Get test info
    const [testRows] = await connection.execute(
      `SELECT 
        t.id,
        t.title,
        COALESCE((SELECT COALESCE(SUM(q.marks), 0) FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = t.id), 0) as totalMarks,
        e.name as examType,
        s.name as subject
      FROM tests t
      JOIN exams e ON t.exam_id = e.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = ?`,
      [id]
    );
    
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }
    
    const test = testRows[0];
    
    // Get student statistics
    const [stats] = await connection.execute(
      `SELECT 
        COUNT(DISTINCT sta.student_id) as totalStudents,
        COUNT(DISTINCT CASE WHEN sta.status = 'completed' THEN sta.student_id END) as completedStudents,
        COUNT(DISTINCT CASE WHEN sta.status = 'in_progress' THEN sta.student_id END) as inProgressStudents,
        AVG(CASE WHEN sta.status = 'completed' THEN sta.score END) as averageScore,
        MAX(CASE WHEN sta.status = 'completed' THEN sta.score END) as highestScore,
        MIN(CASE WHEN sta.status = 'completed' THEN sta.score END) as lowestScore,
        AVG(CASE WHEN sta.status = 'completed' THEN sta.time_taken END) as averageTimeTaken
      FROM student_test_attempts sta
      WHERE sta.test_id = ?`,
      [id]
    );
    
    // Get top performers
    const [topPerformers] = await connection.execute(
      `SELECT 
        u.name as studentName,
        sta.score,
        (? ) as totalMarks,
        (sta.score / ? * 100) as percentage
      FROM student_test_attempts sta
      JOIN users u ON sta.student_id = u.id
      WHERE sta.test_id = ? AND sta.status = 'completed'
      ORDER BY sta.score DESC
      LIMIT 10`,
      [test.totalMarks, test.totalMarks, id]
    );
    
    // Get score distribution
    const [distribution] = await connection.execute(
      `SELECT
        CASE
          WHEN (sta.score / t.total_marks * 100) >= 90 THEN '90-100%'
          WHEN (sta.score / t.total_marks * 100) >= 80 THEN '80-89%'
          WHEN (sta.score / t.total_marks * 100) >= 70 THEN '70-79%'
          WHEN (sta.score / t.total_marks * 100) >= 60 THEN '60-69%'
          ELSE 'Below 60%'
        END as scoreRange,
        COUNT(*) as count
      FROM student_test_attempts sta
      JOIN tests t ON sta.test_id = t.id
      WHERE sta.test_id = ? AND sta.status = 'completed'
      GROUP BY scoreRange
      ORDER BY scoreRange DESC`,
      [id]
    );
    
    connection.release();
    
    const reportData = stats[0];
    const averagePercentage = reportData.averageScore 
      ? (reportData.averageScore / test.totalMarks * 100) 
      : 0;
    
    return res.status(200).json({
      success: true,
      report: {
        testId: id,
        totalStudents: reportData.totalStudents || 0,
        attemptedStudents: reportData.totalStudents || 0,
        completedStudents: reportData.completedStudents || 0,
        inProgressStudents: reportData.inProgressStudents || 0,
        averageScore: Math.round(reportData.averageScore || 0),
        averagePercentage: Math.round(averagePercentage * 10) / 10,
        highestScore: reportData.highestScore || 0,
        lowestScore: reportData.lowestScore || 0,
        averageTimeTaken: Math.round(reportData.averageTimeTaken || 0),
        topPerformers: topPerformers.map((p, idx) => ({
          studentName: p.studentName,
          score: p.score,
          percentage: Math.round(p.percentage * 10) / 10,
          rank: idx + 1
        })),
        scoreDistribution: distribution.map(d => ({
          range: d.scoreRange,
          count: d.count,
          percentage: Math.round((d.count / reportData.completedStudents) * 100 * 10) / 10
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching test report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching test report',
      error: error.message
    });
  }
};

export const getTestReportPdf = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();

    // Reuse the report queries to build report object
    const [testRows] = await connection.execute(
      `SELECT t.id, t.title, t.total_marks as totalMarks, e.name as examType, s.name as subject FROM tests t JOIN exams e ON t.exam_id = e.id LEFT JOIN subjects s ON t.subject_id = s.id WHERE t.id = ?`,
      [id]
    );
    if (testRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    const test = testRows[0];

    const [stats] = await connection.execute(
      `SELECT COUNT(DISTINCT sta.student_id) as totalStudents, COUNT(DISTINCT CASE WHEN sta.status = 'completed' THEN sta.student_id END) as completedStudents, COUNT(DISTINCT CASE WHEN sta.status = 'in_progress' THEN sta.student_id END) as inProgressStudents, AVG(CASE WHEN sta.status = 'completed' THEN sta.score END) as averageScore, MAX(CASE WHEN sta.status = 'completed' THEN sta.score END) as highestScore, MIN(CASE WHEN sta.status = 'completed' THEN sta.score END) as lowestScore, AVG(CASE WHEN sta.status = 'completed' THEN sta.time_taken END) as averageTimeTaken FROM student_test_attempts sta WHERE sta.test_id = ?`,
      [id]
    );

    const [topPerformers] = await connection.execute(
      `SELECT u.name as studentName, sta.score, (sta.score / ? * 100) as percentage FROM student_test_attempts sta JOIN users u ON sta.student_id = u.id WHERE sta.test_id = ? AND sta.status = 'completed' ORDER BY sta.score DESC LIMIT 10`,
      [test.totalMarks, id]
    );

    const [distribution] = await connection.execute(
      `SELECT CASE WHEN (sta.score / t.total_marks * 100) >= 90 THEN '90-100%' WHEN (sta.score / t.total_marks * 100) >= 80 THEN '80-89%' WHEN (sta.score / t.total_marks * 100) >= 70 THEN '70-79%' WHEN (sta.score / t.total_marks * 100) >= 60 THEN '60-69%' ELSE 'Below 60%' END as scoreRange, COUNT(*) as count FROM student_test_attempts sta JOIN tests t ON sta.test_id = t.id WHERE sta.test_id = ? AND sta.status = 'completed' GROUP BY scoreRange ORDER BY scoreRange DESC`,
      [id]
    );

    // Question stats (optional) - try to fetch if available
    const [questionStats] = await connection.execute(
      `SELECT q.id as questionId, q.question_text as questionText, COUNT(sa.id) as totalAttempts, SUM(CASE WHEN sa.is_correct = 1 THEN 1 ELSE 0 END) as correctAttempts, SUM(CASE WHEN sa.is_correct = 0 THEN 1 ELSE 0 END) as wrongAttempts, SUM(CASE WHEN sa.selected_option IS NULL THEN 1 ELSE 0 END) as skipped, AVG(sa.time_taken) as avgTimeTaken, (SUM(CASE WHEN sa.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(sa.id) * 100) as accuracy FROM student_answers sa JOIN questions q ON sa.question_id = q.id JOIN student_test_attempts sta ON sa.attempt_id = sta.id WHERE sta.test_id = ? GROUP BY q.id, q.question_text`,
      [id]
    );

    connection.release();

    const report = {
      testId: id,
      totalStudents: stats[0].totalStudents || 0,
      attemptedStudents: stats[0].totalStudents || 0,
      completedStudents: stats[0].completedStudents || 0,
      inProgressStudents: stats[0].inProgressStudents || 0,
      averageScore: Math.round(stats[0].averageScore || 0),
      averagePercentage: Math.round(((stats[0].averageScore || 0) / test.totalMarks) * 1000) / 10,
      highestScore: stats[0].highestScore || 0,
      lowestScore: stats[0].lowestScore || 0,
      averageTimeTaken: Math.round(stats[0].averageTimeTaken || 0),
      topPerformers: topPerformers.map((p, idx) => ({ studentName: p.studentName, score: p.score, percentage: Math.round(p.percentage * 10) / 10, rank: idx + 1 })),
      scoreDistribution: distribution.map(d => ({ range: d.scoreRange, count: d.count, percentage: Math.round((d.count / (stats[0].completedStudents || 1)) * 100 * 10) / 10 })),
      questionStats: questionStats || []
    };

    // Generate PDF
    const { generateTestReportPdf } = await import('../../lib/pdfGenerator.js');
    const buffer = await generateTestReportPdf(report, test);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(test.title || 'test').replace(/\s+/g, '_')}_report.pdf"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error generating test report PDF:', error);
    return res.status(500).json({ success: false, message: 'Error generating report PDF', error: error.message });
  }
};
