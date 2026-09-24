import PDFDocument from 'pdfkit';

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

export async function generateStudentReportPdf(test, student, questions) {
  const doc = new PDFDocument({ margin: 50 });

  // header
  doc.fontSize(18).text(test.title || 'Test Report', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Student: ${student.name} (${student.rollNo || ''})`);
  doc.text(`Test: ${test.title} | Subject: ${test.subjectName || ''} ${test.topicName ? ' - ' + test.topicName : ''}`);
  doc.text(`Questions: ${test.questionCount || 0} • Duration: ${test.suggestedDuration || 0} mins`);
  doc.moveDown(0.5);

  doc.fontSize(12).text('Questions:', { underline: true });
  doc.moveDown(0.5);

  questions.forEach((q, idx) => {
    doc.fontSize(11).text(`${idx + 1}. ${q.question_text}`);
    const opts = ['option_a','option_b','option_c','option_d'];
    opts.forEach((k, i) => {
      const label = String.fromCharCode(65 + i);
      const val = q[k] || '';
      const isSelected = q.selected_option === label;
      const isCorrect = q.answer === label;
      const prefix = isCorrect ? '✔️' : isSelected ? '➡️' : '  ';
      doc.fontSize(10).text(`${prefix} ${label}. ${val}`);
    });
    // selected answer and correct answer, explanation
    doc.fontSize(10).fillColor('green').text(`Correct: ${q.answer}`, { continued: true }).fillColor('black');
    doc.text(`  Selected: ${q.selected_option || '-'}`);
    if (q.explanation) {
      doc.fontSize(9).fillColor('gray').text(`Explanation: ${q.explanation}`);
      doc.fillColor('black');
    }
    doc.moveDown(0.5);
  });

  doc.end();

  const buffer = await streamToBuffer(doc);
  return buffer;
}

export async function generateTestReportPdf(report, testInfo) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Header
  doc.fillColor('#0f172a');
  doc.fontSize(20).text(testInfo.title || `Test Report - ${report.testId}`, { align: 'left' });
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor('#475569').text(`${testInfo.subject || ''} • Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(0.5);

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e6e7eb').stroke();
  doc.moveDown(0.5);

  // Overview cards
  const startX = doc.x;
  const colWidth = 125;
  const gap = 15;

  const card = (title, value, desc, x) => {
    doc.rect(x, doc.y, colWidth, 54).fillOpacity(0.03).fillAndStroke('#000000', '#e6e7eb');
    doc.fillColor('#0f172a').fontSize(9).text(title, x + 8, doc.y + 6);
    doc.fontSize(18).text(value, { align: 'left', continued: false, lineBreak: false, width: colWidth - 16 });
    doc.fontSize(9).fillColor('#6b7280').text(desc, { width: colWidth - 16 });
  };

  const overviewY = doc.y + 6;
  card('Total Students', report.totalStudents, 'Assigned', startX);
  card('Attempted', report.attemptedStudents, 'Started attempts', startX + colWidth + gap);
  card('Completed', report.completedStudents, 'Finished tests', startX + (colWidth + gap) * 2);
  card('Avg Score', `${report.averageScore} (${report.averagePercentage}%)`, 'Average', startX + (colWidth + gap) * 3);
  doc.moveDown(4);

  // Score Distribution with bars
  doc.fontSize(12).fillColor('#0f172a').text('Score Distribution', { underline: true });
  doc.moveDown(0.25);
  if (report.scoreDistribution && report.scoreDistribution.length > 0) {
    const maxCount = Math.max(...report.scoreDistribution.map(d => d.count), 1);
    report.scoreDistribution.forEach(d => {
      const y = doc.y;
      doc.fontSize(10).fillColor('#0f172a').text(d.range, { continued: true, width: 110 });
      const barX = doc.x + 10;
      const barWidth = Math.round((d.count / maxCount) * 260);
      doc.rect(barX, y + 3, barWidth, 8).fill('#60a5fa');
      doc.fillColor('#6b7280').fontSize(9).text(`${d.count} (${d.percentage}%)`, barX + barWidth + 8, y);
      doc.moveDown(1.2);
    });
  } else {
    doc.fontSize(10).fillColor('#6b7280').text('No distribution data');
  }

  doc.moveDown(0.5);

  // Top performers table
  doc.fontSize(12).fillColor('#0f172a').text('Top Performers', { underline: true });
  doc.moveDown(0.25);
  if (report.topPerformers && report.topPerformers.length > 0) {
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#6b7280').text('Rank', 50, tableTop);
    doc.text('Student', 100, tableTop);
    doc.text('Score', 380, tableTop);
    doc.text('Percentage', 450, tableTop);
    doc.moveDown(0.6);

    report.topPerformers.forEach(p => {
      doc.fontSize(10).fillColor('#0f172a').text(p.rank.toString(), 50, doc.y);
      doc.text(p.studentName, 100, doc.y);
      doc.text(String(p.score), 380, doc.y);
      doc.text(`${p.percentage}%`, 450, doc.y);
      doc.moveDown(0.8);
    });
  } else {
    doc.fontSize(10).fillColor('#6b7280').text('No top performers yet');
  }

  // Question level stats (if present) on new page
  if (report.questionStats && report.questionStats.length > 0) {
    doc.addPage();
    doc.fontSize(14).fillColor('#0f172a').text('Question Level Stats', { underline: true });
    doc.moveDown(0.5);

    report.questionStats.forEach((q, idx) => {
      if (doc.y > 720) doc.addPage();
      doc.fontSize(10).fillColor('#0f172a').text(`${idx + 1}. ${q.questionText}`);
      doc.fontSize(9).fillColor('#6b7280').text(`Attempts: ${q.totalAttempts} • Correct: ${q.correctAttempts} • Wrong: ${q.wrongAttempts} • Skipped: ${q.skipped} • Accuracy: ${Math.round(q.accuracy)}%`);
      doc.moveDown(0.6);
    });
  }

  // Footer with generation time
  const pages = doc.bufferedPageRange ? doc.bufferedPageRange() : null;
  doc.fontSize(9).fillColor('#94a3b8').text(`Generated on ${new Date().toLocaleString()}`, 50, 780, { align: 'left' });

  doc.end();
  const buffer = await streamToBuffer(doc);
  return buffer;
}

export default { generateStudentReportPdf };
