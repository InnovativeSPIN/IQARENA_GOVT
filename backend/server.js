import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import pool from './config/db.js';

import authRoutes from './routes/auth/authRoutes.js';
import profileRoutes from './routes/profile/profileRoutes.js';
import usersAdminRoutes from './routes/admin/usersRoutes.js';
import subjectsAdminRoutes from './routes/admin/subjectsRoutes.js';
import topicsAdminRoutes from './routes/admin/topicsRoutes.js';
import examMetaRoutes from './routes/admin/examMetaRoutes.js';
import subtopicsAdminRoutes from './routes/admin/subtopicsRoutes.js';
import questionRoutes from './routes/admin/questionRoutes.js';
import uploadRoutes from './routes/admin/uploadRoutes.js';
import testRoutes from './routes/admin/testRoutes.js';
import offlinePaperRoutes from './routes/admin/offlinePaperRoutes.js';
import batchAdminRoutes from './routes/admin/batchRoutes.js';
import schoolRoutes from './routes/admin/schoolRoutes.js';
import batchRoutes from './routes/batch/batchRoutes.js';
import dashboardRoutes from './routes/dashboard/dashboardRoutes.js';
import studentTestRoutes from './routes/student/studentTestRoutes.js';
import facultyRoutes from './routes/faculty/facultyDashboardRoutes.js';
import facultyTestRoutes from './routes/faculty/facultyTestRoutes.js';
import facultySchoolRoutes from './routes/faculty/facultySchoolRoutes.js';
import facultyMessagesRoutes from './routes/faculty/facultyMessagesRoutes.js';
import adminReportsMessagesRoutes from './routes/admin/reportsMessagesRoutes.js';
import assignedTestsRoutes from './routes/student/assignedTestsRoutes.js';
import resultsRoutes from './routes/student/resultsRoutes.js';
import { optionalAuth } from './middleware/auth.js';
import studentNotificationsRoutes from './routes/student/notificationsRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('combined'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
// Serve uploaded files
import path from 'path';
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'IQARENA  Quiz Server is running',
    timestamp: new Date().toISOString()
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.status(200).json({
    version: '1.0.0',
    name: 'IQARENA Quiz Application API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Profile routes
app.use('/api/profile', profileRoutes);

// Admin users routes
app.use('/api/admin/users', usersAdminRoutes);

// Admin subjects routes
app.use('/api/admin/subjects', subjectsAdminRoutes);

// Admin topics routes
app.use('/api/admin/topics', topicsAdminRoutes);
// Admin subtopics routes
app.use('/api/admin/subtopics', subtopicsAdminRoutes);

// Admin question routes
app.use('/api/admin/questions', questionRoutes);

// Admin file uploads
app.use('/api/admin', uploadRoutes);

// Admin test routes
app.use('/api/admin/tests', testRoutes);

// Offline paper routes
app.use('/api/admin/offline-papers', offlinePaperRoutes);

// Admin batch routes
app.use('/api/admin/batches', batchAdminRoutes);

// Admin meta routes
app.use('/api/admin/meta', examMetaRoutes);

// Admin school routes
app.use('/api/admin/schools', schoolRoutes);

// Batch routes
app.use('/api/batches', batchRoutes);

// Dashboard routes
app.use('/api/admin/dashboard', dashboardRoutes);

// Student test routes
// Identify the logged-in student on every student route
app.use('/api/student', optionalAuth);

app.use('/api/student/tests', studentTestRoutes);

// Student assigned tests routes
app.use('/api/student/assigned-tests', assignedTestsRoutes);

// Student results routes
app.use('/api/student/results', resultsRoutes);

// Student notifications
app.use('/api/student/notifications', studentNotificationsRoutes);

// Faculty dashboard routes
app.use('/api/faculty', facultyRoutes);

// Faculty test management routes
app.use('/api/faculty', facultyTestRoutes);

// Faculty school monitoring (students + test reports of the faculty's school)
app.use('/api/faculty', facultySchoolRoutes);

// Faculty <-> admin messages, and faculty resetting student PINs
app.use('/api/faculty', facultyMessagesRoutes);

// Admin reports (school / test / class) and messages to school faculty
app.use('/api/admin', adminReportsMessagesRoutes);

// Database connection test endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const result = await connection.execute('SELECT 1');
    connection.release();
    
    res.status(200).json({
      status: 'connected',
      message: 'Database connection successful',
      database: process.env.DB_NAME || 'tmhnu'
    });
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// 404 Error handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════╗
║   IQARENA GOVT Quiz Application Server        ║
║   Version: 1.0.0                       ║
║   Status: Running                      ║
║   Port: ${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}             ║
╚════════════════════════════════════════╝
  `);
  console.log(`Server is listening at http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`Database status: http://0.0.0.0:${PORT}/api/db-status`);
});

export default app;
