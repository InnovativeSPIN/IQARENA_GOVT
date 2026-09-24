import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generateQuestionPaperPdf({
  title,
  questions,
  outPath,
  durationMinutes,
  totalMarks,
  subjectName,
  topicName,
  subtopicName
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    /* ---------------- HEADER ---------------- */
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica')
      .text(
        [
          durationMinutes ? `Duration: ${durationMinutes} Minutes` : '',
          totalMarks ? `Total Marks: ${totalMarks}` : ''
        ].filter(Boolean).join('  |  '),
        { align: 'center' }
      );

    const scope = [subjectName, topicName, subtopicName].filter(Boolean).join(' • ');
    if (scope) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#444').text(scope, { align: 'right' });
      doc.fillColor('black');
    }

    doc.moveDown(1.5);

    /* ---------------- QUESTIONS ---------------- */
    let index = 1;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colGap = 20;
    const colWidth = (pageWidth - colGap) / 2;

    for (const q of questions) {
      if (doc.y > doc.page.height - 200) doc.addPage();

      // Question
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`${index}. ${q.stem || q.question_text || ''}`);
      doc.moveDown(0.6);

      // Options (2-column) — measure and layout per-row so questions don't overlap
      doc.fontSize(11).font('Helvetica');
      const labels = ['A','B','C','D'];
      const options = [q.option_a, q.option_b, q.option_c, q.option_d].map((o, i) => ({ text: o ? `${labels[i]}. ${o}` : null, raw: o }));
      const visible = options.filter(o => o.text !== null);

      // Render options in single-column for clarity
      const optionsList = [q.option_a, q.option_b, q.option_c, q.option_d];
      for (let i = 0; i < optionsList.length; i++) {
        const opt = optionsList[i];
        if (!opt) continue;
        doc.text(`${labels[i]}. ${opt}`);
        doc.moveDown(0.2);
      }

      // single-column answer line for manual writing (adjusted spacing)
      doc.moveDown(0.3);
      const ansLabelX = doc.x;
      const ansLineY = doc.y + 6;
      doc.fontSize(11).text('Ans:', ansLabelX);
      // shorter fixed-length line for writing
      const ansLineLength = 220; // adjust this value to make the line longer/shorter
      doc.lineWidth(0.2).moveTo(ansLabelX + 30, ansLineY).lineTo(ansLabelX + 30 + ansLineLength, ansLineY).stroke();
      doc.moveDown(1.2);

      index++;
    }

    doc.end();
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}

export function generateAnswerKeyPdf({ title, questions, outPath, totalMarks, subjectName, topicName, subtopicName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    doc.fontSize(18).font('Helvetica-Bold').text(`Answer Key - ${title}`, { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica')
      .text(
        [
          totalMarks ? `Total Marks: ${totalMarks}` : '',
        ].filter(Boolean).join('  |  '),
        { align: 'center' }
      );

    const scope = [subjectName, topicName, subtopicName].filter(Boolean).join(' • ');
    if (scope) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#444').text(scope, { align: 'right' });
      doc.fillColor('black');
    }

    doc.moveDown(1);

    let index = 1;
    for (const q of questions) {
      if (doc.y > doc.page.height - 180) doc.addPage();

      doc.fontSize(12).font('Helvetica-Bold').text(`${index}. ${q.stem || q.question_text || ''}`);
      doc.moveDown(0.5);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colGap = 20;
      const colWidth = (pageWidth - colGap) / 2;

      const labels = ['A','B','C','D'];
      const optionsList = [q.option_a, q.option_b, q.option_c, q.option_d];

      // Render options in single-column for clarity
      for (let i = 0; i < optionsList.length; i++) {
        const opt = optionsList[i];
        if (!opt) continue;
        // add a new page if we're near the bottom
        if (doc.y > doc.page.height - 120) doc.addPage();
        doc.text(`${labels[i]}. ${opt}`);
        doc.moveDown(0.2);
      }

      // Show the correct answer
      const ans = String(q.answer || '').toUpperCase().charAt(0) || '-';
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('green').text(`Answer: ${ans}`, { indent: 20 });
      doc.fillColor('black');

      doc.moveDown(1.0);
      index++;
    }

    doc.end();
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}
