import { Response } from 'express';
import SupabaseService from '../services/supabase.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  ApiResponse, 
  Chat, 
  ChatWithParticipants,
  CreateChatRequest,
  User,
  PaginatedResponse,
  ChatType 
} from '../../../shared/src/types';
import DatabaseLogger from '../utils/database-logger';

class ChatController {
  private supabase = SupabaseService.getInstance();

  public createChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { type, name, description, participant_ids = [], is_private = false } = req.body;

      // For direct messages, ensure only 2 participants (current user + one other)
      if (type === 'direct') {
        if (participant_ids.length !== 1) {
          const response: ApiResponse = {
            success: false,
            error: 'Direct messages must have exactly one other participant',
          };
          res.status(400).json(response);
          return;
        }

        // Check if a direct message already exists between these users
        const existingChatResult = await this.supabase.executeQuery(
          'CHECK_EXISTING_DIRECT_CHAT',
          'chats',
          async () => {
            // First, find all direct chats that the current user is a participant in
            const { data: userChats, error } = await this.supabase
              .getServiceClient()
              .from('chats')
              .select(`
                id,
                name,
                description,
                type,
                avatar_url,
                created_by,
                created_at,
                updated_at,
                last_message_at,
                chat_participants(user_id)
              `)
              .eq('type', 'direct')
              .eq('chat_participants.user_id', req.user!.id);

            if (error) return { data: null, error };

            // Then filter to find chats where the other participant is also present
            const directChatWithUser = userChats?.filter(chat => {
              const participants = chat.chat_participants as { user_id: string }[];
              const participantIds = participants.map(p => p.user_id);
              return participantIds.includes(participant_ids[0]);
            }) || [];

            return { data: directChatWithUser, error: null };
          },
          req.user.id,
          { target_user_id: participant_ids[0] }
        );

        if (existingChatResult.data && existingChatResult.data.length > 0) {
          const response: ApiResponse<Chat> = {
            success: true,
            data: existingChatResult.data[0],
            message: 'Direct message chat already exists',
          };
          res.status(200).json(response);
          return;
        }
      }

