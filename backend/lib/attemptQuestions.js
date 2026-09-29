/*
 * The questions a student actually received in an attempt, with the marks each one is worth.
 *
 * - Randomized (multi-topic) tests have no rows in test_questions: the questions are picked per
 *   attempt and stored in student_test_attempt_questions.
 * - Section marks (marksPerQuestion in tests.section_config) override questions.marks.
 * - Combined parent tests take their questions from their child tests.
 */

const parseConfig = (raw) => {
  if (!raw) return [];
  try {
    const cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(cfg) ? cfg : [];
  } catch {
    return [];
  }
};

// Which section a question belongs to: explicit pick first, then subtopic, topic, subject
function findSection(sections, q) {
  return (
    sections.find(s => Array.isArray(s.questionIds) && s.questionIds.map(Number).includes(Number(q.id))) ||
    sections.find(s => s.subtopicId && Number(s.subtopicId) === Number(q.subtopicId)) ||
    sections.find(s => !s.subtopicId && s.topicId && Number(s.topicId) === Number(q.topicId)) ||
    sections.find(s => !s.subtopicId && !s.topicId && s.subjectId && Number(s.subjectId) === Number(q.subjectId)) ||
    null
  );
}

/**
 * @returns {Promise<{ ids: number[], marks: Map<number, number>, totalMarks: number }>}
 */
export async function getAttemptQuestions(connection, attemptId, testId) {
  const [[test]] = await connection.query(
    'SELECT id, all_subjects, parent_test_id, section_config FROM tests WHERE id = ?',
    [testId]
  );

  let ids = [];
  if (attemptId) {
    const [ordered] = await connection.query(
      'SELECT question_id FROM student_test_attempt_questions WHERE attempt_id = ? ORDER BY position',
      [attemptId]
    );
    ids = ordered.map(r => Number(r.question_id));
  }

  if (ids.length === 0) {
    let sourceIds = [testId];
    if (test && Number(test.all_subjects) === 1 && test.parent_test_id === null) {
      const [children] = await connection.query('SELECT id FROM tests WHERE parent_test_id = ?', [testId]);
      if (children.length > 0) sourceIds = children.map(c => c.id);
    }
    const [rows] = await connection.query(
      `SELECT DISTINCT question_id FROM test_questions WHERE test_id IN (${sourceIds.map(() => '?').join(',')}) ORDER BY question_id`,
      sourceIds
    );
    ids = rows.map(r => Number(r.question_id));
  }

  const marks = new Map();
  if (ids.length === 0) return { ids, marks, totalMarks: 0 };

  const [qRows] = await connection.query(
    `SELECT q.id, q.marks, q.topic_id AS topicId, q.subtopic_id AS subtopicId, tp.subject_id AS subjectId
     FROM questions q LEFT JOIN topics tp ON tp.id = q.topic_id
     WHERE q.id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const sections = parseConfig(test?.section_config);
  for (const q of qRows) {
    const section = sections.length ? findSection(sections, q) : null;
    const m = section && Number(section.marksPerQuestion) > 0 ? Number(section.marksPerQuestion) : Number(q.marks) || 0;
    marks.set(Number(q.id), m);
  }

  const totalMarks = ids.reduce((sum, id) => sum + (marks.get(id) || 0), 0);
  return { ids, marks, totalMarks };
}

// Score with 25% negative marking, matching the existing grading rule
export function scoreAnswers(answerRows, marks) {
  let score = 0;
  for (const a of answerRows) {
    if (!a.selectedOption) continue;
    const m = marks.get(Number(a.questionId)) || 0;
    score += Number(a.isCorrect) === 1 ? m : -(m * 0.25);
  }
  return Math.max(0, Math.round(score * 100) / 100);
}
