import express from 'express';
import chatController from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: Chat management endpoints
 */

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

/**
 * @swagger
 * /chats:
 *   post:
 *     summary: Create a new chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChatRequest'
 *     responses:
 *       201:
 *         description: Chat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Routes
router.post('/', validateRequest(createChatValidation), chatController.createChat);

/**
 * @swagger
 * /chats/search:
 *   get:
 *     summary: Search for public chats
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search term (minimum 2 characters)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [direct, group]
 *         description: Filter by chat type
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Invalid search parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', validateRequest(searchChatsValidation), chatController.searchChats);

/**
 * @swagger
 * /chats:
 *   get:
 *     summary: Get user's chats
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's chats
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', chatController.getUserChats);

/**
 * @swagger
 * /chats/{chatId}:
 *   get:
 *     summary: Get chat by ID
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Chat'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:chatId', validateRequest(chatIdValidation), chatController.getChatById);

/**
 * @swagger
 * /chats/{chatId}/join:
 *   post:
 *     summary: Join a chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat ID to join
 *     responses:
 *       200:
 *         description: Successfully joined chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Already a member of the chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:chatId/join', validateRequest(chatIdValidation), chatController.joinChat);

export default router;
