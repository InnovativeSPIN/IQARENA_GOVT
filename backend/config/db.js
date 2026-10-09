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
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tmhnuiqarena',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  // Ensure Tamil & Unicode text is handled correctly
});

// Test the connection
pool.getConnection()
  .then((connection) => {
    console.log('✓ Database connected successfully');
    connection.release();
  })
  .catch((error) => {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  });

export default pool;
