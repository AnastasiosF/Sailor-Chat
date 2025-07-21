import express from 'express';
import chatController from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

// Validation schemas
const createChatValidation = [
  body('type').isIn(['direct', 'group']).withMessage('Type must be either direct or group'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
  body('participant_ids').optional().isArray().withMessage('Participant IDs must be an array'),
  body('is_private').optional().isBoolean().withMessage('is_private must be a boolean'),
];

const searchChatsValidation = [
  query('query').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('type').optional().isIn(['direct', 'group']).withMessage('Type must be either direct or group'),
];

const chatIdValidation = [
  param('chatId').isUUID().withMessage('Chat ID must be a valid UUID'),
];

// Routes
router.post('/', validateRequest(createChatValidation), chatController.createChat);
router.get('/search', validateRequest(searchChatsValidation), chatController.searchChats);
router.get('/', chatController.getUserChats);
router.get('/:chatId', validateRequest(chatIdValidation), chatController.getChatById);
router.post('/:chatId/join', validateRequest(chatIdValidation), chatController.joinChat);

export default router;
