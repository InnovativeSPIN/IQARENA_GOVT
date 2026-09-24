import fs from 'fs';

/* ---------------------------
   QUESTION PAPER GENERATOR
---------------------------- */
export async function generateQuestionDoc({
  title,
  questions,
  outPath,
  durationMinutes,
  totalMarks,
  subjectName,
  topicName,
  subtopicName
}) {
  const header = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>

<style>
  @page { size: A4; margin: 25mm; }

  body {
    font-family: "Times New Roman", serif;
    font-size: 14pt;
    line-height: 1.6;
    color: #000;
  }

  h1 {
    text-align: center;
    font-size: 20pt;
    margin-bottom: 6mm;
  }

  .meta {
    text-align: center;
    font-size: 12pt;
    margin-bottom: 6mm;
  }

  .meta-right {
    text-align: right;
    font-size: 11pt;
    margin-bottom: 8mm;
    color: #333;
  }

  .question {
    margin-bottom: 18mm;
    page-break-inside: avoid;
  }

  .q-text {
    margin-bottom: 6mm;
    font-weight: 500;
  }

  .options {
    margin-top: 4mm;
    margin-bottom: 10mm;
  }

  .opt {
    display: block;
    margin-bottom: 4mm;
  }

  .answer-space {
    border-bottom: 1px solid #000;
    height: 14mm;
    margin-top: 6mm;
    padding-top: 2mm;
  }

</style>
</head>

<body>
<h1>${escapeHtml(title)}</h1>

<div class="meta">
  ${durationMinutes ? `Duration: ${durationMinutes} Minutes` : ''}
  ${durationMinutes && totalMarks ? ' | ' : ''}
  ${totalMarks ? `Total Marks: ${totalMarks}` : ''}
</div>

<div class="meta-right">
  ${[subjectName, topicName, subtopicName].filter(Boolean).join(' • ')}
</div>
`;

  let body = '';
  let index = 1;

  for (const q of questions) {
    const questionText = escapeHtml(q.stem || q.question_text || '');
    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    const labels = ['A', 'B', 'C', 'D'];

    let optionsHtml = '<div class="options">';
    for (let i = 0; i < options.length; i++) {
      if (!options[i]) continue;
      optionsHtml += `<div class="opt">${labels[i]}. ${escapeHtml(options[i])}</div>`;
    }
    optionsHtml += '</div>';

    body += `
<div class="question">
  <div class="q-text"><strong>${index}.</strong> ${questionText}</div>
  ${optionsHtml}
  <div class="answer-space">Ans: _______________</div>
</div>
`;
    index++;
  }

  const footer = `
</body>
</html>`;

  const content = header + body + footer;
  await fs.promises.writeFile(outPath, content, 'utf8');
  return outPath;
}

/* ---------------------------
   ANSWER KEY GENERATOR
---------------------------- */
export async function generateAnswerDoc({
  title,
  questions,
  outPath,
  durationMinutes,
  totalMarks,
  subjectName,
  topicName,
  subtopicName
}) {
  const header = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Answer Key - ${escapeHtml(title)}</title>

<style>
  body {
    font-family: "Times New Roman", serif;
    font-size: 14pt;
    margin: 25mm;
  }

  h1 {
    text-align: center;
    font-size: 20pt;
    margin-bottom: 6mm;
  }

  .meta {
    text-align: center;
    font-size: 12pt;
    margin-bottom: 6mm;
  }

  .meta-right {
    text-align: right;
    font-size: 11pt;
    margin-bottom: 8mm;
    color: #333;
  }

  .question {
    margin-bottom: 10mm;
  }

  .options {
    margin-top: 4mm;
  }

  .opt {
    margin-right: 12mm;
    display: inline-block;
  }

  .correct {
    font-weight: bold;
    text-decoration: underline;
  }

  .answer {
    margin-top: 4mm;
    font-weight: bold;
  }
</style>
</head>

<body>
<h1>Answer Key – ${escapeHtml(title)}</h1>

<div class="meta">
  ${durationMinutes ? `Duration: ${durationMinutes} Minutes` : ''}
  ${durationMinutes && totalMarks ? ' | ' : ''}
  ${totalMarks ? `Total Marks: ${totalMarks}` : ''}
</div>

<div class="meta-right">
  ${[subjectName, topicName, subtopicName].filter(Boolean).join(' • ')}
</div>
`;

  let body = '';
  let index = 1;
  const labels = ['A', 'B', 'C', 'D'];

  for (const q of questions) {
    const questionText = escapeHtml(q.stem || q.question_text || '');
    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    const correct = (q.answer || '').toUpperCase();

    let optionsHtml = '<div class="options">';
    for (let i = 0; i < options.length; i++) {
      if (!options[i]) continue;
      const cls = labels[i] === correct ? 'opt correct' : 'opt';
      optionsHtml += `<span class="${cls}">${labels[i]}. ${escapeHtml(options[i])}</span>`;
    }
    optionsHtml += '</div>';

    body += `
<div class="question">
  <strong>${index}.</strong> ${questionText}
  ${optionsHtml}
  <div class="answer">Answer: ${correct}</div>
</div>
`;
    index++;
  }

  const footer = `
</body>
</html>`;

  const content = header + body + footer;
  await fs.promises.writeFile(outPath, content, 'utf8');
  return outPath;
}

/* ---------------------------
   HTML ESCAPE
---------------------------- */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
