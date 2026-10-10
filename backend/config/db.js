import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
console.log('DB config loaded as:', { host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, db: process.env.DB_NAME });

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || '127.0.0.1',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || 'root',
//   database: process.env.DB_NAME || 'tmhnuiqarena',
//   port: 3306,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true
// });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : (process.env.DB_PASSWORD === '' ? '' : undefined),
  database: process.env.DB_NAME || 'tmhnuiqarena',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  // Ensure Tamil & Unicode text is handled correctly
});

// Test the connection
const testConnection = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✓ Database connected successfully');
      connection.release();
      return;
    } catch (error) {
      console.warn(`Database connection attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  console.error('✗ Unable to connect to MySQL database after multiple attempts.');
};

testConnection();

export default pool;
