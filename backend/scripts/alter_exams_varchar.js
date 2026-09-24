#!/usr/bin/env node
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';

// Load environment from backend/.env
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const {
  DB_HOST = '127.0.0.1',
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error('Missing DB credentials in backend/.env. Aborting.');
  process.exit(1);
}

async function run() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  try {
    console.log('Connected to database', DB_NAME, 'on', DB_HOST);

    const alterSql = `ALTER TABLE exams
      MODIFY COLUMN name VARCHAR(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL;`;

    console.log('Running ALTER TABLE to change exams.name to VARCHAR(255)...');
    const [result] = await conn.execute(alterSql);
    console.log('ALTER result:', result);
    console.log('Done. Verify with SHOW CREATE TABLE exams;');
  } catch (err) {
    console.error('Error running ALTER TABLE:', err.message || err);
    process.exitCode = 2;
  } finally {
    await conn.end();
  }
}

run();
