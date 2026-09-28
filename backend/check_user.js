import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function check() {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute('SELECT * FROM users WHERE userid = ?', ['2005']);
    console.log('User:', users[0]);
    if (users.length > 0) {
      console.log('Has password:', !!users[0].password);
      if (users[0].password) {
          const isMatch = await bcrypt.compare('102030', users[0].password);
          console.log('Password match:', isMatch);
      }
    }
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
