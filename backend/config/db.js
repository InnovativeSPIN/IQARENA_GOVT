import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.30.30',
  user: process.env.DB_USER || 'tmhnuiqarena',
  password: process.env.DB_PASSWORD || 'Tmiqarena@123',
  database: process.env.DB_NAME || 'tmhnuiqarena',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'tmhnu',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true,
  
// });

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
