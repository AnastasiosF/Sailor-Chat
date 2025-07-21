import express from 'express';
import authRoutes from './auth.routes';
import messageRoutes from './message.routes';
import chatRoutes from './chat.routes';
import userRoutes from './user.routes';
import e2eRoutes from './e2e-encryption.routes';

const router = express.Router();

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
