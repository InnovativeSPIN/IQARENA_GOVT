import pool from '../../config/db.js';
import path from 'path';
import fs from 'fs';
import { generateQuestionPaperPdf, generateAnswerKeyPdf } from '../../lib/offlinePaperPdf.js';
import { DEFAULT_QUESTION_MARKS } from '../../lib/constants.js';

export async function createPaper(req, res){
  try{
    const {
      exam_id,
      batch_id,
      title,
      description,
      question_ids = [],
      duration_minutes,
      created_by,
      subject_id,
      topic_id,
      subtopic_id,
      num_questions,
      total_marks: provided_total_marks
    } = req.body;

    if(!exam_id || !title || !created_by) return res.status(400).json({error: 'exam_id, title and created_by are required'});

    // If question_ids not provided, support generating questions by filters (subject/topic/subtopic/num_questions)
    const connection = await pool.getConnection();
    try{
      let selectedQuestions = [];

      if(!Array.isArray(question_ids) || question_ids.length === 0){
        const num = Number(num_questions) || 0;
        if(num > 0){
          // Build candidate query based on provided filters
          let candidateQuery = null;
          let params = [];
          // Always allocate randomly
          const orderClause = 'RAND()';

          if(subtopic_id){
            candidateQuery = `SELECT q.id, q.marks FROM questions q WHERE q.subtopic_id = ? ORDER BY ${orderClause} LIMIT ?`;
            params = [subtopic_id, num];
          } else if(topic_id){
            candidateQuery = `SELECT q.id, q.marks FROM questions q WHERE q.topic_id = ? ORDER BY ${orderClause} LIMIT ?`;
            params = [topic_id, num];
          } else if(subject_id){
            candidateQuery = `SELECT q.id, q.marks FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? ORDER BY ${orderClause} LIMIT ?`;
            params = [subject_id, num];
          } else if(exam_id){
            candidateQuery = `SELECT q.id, q.marks FROM questions q WHERE q.exam_type = ? ORDER BY ${orderClause} LIMIT ?`;
            params = [exam_id, num];
          } else {
            candidateQuery = `SELECT q.id, q.marks FROM questions q ORDER BY ${orderClause} LIMIT ?`;
            params = [num];
          }

          const [candRows] = await connection.query(candidateQuery, params);
          selectedQuestions = candRows.map(r => ({ id: r.id, marks: (typeof r.marks === 'number' && r.marks !== null) ? Number(r.marks) : DEFAULT_QUESTION_MARKS }));
        }
      } else {
        // explicit question ids provided
        const qids = question_ids.map(q => Number(q));
        const [qrows] = await connection.query('SELECT id, marks FROM questions WHERE id IN (?)', [qids]);
        selectedQuestions = qrows.map(r => ({ id: r.id, marks: (typeof r.marks === 'number' && r.marks !== null) ? Number(r.marks) : DEFAULT_QUESTION_MARKS }));
      }

      // Compute totals
      const total_questions = selectedQuestions.length;
      const computed_total_marks = selectedQuestions.reduce((s,q) => s + (q.marks || 0), 0);
      const total_marks = typeof provided_total_marks !== 'undefined' && provided_total_marks !== null ? Number(provided_total_marks) : computed_total_marks;

      // Begin transaction to insert paper and questions
      await connection.beginTransaction();
      const [insert] = await connection.query(`INSERT INTO offline_papers (exam_id, batch_id, subject_id, topic_id, subtopic_id, title, description, total_questions, total_marks, duration_minutes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [exam_id, batch_id || null, subject_id || null, topic_id || null, subtopic_id || null, title, description || null, total_questions, total_marks, duration_minutes || null, created_by]);

      const paperId = insert.insertId;

      for(let i=0;i<selectedQuestions.length;i++){
        const q = selectedQuestions[i];
        const marks = (typeof q.marks === 'number' && q.marks !== null) ? Number(q.marks) : DEFAULT_QUESTION_MARKS;
        await connection.query('INSERT INTO offline_paper_questions (paper_id, question_id, marks, seq) VALUES (?,?,?,?)', [paperId, q.id, marks, i+1]);
      }

      await connection.commit();

      // Return the paper record without exposing internal file paths
      const [paperRows] = await connection.query('SELECT id, exam_id, subject_id, topic_id, subtopic_id, batch_id, parent_paper_id, all_subjects, title, description, total_questions, total_marks, duration_minutes, status, created_by, created_at FROM offline_papers WHERE id=?', [paperId]);
      const paper = paperRows[0];

      connection.release();
      return res.json({paper});
    }catch(err){
      await connection.rollback();
      connection.release();
      throw err;
    }
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
}

export async function getPapers(req, res){
  try{
    // support filtering via query params: exam_id, subject_id, batch_id, status, created_by, q (search title)
    const { exam_id, subject_id, batch_id, status, created_by, q, limit, offset } = req.query;
    const where = [];
    const params = [];
    if(exam_id) { where.push('exam_id = ?'); params.push(exam_id); }
    if(subject_id) { where.push('subject_id = ?'); params.push(subject_id); }
    if(batch_id) { where.push('batch_id = ?'); params.push(batch_id); }
    if(status) { where.push('status = ?'); params.push(status); }
    if(created_by) { where.push('created_by = ?'); params.push(created_by); }
    if(q) { where.push('title LIKE ?'); params.push(`%${q}%`); }

    let sql = 'SELECT id, exam_id, subject_id, topic_id, subtopic_id, batch_id, parent_paper_id, all_subjects, title, description, total_questions, total_marks, duration_minutes, status, created_by, created_at FROM offline_papers';
    if(where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    if(limit) sql += ' LIMIT ' + Number(limit);
    if(offset) sql += ' OFFSET ' + Number(offset);

    const [rows] = await pool.query(sql, params);
    res.json({papers: rows});
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
}

export async function getPaperById(req, res){
  try{
    const {id} = req.params;
    const [paperRows] = await pool.query('SELECT id, exam_id, subject_id, topic_id, subtopic_id, batch_id, parent_paper_id, all_subjects, title, description, total_questions, total_marks, duration_minutes, status, created_by, created_at FROM offline_papers WHERE id=?', [id]);
    const paper = paperRows[0];
    if(!paper) return res.status(404).json({error: 'Not found'});
    const [questions] = await pool.query('SELECT oq.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks, q.answer FROM offline_paper_questions oq JOIN questions q ON q.id = oq.question_id WHERE oq.paper_id=? ORDER BY oq.seq', [id]);

    // Indicate whether generated files exist (without exposing paths)
    const outDir = path.join(process.cwd(), 'uploads', 'offline_papers', String(id));
    const filesExist = {
      questionPdf: fs.existsSync(path.join(outDir, `paper_${id}_questions.pdf`)),
      answerPdf: fs.existsSync(path.join(outDir, `paper_${id}_answers.pdf`)),
      questionDoc: fs.existsSync(path.join(outDir, `paper_${id}_questions.doc`)),
      answerDoc: fs.existsSync(path.join(outDir, `paper_${id}_answers.doc`))
    };

    res.json({paper, questions, filesExist});
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
}

export async function generatePaper(req, res){
  try{
    const {id} = req.params;
    const [paperRows] = await pool.query('SELECT id, exam_id, subject_id, topic_id, subtopic_id, batch_id, parent_paper_id, all_subjects, title, description, total_questions, total_marks, duration_minutes, status, created_by, question_pdf_path, answer_pdf_path, question_docx_path, answer_docx_path, created_at FROM offline_papers WHERE id=?', [id]);
    const paper = paperRows[0];
    if(!paper) return res.status(404).json({error: 'Not found'});

    const [questions] = await pool.query('SELECT oq.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks, q.answer FROM offline_paper_questions oq JOIN questions q ON q.id = oq.question_id WHERE oq.paper_id=? ORDER BY oq.seq', [id]);

    // ensure dir
    const outDir = path.join(process.cwd(), 'uploads', 'offline_papers', String(id));
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive: true});

    const questionPdfPath = path.join(outDir, `paper_${id}_questions.pdf`);
    const answerPdfPath = path.join(outDir, `paper_${id}_answers.pdf`);
    const questionDocPath = path.join(outDir, `paper_${id}_questions.doc`);
    const answerDocPath = path.join(outDir, `paper_${id}_answers.doc`);

    // Fetch human-readable names for subject/topic/subtopic if available
    let subjectName = null, topicName = null, subtopicName = null;
    try {
      if (paper.subject_id) {
        const [sr] = await pool.query('SELECT name FROM subjects WHERE id=?', [paper.subject_id]);
        subjectName = sr && sr[0] ? sr[0].name : null;
      }
      if (paper.topic_id) {
        // topics table uses column `topic_name`
        const [tr] = await pool.query('SELECT topic_name as name FROM topics WHERE id=?', [paper.topic_id]);
        topicName = tr && tr[0] ? tr[0].name : null;
      }
      if (paper.subtopic_id) {
        // subtopics table uses column `subtopic_name`
        const [str] = await pool.query('SELECT subtopic_name as name FROM subtopics WHERE id=?', [paper.subtopic_id]);
        subtopicName = str && str[0] ? str[0].name : null;
      }
    } catch (err) {
      console.warn('Failed to fetch subject/topic names', err.message);
    }

    await generateQuestionPaperPdf({title: paper.title, questions, outPath: questionPdfPath, durationMinutes: paper.duration_minutes, totalMarks: paper.total_marks, subjectName, topicName, subtopicName});
    await generateAnswerKeyPdf({title: paper.title, questions, outPath: answerPdfPath, totalMarks: paper.total_marks, subjectName, topicName, subtopicName});

    // Generate simple .doc (HTML) versions as Word-friendly files
    const { generateQuestionDoc, generateAnswerDoc } = await import('../../lib/offlinePaperDoc.js');
    await generateQuestionDoc({title: paper.title, questions, outPath: questionDocPath, durationMinutes: paper.duration_minutes, totalMarks: paper.total_marks, subjectName, topicName, subtopicName});
    await generateAnswerDoc({title: paper.title, questions, outPath: answerDocPath, durationMinutes: paper.duration_minutes, totalMarks: paper.total_marks, subjectName, topicName, subtopicName});

    // Do NOT persist file paths to the database. Only update status to indicate generation complete.
    try {
      await pool.query('UPDATE offline_papers SET status=? WHERE id=?', ['final', id]);
    } catch (err) {
      console.warn('Warning: failed to update offline_papers status (non-fatal):', err.message);
    }

    // Return download endpoints (no file system paths)
    const questionUrl = `${req.protocol}://${req.get('host')}/api/admin/offline-papers/${id}/download/question`;
    const answerUrl = `${req.protocol}://${req.get('host')}/api/admin/offline-papers/${id}/download/answer`;
    const questionDocUrl = `${req.protocol}://${req.get('host')}/api/admin/offline-papers/${id}/download/question_doc`;
    const answerDocUrl = `${req.protocol}://${req.get('host')}/api/admin/offline-papers/${id}/download/answer_doc`;

    res.json({ questionUrl, answerUrl, questionDocUrl, answerDocUrl });
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
}

/*
  POST /api/admin/offline-papers/:id/preview-generate
  Body: { num_questions?: number }
  Simulate allocation for the given paper, generate preview question PDF/DOC files (not persisted), and return selected questions + preview file urls.
*/
export async function previewGeneratePaper(req, res){
  try{
    const { id } = req.params;
    const { num_questions } = req.body || {};

    const [paperRows] = await pool.query('SELECT id, exam_id, subject_id, topic_id, subtopic_id, batch_id, title, description, total_questions, total_marks, duration_minutes FROM offline_papers WHERE id=?', [id]);
    const paper = paperRows[0];
    if(!paper) return res.status(404).json({ error: 'Not found' });

    // fetch current allocated questions for this paper (ordered by seq)
    const [currentRows] = await pool.query('SELECT oq.question_id, oq.marks, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.answer FROM offline_paper_questions oq JOIN questions q ON q.id = oq.question_id WHERE oq.paper_id=? ORDER BY oq.seq', [id]);
    const currentIds = currentRows.map(r => r.question_id);

    let desired = (typeof num_questions !== 'undefined' && num_questions !== null) ? Number(num_questions) : (paper.total_questions || currentRows.length);
    desired = Math.max(0, Number.isFinite(desired) ? desired : 0);

    let selectedIds = [];

    if(desired === currentIds.length){
      selectedIds = currentIds.slice();
    } else if(desired < currentIds.length){
      // reduce: keep the first `desired` questions (by seq)
      selectedIds = currentIds.slice(0, desired);
    } else {
      // increase: keep existing, then randomly select additional ones from scope
      selectedIds = currentIds.slice();
      const need = desired - selectedIds.length;

      // Build candidate query based on most specific scope
      let candidateQuery = null;
      let params = [];
      const excludeClause = selectedIds.length ? ` AND q.id NOT IN (${Array.from(selectedIds).map(()=>'?').join(',')})` : '';
      if(paper.subtopic_id){
        candidateQuery = `SELECT q.id FROM questions q WHERE q.subtopic_id = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
        params = [paper.subtopic_id, ...selectedIds, need].filter(v => typeof v !== 'undefined');
      } else if(paper.topic_id){
        candidateQuery = `SELECT q.id FROM questions q WHERE q.topic_id = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
        params = [paper.topic_id, ...selectedIds, need].filter(v => typeof v !== 'undefined');
      } else if(paper.subject_id){
        candidateQuery = `SELECT q.id FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
        params = [paper.subject_id, ...selectedIds, need].filter(v => typeof v !== 'undefined');
      } else if(paper.exam_id){
        candidateQuery = `SELECT q.id FROM questions q WHERE q.exam_type = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
        params = [paper.exam_id, ...selectedIds, need].filter(v => typeof v !== 'undefined');
      } else {
        candidateQuery = `SELECT q.id FROM questions q WHERE 1=1 ${excludeClause} ORDER BY RAND() LIMIT ?`;
        params = [...selectedIds, need].filter(v => typeof v !== 'undefined');
      }

      const [candRows] = await pool.query(candidateQuery, params);
      const addIds = candRows.map(r => r.id);
      if(addIds.length < need){
        // not enough questions available; still return what we have but warn
        selectedIds = selectedIds.concat(addIds);
      } else {
        selectedIds = selectedIds.concat(addIds);
      }
    }

    if(selectedIds.length === 0){
      return res.status(400).json({ error: 'No questions selected / available for preview' });
    }

    // Fetch full question objects for selectedIds in same order
    const placeholders = selectedIds.map(()=>'?').join(',');
    const [qrows] = await pool.query(`SELECT id, question_text, option_a, option_b, option_c, option_d, marks, answer FROM questions WHERE id IN (${placeholders})`, selectedIds);
    // Order to match selectedIds
    const qMap = new Map(qrows.map(q => [q.id, q]));
    const selectedQuestions = selectedIds.map(id => qMap.get(id)).filter(Boolean);

    // compute total marks with default
    const totalMarks = selectedQuestions.reduce((s, q) => s + ((typeof q.marks === 'number' && q.marks !== null) ? Number(q.marks) : DEFAULT_QUESTION_MARKS), 0);

    // ensure outDir exists
    const outDir = path.join(process.cwd(), 'uploads', 'offline_papers', String(id));
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const qPdfPath = path.join(outDir, `paper_${id}_questions_preview.pdf`);
    const qDocPath = path.join(outDir, `paper_${id}_questions_preview.doc`);

    // generate preview files
    await generateQuestionPaperPdf({ title: paper.title, questions: selectedQuestions, outPath: qPdfPath, durationMinutes: paper.duration_minutes, totalMarks, subjectName: null, topicName: null, subtopicName: null });
    const { generateQuestionDoc } = await import('../../lib/offlinePaperDoc.js');
    await generateQuestionDoc({ title: paper.title, questions: selectedQuestions, outPath: qDocPath, durationMinutes: paper.duration_minutes, totalMarks, subjectName: null, topicName: null, subtopicName: null });

    const questionPdfUrl = `${req.protocol}://${req.get('host')}/api/admin/offline-papers/${id}/download/preview/question`;
    const questionDocUrl = `${req.protocol}://${req.get('host')}/api/admin/offline-papers/${id}/download/preview/question_doc`;

    res.json({ selectedQuestions, totalQuestions: selectedQuestions.length, totalMarks, questionPdfUrl, questionDocUrl });

  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadFile(req, res){
  try{
    const {id, type} = req.params; // type = question|answer|question_doc|answer_doc

    // Compute the expected file paths based on convention; do NOT rely on DB-stored paths
    const outDir = path.join(process.cwd(), 'uploads', 'offline_papers', String(id));
    let filename = null;
    if(type === 'question') filename = `paper_${id}_questions.pdf`;
    else if(type === 'answer') filename = `paper_${id}_answers.pdf`;
    else if(type === 'question_doc') filename = `paper_${id}_questions.doc`;
    else if(type === 'answer_doc') filename = `paper_${id}_answers.doc`;
    else return res.status(400).json({error: 'Invalid type'});

    const filePath = path.join(outDir, filename);
    if(!fs.existsSync(filePath)) return res.status(404).json({error: 'File not generated'});

    // If serving .doc files (our HTML docs), set content-type so browsers can render them inline
    if(filename.endsWith('.doc') || filename.endsWith('.docx')){
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    }
    res.sendFile(path.resolve(filePath));
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
}

// Download preview files generated temporarily by preview-generate
export async function downloadPreviewFile(req, res){
  try{
    const { id, type } = req.params; // type = question | question_doc
    const outDir = path.join(process.cwd(), 'uploads', 'offline_papers', String(id));
    let filename = null;
    if(type === 'question') filename = `paper_${id}_questions_preview.pdf`;
    else if(type === 'question_doc') filename = `paper_${id}_questions_preview.doc`;
    else return res.status(400).json({error: 'Invalid preview type'});

    const filePath = path.join(outDir, filename);
    if(!fs.existsSync(filePath)) return res.status(404).json({error: 'File not generated'});

    if(filename.endsWith('.doc') || filename.endsWith('.docx')){
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    }
    res.sendFile(path.resolve(filePath));
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
}


// Update paper metadata and adjust allocations when total_questions changes
export async function resetAllocations(req, res){
  try{
    const { id } = req.params;
    // Delete allocations for the paper
    await pool.query('DELETE FROM offline_paper_questions WHERE paper_id = ?', [id]);
    // Reset totals on paper
    await pool.query('UPDATE offline_papers SET total_questions = 0, total_marks = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  }catch(err){
    console.error('Reset allocations error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePaper(req, res){
  const connection = await pool.getConnection();
  try{
    await connection.beginTransaction();
    const {id} = req.params;
    const { title, description, total_marks, duration_minutes, status, total_questions } = req.body;

    // Fetch current paper to detect changes and scope
    const [oldRows] = await connection.query('SELECT * FROM offline_papers WHERE id=? FOR UPDATE', [id]);
    if(!oldRows || oldRows.length === 0){ await connection.rollback(); connection.release(); return res.status(404).json({ error: 'Not found' }); }
    const oldPaper = oldRows[0];
    const oldTotal = Number(oldPaper.total_questions) || 0;

    const fields = [];
    const params = [];
    if(typeof title !== 'undefined') { fields.push('title = ?'); params.push(title); }
    if(typeof description !== 'undefined') { fields.push('description = ?'); params.push(description); }
    if(typeof total_marks !== 'undefined') { fields.push('total_marks = ?'); params.push(total_marks); }
    if(typeof duration_minutes !== 'undefined') { fields.push('duration_minutes = ?'); params.push(duration_minutes); }
    if(typeof total_questions !== 'undefined') { fields.push('total_questions = ?'); params.push(total_questions); }
    if(typeof status !== 'undefined') { fields.push('status = ?'); params.push(status); }
    // Allow updating scope (subject/topic/subtopic)
    if(typeof req.body.subject_id !== 'undefined') { fields.push('subject_id = ?'); params.push(req.body.subject_id); }
    if(typeof req.body.topic_id !== 'undefined') { fields.push('topic_id = ?'); params.push(req.body.topic_id); }
    if(typeof req.body.subtopic_id !== 'undefined') { fields.push('subtopic_id = ?'); params.push(req.body.subtopic_id); }

    if(fields.length === 0){ await connection.rollback(); connection.release(); return res.status(400).json({ error: 'No fields to update' }); }

    params.push(id);
    const sql = `UPDATE offline_papers SET ${fields.join(', ')} WHERE id = ?`;
    await connection.query(sql, params);

    // If total_questions changed, adjust allocations
    if(typeof total_questions !== 'undefined'){
      const newTotal = Number(total_questions) || 0;
      if(newTotal > oldTotal){
        // Need to allocate additional questions
        const need = newTotal - oldTotal;

        // Determine most specific scope (use updated values if provided, else old)
        const scope = {
          subtopic_id: (req.body.subtopic_id !== undefined ? req.body.subtopic_id : oldPaper.subtopic_id) || null,
          topic_id: (req.body.topic_id !== undefined ? req.body.topic_id : oldPaper.topic_id) || null,
          subject_id: (req.body.subject_id !== undefined ? req.body.subject_id : oldPaper.subject_id) || null,
          exam_id: (req.body.exam_id !== undefined ? req.body.exam_id : oldPaper.exam_id) || null
        };

        // Get already allocated question ids
        const [allocatedRows] = await connection.query('SELECT question_id FROM offline_paper_questions WHERE paper_id=?', [id]);
        const allocatedSet = new Set(allocatedRows.map(r => r.question_id));

        // Build candidate query excluding allocated
        let candidateSql = null;
        let candidateParams = [];
        const excludeClause = allocatedSet.size ? ` AND q.id NOT IN (${Array.from(allocatedSet).map(() => '?').join(',')})` : '';
        if(allocatedSet.size) candidateParams.push(...Array.from(allocatedSet));

        if(scope.subtopic_id){
          candidateSql = `SELECT q.id, q.marks FROM questions q WHERE q.subtopic_id = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
          candidateParams.unshift(scope.subtopic_id);
          candidateParams.push(need);
        } else if(scope.topic_id){
          candidateSql = `SELECT q.id, q.marks FROM questions q WHERE q.topic_id = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
          candidateParams.unshift(scope.topic_id);
          candidateParams.push(need);
        } else if(scope.subject_id){
          candidateSql = `SELECT q.id, q.marks FROM questions q JOIN topics t ON q.topic_id = t.id WHERE t.subject_id = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
          candidateParams.unshift(scope.subject_id);
          candidateParams.push(need);
        } else if(scope.exam_id){
          candidateSql = `SELECT q.id, q.marks FROM questions q WHERE q.exam_type = ? ${excludeClause} ORDER BY RAND() LIMIT ?`;
          candidateParams.unshift(scope.exam_id);
          candidateParams.push(need);
        } else {
          // No scope available
          await connection.rollback(); connection.release();
          return res.status(400).json({ error: 'Cannot allocate without scope (exam/subject/topic/subtopic)' });
        }

        const [cands] = await connection.query(candidateSql, candidateParams);
        if(!cands || cands.length < need){
          await connection.rollback(); connection.release();
          return res.status(400).json({ error: `Not enough questions available to allocate (${cands.length || 0} available, ${need} required)` });
        }

        // Get current max seq
        const [seqRows] = await connection.query('SELECT MAX(seq) as maxSeq FROM offline_paper_questions WHERE paper_id=?', [id]);
        let nextSeq = (seqRows && seqRows[0] && seqRows[0].maxSeq) ? Number(seqRows[0].maxSeq) + 1 : 1;

        // Insert allocations and sum marks
        let addedMarks = 0;
        const insertValues = [];
        for(const c of cands){
          insertValues.push([id, c.id, c.marks || 0, nextSeq]);
          addedMarks += Number(c.marks || 0);
          nextSeq += 1;
        }
        await connection.query('INSERT INTO offline_paper_questions (paper_id, question_id, marks, seq) VALUES ?', [insertValues]);

        // Update total_marks in paper
        await connection.query('UPDATE offline_papers SET total_marks = COALESCE(total_marks,0) + ? WHERE id = ?', [addedMarks, id]);

      } else if(newTotal < oldTotal){
        // Need to remove allocated questions (remove from highest seq down)
        const removeCount = oldTotal - newTotal;
        // Select question rows to remove
        const [toRemoveRows] = await connection.query('SELECT id, question_id, marks FROM offline_paper_questions WHERE paper_id=? ORDER BY seq DESC LIMIT ?', [id, removeCount]);
        if(toRemoveRows && toRemoveRows.length > 0){
          const idsToRemove = toRemoveRows.map(r => r.id);
          const removedMarks = toRemoveRows.reduce((s, r) => s + (r.marks || 0), 0);
          await connection.query('DELETE FROM offline_paper_questions WHERE id IN (?)', [idsToRemove]);

          // Re-sequence remaining questions
          const [remaining] = await connection.query('SELECT id FROM offline_paper_questions WHERE paper_id=? ORDER BY seq', [id]);
          for(let i=0;i<remaining.length;i++){
            await connection.query('UPDATE offline_paper_questions SET seq=? WHERE id=?', [i+1, remaining[i].id]);
          }

          // Update total_marks
          await connection.query('UPDATE offline_papers SET total_marks = GREATEST(COALESCE(total_marks,0) - ?, 0) WHERE id = ?', [removedMarks, id]);
        }
      }
    }

    // Commit and return latest paper
    await connection.commit();
    connection.release();

    const [paperRows] = await pool.query('SELECT id, exam_id, subject_id, topic_id, subtopic_id, batch_id, parent_paper_id, all_subjects, title, description, total_questions, total_marks, duration_minutes, status, created_by, created_at FROM offline_papers WHERE id=?', [id]);
    const paper = paperRows[0];
    res.json({paper});
  }catch(err){
    console.error(err);
    try{ await connection.rollback(); connection.release(); }catch(e){}
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete paper and its questions (FK cascade should handle questions)
export async function deletePaper(req, res){
  try{
    const {id} = req.params;
    const [paperRows] = await pool.query('SELECT id FROM offline_papers WHERE id=?', [id]);
    if(!paperRows || paperRows.length === 0) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM offline_papers WHERE id=?', [id]);
    res.json({ success: true });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}


// Utility to escape CSV fields
function escapeCsv(val){
  if(val === null || typeof val === 'undefined') return '';
  const s = String(val);
  if(s.includes(',') || s.includes('\n') || s.includes('"')){
    return '"' + s.replace(/"/g,'""') + '"';
  }
  return s;
}

// Preview selection for paper creation (returns selected questions and total marks)
export async function previewPaper(req, res){
  try{
    const { exam_id, subject_id, topic_id, subtopic_id, num_questions } = req.body;
    const num = Number(num_questions) || 0;
    if(!exam_id || num <= 0) return res.status(400).json({ error: 'exam_id and num_questions are required' });

    // Build candidate query and always randomize
    let candidateQuery = null;
    let params = [];
    const orderClause = 'RAND()';

    if(subtopic_id){
      candidateQuery = `SELECT q.id, q.question_text as text, q.marks, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation, q.use_img FROM questions q WHERE q.subtopic_id = ? ORDER BY ${orderClause} LIMIT ?`;
      params = [subtopic_id, num];
    } else if(topic_id){
      candidateQuery = `SELECT q.id, q.question_text as text, q.marks, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation, q.use_img FROM questions q WHERE q.topic_id = ? ORDER BY ${orderClause} LIMIT ?`;
      params = [topic_id, num];
    } else if(subject_id){
      candidateQuery = `SELECT q.id, q.question_text as text, q.marks, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation, q.use_img FROM questions q JOIN topics top ON q.topic_id = top.id WHERE top.subject_id = ? ORDER BY ${orderClause} LIMIT ?`;
      params = [subject_id, num];
    } else {
      candidateQuery = `SELECT q.id, q.question_text as text, q.marks, q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation, q.use_img FROM questions q WHERE q.exam_type = ? ORDER BY ${orderClause} LIMIT ?`;
      params = [exam_id, num];
    }

    const [rows] = await pool.query(candidateQuery, params);
    // Default per-question marks to 4 when missing to match client-side behavior
    const total_marks = rows.reduce((s, q) => s + (typeof q.marks === 'number' && q.marks !== null ? Number(q.marks) : 4), 0);

    res.json({ questions: rows, total_questions: rows.length, total_marks });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}


export default {
  createPaper,
  getPapers,
  getPaperById,
  resetAllocations,
  updatePaper,
  deletePaper,
  generatePaper,
  downloadFile,
  previewPaper,
  previewGeneratePaper,
  downloadPreviewFile
};