      // Create the chat
      const newChat = await this.supabase.executeQuery(
        'CREATE_CHAT',
        'chats',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chats')
            .insert({
              name: type === 'direct' ? null : (name || 'New Group Chat'),
              description,
              type,
              created_by: req.user!.id,
              is_private: type === 'group' ? is_private : true, // Direct messages are always private
            })
            .select()
            .single();
          return { data, error };
        },
        req.user.id,
        { type, name, description, is_private, participant_ids }
      );


      if (newChat.error) {
        console.error('Error creating chat:', newChat.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to create chat',
        };
        res.status(500).json(response);
        return;
      }

      // Add participants (including the creator)
      const participantsToAdd = [req.user.id!, ...participant_ids];
      const participantInserts = participantsToAdd.map(userId => ({
        chat_id: newChat.data.id,
        user_id: userId,
        is_admin: userId === req.user!.id, // Creator is admin
      }));

      const participantResult = await this.supabase.executeQuery(
        'INSERT_CHAT_PARTICIPANTS',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .insert(participantInserts);
          return { data, error };
        },
        req.user.id,
        { chat_id: newChat.data.id, participants: participantInserts }
      );

      if (participantResult.error) {
        console.error('Error adding participants:', participantResult.error);
        // Clean up the chat if participant insertion fails
        await this.supabase.executeQuery(
          'DELETE_CHAT_CLEANUP',
          'chats',
          async () => {
            const { data, error } = await this.supabase
              .getServiceClient()
              .from('chats')
              .delete()
              .eq('id', newChat.data.id);
            return { data, error };
          },
          req.user.id,
          { chat_id: newChat.data.id }
        );
        
        const response: ApiResponse = {
          success: false,
          error: 'Failed to add participants to chat',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<Chat> = {
        success: true,
        data: newChat.data,
        message: 'Chat created successfully',
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createChat:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public searchChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { query, type } = req.query as { query?: string; type?: ChatType };

      console.log('Search query:', query, 'Type:', type);

      if (!query || query.trim().length < 2) {
        const response: ApiResponse = {
          success: false,
          error: 'Search query must be at least 2 characters',
        };
        res.status(400).json(response);
        return;
      }

      let queryBuilder = this.supabase
        .getServiceClient()
        .from('chats')
        .select(`
          id,
          name,
          description,
          type,
          avatar_url,
          is_private,
          created_by,
          created_at,
          updated_at,
          last_message_at,
          chat_participants(count)
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .neq('is_private', true) // Only show public chats in search
        .order('created_at', { ascending: false })
        .limit(20);

      if (type) {
        queryBuilder = queryBuilder.eq('type', type);
      }

      const searchResult = await this.supabase.executeQuery(
        'SEARCH_CHATS',
        'chats',
        async () => {
          const { data, error } = await queryBuilder;
          return { data, error };
        },
        req.user.id,
        { search_query: query, type }
      );

      if (searchResult.error) {
        console.error('Error searching chats:', searchResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to search chats',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<Chat[]> = {
        success: true,
        data: searchResult.data || [],
        message: `Found ${searchResult.data?.length || 0} chats`,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in searchChats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public getChatById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check if user is a participant in the chat
      const participantCheckResult = await this.supabase.executeQuery(
        'CHECK_CHAT_PARTICIPANT_ACCESS',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .select('id')
            .eq('chat_id', chatId)
            .eq('user_id', req.user!.id)
            .single();
          return { data, error };
        },
        req.user.id,
        { chat_id: chatId }
      );

      if (participantCheckResult.error || !participantCheckResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'Chat not found or you are not a participant',
        };
        res.status(404).json(response);
        return;
      }

      // Get chat details with participants
      const chatResult = await this.supabase.executeQuery(
        'GET_CHAT_BY_ID',
        'chats',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chats')
            .select(`
              id,
              name,
              description,
              type,
              avatar_url,
              is_private,
              created_by,
              created_at,
              updated_at,
              last_message_at,
              chat_participants(
                user:users(id, username, display_name, avatar_url)
              )
            `)
            .eq('id', chatId)
            .single();
          return { data, error };
        },
        req.user.id,
        { chat_id: chatId }
      );

      if (chatResult.error || !chatResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'Chat not found',
        };
        res.status(404).json(response);
        return;
      }

      const chat = chatResult.data;
      // Include participants in the chat object
      chat.participants = chat.chat_participants?.map((cp: any) => cp.user) || [];
      // Remove the nested chat_participants structure
      delete chat.chat_participants;

      const response: ApiResponse<Chat> = {
        success: true,
        data: chat,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getChatById:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public joinChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check if chat exists and is public
      const chatResult = await this.supabase.executeQuery(
        'CHECK_CHAT_EXISTS',
        'chats',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chats')
            .select('id, name, type, is_private')
            .eq('id', chatId)
            .single();
          return { data, error };
        },
        req.user.id,
        { chat_id: chatId }
      );

      if (chatResult.error || !chatResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'Chat not found',
        };
        res.status(404).json(response);
        return;
      }

      const chat = chatResult.data;

      if (chat.is_private) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot join private chat without invitation',
        };
        res.status(403).json(response);
        return;
      }

      if (chat.type === 'direct') {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot join direct message chats',
        };
        res.status(403).json(response);
        return;
      }

      // Check if user is already a participant
      const participantCheckResult = await this.supabase.executeQuery(
        'CHECK_EXISTING_PARTICIPANT',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .select('id')
            .eq('chat_id', chatId)
            .eq('user_id', req.user!.id)
            .single();
          return { data, error };
        },
        req.user.id,
        { chat_id: chatId }
      );

      if (participantCheckResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'You are already a member of this chat',
        };
        res.status(409).json(response);
        return;
      }

      // Add user as participant
      const joinResult = await this.supabase.executeQuery(
        'JOIN_CHAT',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .insert({
              chat_id: chatId,
              user_id: req.user!.id,
              is_admin: false,
            });
          return { data, error };
        },
        req.user.id,
        { chat_id: chatId, chat_name: chat.name }
      );

      if (joinResult.error) {
        console.error('Error joining chat:', joinResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to join chat',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Successfully joined chat',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in joinChat:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public getUserChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const userChatsResult = await this.supabase.executeQuery(
        'GET_USER_CHATS',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .select(`
              chat:chats(
                id,
                name,
                description,
                type,
                avatar_url,
                is_private,
                created_by,
                created_at,
                updated_at,
                last_message_at,
                chat_participants(
                  user:users(id, username, display_name, avatar_url)
                )
              )
            `)
            .eq('user_id', req.user!.id)
            .order('joined_at', { ascending: false });
          return { data, error };
        },
        req.user.id,
        { operation: 'fetch_user_chats' }
      );

      if (userChatsResult.error) {
        console.error('Error fetching user chats:', userChatsResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to fetch chats',
        };
        res.status(500).json(response);
        return;
      }

      // Transform the data to get chats with participants
      const userChats = userChatsResult.data?.map((item: any) => {
        const chat = item.chat;
        if (chat) {
          // Include participants in the chat object
          chat.participants = chat.chat_participants?.map((cp: any) => cp.user) || [];
          // Remove the nested chat_participants structure
          delete chat.chat_participants;
        }
        return chat;
      }).filter(Boolean) || [];

      const response: ApiResponse<Chat[]> = {
        success: true,
        data: userChats,
        message: `Found ${userChats.length} chats`,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUserChats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };
}

export default new ChatController();
