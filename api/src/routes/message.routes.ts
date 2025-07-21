import express from 'express';
import messageController from '../controllers/message.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, messageValidations } from '../middleware/validation.middleware';

const router = express.Router();

// All message routes require authentication
router.use(authenticateToken);

// Send a message
router.post('/',
  validateRequest(messageValidations.send),
  messageController.sendMessage
);

// Get messages for a chat
router.get('/chat/:chatId',
  messageController.getMessages
);

// Edit a message
router.put('/:messageId',
  messageController.editMessage
);

// Delete a message
router.delete('/:messageId',
  messageController.deleteMessage
);

// Mark messages as read
router.post('/chat/:chatId/read',
  messageController.markAsRead
);

// Send direct message
router.post('/direct',
  messageController.sendDirectMessage
);

// Get direct message conversations
router.get('/conversations',
  messageController.getDirectMessageConversations
);

export default router;
