import { getAttemptQuestions } from './attemptQuestions.js';

/**
 * A student's answer sheet for one test: every question they received, the option they chose,
 * the correct option and whether they got it right. Used by the faculty and admin reports.
 * @returns {Promise<null | { attempt, questions }>} null when the student has not attempted the test
 */
export async function getAnswerSheet(connection, userId, testId) {
  const [[attempt]] = await connection.query(
    `SELECT id, status, score, time_taken AS timeTaken, completed_at AS completedAt
     FROM student_test_attempts WHERE student_id = ? AND test_id = ?
     ORDER BY id DESC LIMIT 1`,
    [userId, testId]
  );
  if (!attempt) return null;

  const set = await getAttemptQuestions(connection, attempt.id, testId);
  if (set.ids.length === 0) return { attempt: { ...attempt, score: Number(attempt.score), totalMarks: 0 }, questions: [] };

  const idList = set.ids.map(() => '?').join(',');
  const [rows] = await connection.query(
    `SELECT q.id, q.question_text AS text, q.question_ta AS textTa,
            q.option_a AS optionA, q.option_b AS optionB, q.option_c AS optionC, q.option_d AS optionD,
            q.answer AS correctAnswer, sa.selected_option AS selectedOption, sa.is_correct AS isCorrect,
            tp.topic_name AS topic
     FROM questions q
     LEFT JOIN student_answers sa ON sa.attempt_id = ? AND sa.question_id = q.id
     LEFT JOIN topics tp ON tp.id = q.topic_id
     WHERE q.id IN (${idList})
     ORDER BY FIELD(q.id, ${idList})`,
    [attempt.id, ...set.ids, ...set.ids]
  );

  return {
    attempt: { ...attempt, score: Number(attempt.score), totalMarks: set.totalMarks },
    questions: rows.map(r => ({
      ...r,
      marks: set.marks.get(Number(r.id)) || 0,
      status: !r.selectedOption ? 'skipped' : Number(r.isCorrect) === 1 ? 'correct' : 'wrong',
    })),
  };
}
