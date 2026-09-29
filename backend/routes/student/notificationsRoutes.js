import express from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead, listPendingTestPopups, markTestPopupsShown } from '../../controllers/student/notificationsController.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/student/notifications
router.get('/', listNotifications);

// GET /api/student/notifications/test-popups - newly assigned tests not yet shown in the popup
router.get('/test-popups', listPendingTestPopups);

// PATCH /api/student/notifications/test-popups/seen  { notificationIds: [] }
router.patch('/test-popups/seen', markTestPopupsShown);

// PATCH /api/student/notifications/read-all
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/student/notifications/:id/read
router.patch('/:id/read', markNotificationRead);

export default router;
