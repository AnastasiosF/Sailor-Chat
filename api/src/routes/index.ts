import express from 'express';
import authRoutes from './auth.routes';
import messageRoutes from './message.routes';
import chatRoutes from './chat.routes';
import userRoutes from './user.routes';
import e2eRoutes from './e2e-encryption.routes';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: API health check endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "SailorChat API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-22T10:30:00.000Z"
 */
// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SailorChat API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/messages', messageRoutes);
router.use('/chats', chatRoutes);
router.use('/users', userRoutes);
router.use('/e2e', e2eRoutes);

export default router;
