import { Response } from 'express';
import SupabaseService from '../services/supabase.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  ApiResponse, 
  Message, 
  MessageWithSender,
  SendMessageRequest,
  PaginatedResponse,
  PaginationParams 
} from '../../../shared/src/types';
import DatabaseLogger from '../utils/database-logger';
import { E2EEncryption } from '../../../shared/src/crypto/e2e-encryption';
import { io } from '../index';

class MessageController {
  private supabase = SupabaseService.getInstance();

  public sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { chat_id, content, type = 'text', reply_to_id }: SendMessageRequest = req.body;

      // Verify user is a participant in the chat
      const participantCheckResult = await this.supabase.executeQuery(
        'CHECK_CHAT_PARTICIPANT',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .select('id')
            .eq('chat_id', chat_id)
            .eq('user_id', req.user!.id)
            .single();
          return { data, error };
        },
        req.user.id,
        { chat_id, operation: 'send_message_check' }
      );

      if (participantCheckResult.error || !participantCheckResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'You are not a participant in this chat',
        };
        res.status(403).json(response);
        return;
      }

      // If replying to a message, verify it exists and is in the same chat
      if (reply_to_id) {
        const { data: replyMessage, error: replyError } = await this.supabase
          .getServiceClient()
          .from('messages')
          .select('id, chat_id')
          .eq('id', reply_to_id)
          .eq('chat_id', chat_id)
          .single();

        if (replyError || !replyMessage) {
          const response: ApiResponse = {
            success: false,
            error: 'Reply message not found or not in this chat',
          };
          res.status(400).json(response);
          return;
        }
      }

      // Create the message
      const { data: message, error: messageError } = await this.supabase
        .getServiceClient()
        .from('messages')
        .insert({
          chat_id,
          sender_id: req.user.id,
          content: content.trim(),
          type,
          reply_to_id: reply_to_id || null,
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .single();

      if (messageError) {
        console.error('Message creation error:', messageError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to send message',
        };
        res.status(500).json(response);
        return;
      }

      // Update participants' last_read_at for the sender
      await this.supabase
        .getServiceClient()
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chat_id)
        .eq('user_id', req.user.id);

      // Emit new message to all participants in the chat
      io.to(`chat_${chat_id}`).emit('new_message', {
        ...message,
        reactions: [],
      });

      const response: ApiResponse<MessageWithSender> = {
        success: true,
        data: {
          ...message,
          reactions: [],
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Send message error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  // Send encrypted direct message to user
  public sendDirectMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { recipient_id, content, encrypted_content, encryption_metadata } = req.body;
      const sender_id = req.user.id;

      if (!recipient_id) {
        const response: ApiResponse = {
          success: false,
          error: 'Recipient ID is required',
        };
        res.status(400).json(response);
        return;
      }

      if (!content && !encrypted_content) {
        const response: ApiResponse = {
          success: false,
          error: 'Either content or encrypted_content is required',
        };
        res.status(400).json(response);
        return;
      }

      // Check if recipient exists
      const { data: recipient, error: recipientError } = await this.supabase
        .getServiceClient()
        .from('users')
        .select('id')
        .eq('id', recipient_id)
        .single();

      if (recipientError || !recipient) {
        const response: ApiResponse = {
          success: false,
          error: 'Recipient not found',
        };
        res.status(404).json(response);
        return;
      }

      // Create or get direct message chat
      let chatId: string;
      
      // Check if direct message chat already exists between these users
      const { data: existingChats, error: chatQueryError } = await this.supabase
        .getServiceClient()
        .from('chats')
        .select(`
          id,
          chat_participants!inner(user_id)
        `)
        .eq('type', 'direct')
        .eq('chat_participants.user_id', sender_id);

      if (chatQueryError) {
        console.error('Chat query error:', chatQueryError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to check existing chats',
        };
        res.status(500).json(response);
        return;
      }

      // Find existing direct message chat with this recipient
      let existingChat = null;
      if (existingChats) {
        for (const chat of existingChats) {
          const { data: participants, error: participantsError } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id);

          if (!participantsError && participants && participants.length === 2) {
            const participantIds = participants.map(p => p.user_id);
            if (participantIds.includes(sender_id) && participantIds.includes(recipient_id)) {
              existingChat = chat;
              break;
            }
          }
        }
      }

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        // Create new direct message chat
        const { data: newChat, error: newChatError } = await this.supabase
          .getServiceClient()
          .from('chats')
          .insert({
            name: 'Direct Message',
            type: 'direct',
            created_by: sender_id,
          })
          .select()
          .single();

        if (newChatError || !newChat) {
          console.error('Chat creation error:', newChatError);
          const response: ApiResponse = {
            success: false,
            error: 'Failed to create direct message chat',
          };
          res.status(500).json(response);
          return;
        }

        chatId = newChat.id;

        // Add both users as participants
        const { error: participantsError } = await this.supabase
          .getServiceClient()
          .from('chat_participants')
          .insert([
            { chat_id: chatId, user_id: sender_id, role: 'member' },
            { chat_id: chatId, user_id: recipient_id, role: 'member' },
          ]);

        if (participantsError) {
          console.error('Participants creation error:', participantsError);
          const response: ApiResponse = {
            success: false,
            error: 'Failed to add chat participants',
          };
          res.status(500).json(response);
          return;
        }
      }

      // Insert the message
      const messageData: any = {
        chat_id: chatId,
        sender_id,
        type: encrypted_content ? 'encrypted' : 'text',
      };

      if (encrypted_content) {
        messageData.encrypted_content = encrypted_content;
        messageData.encryption_metadata = encryption_metadata;
        messageData.is_encrypted = true;
      } else {
        messageData.content = content;
        messageData.is_encrypted = false;
      }

      const { data: message, error: messageError } = await this.supabase
        .getServiceClient()
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*),
          chat:chats!messages_chat_id_fkey(*)
        `)
        .single();

      if (messageError) {
        console.error('Direct message creation error:', messageError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to send direct message',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<MessageWithSender> = {
        success: true,
        data: {
          ...message,
          reactions: [],
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Send direct message error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  // Get direct message conversations for user
  public getDirectMessageConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const userId = req.user.id;

      // Get all direct message chats where user is a participant
      const { data: conversations, error: conversationsError } = await this.supabase
        .getServiceClient()
        .from('chats')
        .select(`
          *,
          chat_participants!inner (
            user_id,
            user:users (
              id,
              username,
              display_name,
              avatar_url,
              status
            )
          ),
          messages (
            id,
            content,
            encrypted_content,
            is_encrypted,
            created_at,
            sender:users!messages_sender_id_fkey (
              id,
              username,
              display_name
            )
          )
        `)
        .eq('type', 'direct')
        .eq('chat_participants.user_id', userId)
        .order('created_at', { ascending: false, foreignTable: 'messages' })
        .limit(1, { foreignTable: 'messages' });

      if (conversationsError) {
        console.error('Conversations query error:', conversationsError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to fetch conversations',
        };
        res.status(500).json(response);
        return;
      }

      // Format conversations to show the other participant
      const formattedConversations = conversations?.map(conversation => {
        const otherParticipant = conversation.chat_participants.find(
          (member: any) => member.user_id !== userId
        );
        
        return {
          chat_id: conversation.id,
          participant: otherParticipant?.user,
          last_message: conversation.messages[0] || null,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        };
      }) || [];

      const response: ApiResponse = {
        success: true,
        data: formattedConversations,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get direct conversations error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { chatId } = req.params;
      const { page = 1, limit = 50, cursor }: PaginationParams = req.query;

      // Verify user is a participant in the chat
      const { data: participant, error: participantError } = await this.supabase
        .getServiceClient()
        .from('chat_participants')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_id', req.user.id)
        .single();

      if (participantError || !participant) {
        const response: ApiResponse = {
          success: false,
          error: 'You are not a participant in this chat',
        };
        res.status(403).json(response);
        return;
      }

      let query = this.supabase
        .getServiceClient()
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false });

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data: messages, error: messagesError, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (messagesError) {
        console.error('Messages fetch error:', messagesError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to fetch messages',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<PaginatedResponse<MessageWithSender>> = {
        success: true,
        data: {
          data: messages?.reverse() || [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: count || 0,
            has_more: messages ? messages.length === limit : false,
            next_cursor: messages && messages.length > 0 ? messages[0].created_at : undefined,
          },
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get messages error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public editMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { messageId } = req.params;
      const { content } = req.body;

      // Verify the message exists and user is the sender
      const { data: message, error: messageError } = await this.supabase
        .getServiceClient()
        .from('messages')
        .select('id, sender_id, chat_id, type')
        .eq('id', messageId)
        .eq('sender_id', req.user.id)
        .single();

      if (messageError || !message) {
        const response: ApiResponse = {
          success: false,
          error: 'Message not found or you do not have permission to edit it',
        };
        res.status(404).json(response);
        return;
      }

      // Only allow editing text messages
      if (message.type !== 'text') {
        const response: ApiResponse = {
          success: false,
          error: 'Only text messages can be edited',
        };
        res.status(400).json(response);
        return;
      }

      // Update the message
      const { data: updatedMessage, error: updateError } = await this.supabase
        .getServiceClient()
        .from('messages')
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .single();

      if (updateError) {
        console.error('Message update error:', updateError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to update message',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<MessageWithSender> = {
        success: true,
        data: updatedMessage,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Edit message error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { messageId } = req.params;

      // Verify the message exists and user is the sender
      const { data: message, error: messageError } = await this.supabase
        .getServiceClient()
        .from('messages')
        .select('id, sender_id, chat_id')
        .eq('id', messageId)
        .eq('sender_id', req.user.id)
        .single();

      if (messageError || !message) {
        const response: ApiResponse = {
          success: false,
          error: 'Message not found or you do not have permission to delete it',
        };
        res.status(404).json(response);
        return;
      }

      // Delete the message
      const { error: deleteError } = await this.supabase
        .getServiceClient()
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) {
        console.error('Message deletion error:', deleteError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to delete message',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Delete message error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { chatId } = req.params;

      // Update last_read_at for the user in this chat
      const { error: updateError } = await this.supabase
        .getServiceClient()
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', req.user.id);

      if (updateError) {
        console.error('Mark as read error:', updateError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to mark messages as read',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Mark as read error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };
}

export default new MessageController();
