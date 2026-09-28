import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function updatePassword() {
  try {
    const connection = await pool.getConnection();
    const hashedPassword = await bcrypt.hash('102030', 10);
    await connection.execute('UPDATE users SET password = ? WHERE userid = ?', [hashedPassword, '2005']);
    console.log('Successfully updated password for 2005 to 102030');
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updatePassword();
