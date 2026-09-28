import pool from '../../config/db.js';

async function verify() {
  const conn = await pool.getConnection();
  const tables = ['schools', 'school_students', 'school_test_assignments'];
  for (const t of tables) {
    const [[row]] = await conn.query(`SHOW TABLES LIKE '${t}'`);
    console.log(`Table '${t}':`, row ? '✅ EXISTS' : '❌ MISSING');
  }

  // Check exams
  const [exams] = await conn.query(`SELECT name FROM exams WHERE name IN ('NMMS','TRUST')`);
  console.log('NMMS/TRUST exams:', exams.length > 0 ? exams.map(e => e.name).join(', ') + ' ✅' : '❌ MISSING');

  // Check columns
  const [testCols] = await conn.query(`SHOW COLUMNS FROM tests LIKE 'school_id'`);
  console.log("tests.school_id:", testCols.length > 0 ? '✅ EXISTS' : '❌ MISSING');

  const [atCols] = await conn.query(`SHOW COLUMNS FROM student_test_attempts LIKE 'school_student_id'`);
  console.log("student_test_attempts.school_student_id:", atCols.length > 0 ? '✅ EXISTS' : '❌ MISSING');

  conn.release();
  process.exit(0);
}

verify().catch(e => { console.error(e); process.exit(1); });
