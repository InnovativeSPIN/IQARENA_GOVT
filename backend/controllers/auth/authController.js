
import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Get user details by user ID
export const getUserById = async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, name, phone FROM users WHERE userid = ?',
      [userId]
    );
    connection.release();
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = users[0];
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
};

// Register user with password (signup)
export const registerUser = async (req, res) => {
  const { userId, password, name, phone } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'User ID and password are required' });
  }

  if (typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [users] = await connection.execute(
      'SELECT id, name, phone, password FROM users WHERE userid = ?',
      [userId]
    );

    // If user does not exist, create a new STUDENT user
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const roleId = 3; // STUDENT
      const [result] = await connection.execute(
        'INSERT INTO users (userid, role_id, name, phone, password, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, roleId, name || '', phone || null, hashedPassword, 1]
      );

      const newUserId = result.insertId;
      const [rows] = await connection.execute(
        'SELECT id, userid, name, phone FROM users WHERE id = ?',
        [newUserId]
      );
      connection.release();
      return res.status(201).json({ success: true, message: 'Registration successful', user: rows[0] });
    }

    const user = users[0];

    // If user already has a password set, they are registered
    if (user.password) {
      connection.release();
      return res.status(400).json({ success: false, message: 'User already registered. Please login.' });
    }

    // Update existing user (set password, optionally update name/phone)
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.execute(
      'UPDATE users SET password = ?, name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE userid = ?',
      [hashedPassword, name || null, phone || null, userId]
    );

    const [rows] = await connection.execute('SELECT id, userid, name, phone FROM users WHERE userid = ?', [userId]);
    connection.release();
    return res.status(200).json({ success: true, message: 'Registration successful', user: rows[0] });
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
  }
};

// User login
export const loginUser = async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'User ID and password are required' });
  }
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT u.id, u.name, u.phone, u.password, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.userid = ?',
      [userId]
    );
    connection.release();
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid user ID or password' });
    }
    const user = users[0];
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Please register first' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid user ID or password' });
    }
    const token = jwt.sign(
      { userId: user.id, name: user.name, phone: user.phone, role: user.role },
      process.env.JWT_SECRET || '1223',
      { expiresIn: '7d' }
    );
    res.status(200).json({ success: true, message: 'Login successful', data: { userId: user.id, name: user.name, phone: user.phone, role: user.role, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
};

