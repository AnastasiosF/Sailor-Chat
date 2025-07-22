import { create } from 'zustand';
import { Chat, ChatType, MessageWithSender, User } from '../../../shared/src/types';
import api from '../services/api';

interface CreateChatData {
  name?: string;
  description?: string;
  type: ChatType;
  is_private?: boolean;
  participant_id?: string; // For direct messages
}

interface MessagePagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  next_cursor?: string;
}

interface ChatMessages {
  messages: MessageWithSender[];
  pagination: MessagePagination;
  isLoading: boolean;
  hasInitialLoad: boolean;
}

interface ChatStore {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Record<string, MessageWithSender[]>;
  chatMessages: Record<string, ChatMessages>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  addMessage: (chatId: string, message: MessageWithSender) => void;
  
  // Enhanced Message Actions
  initializeChatMessages: (chatId: string) => void;
  appendOlderMessages: (chatId: string, messages: MessageWithSender[], pagination: MessagePagination) => void;
  prependNewMessage: (chatId: string, message: MessageWithSender) => void;
  
  // API Actions
  createChat: (data: CreateChatData) => Promise<Chat>;
  searchChats: (query: string, type?: ChatType) => Promise<Chat[]>;
  searchUsers: (query: string) => Promise<User[]>;
  loadUserChats: () => Promise<void>;
  joinChat: (chatId: string) => Promise<void>;
  leaveChat: (chatId: string) => Promise<void>;
  loadMessages: (chatId: string, page?: number, cursor?: string) => Promise<void>;
  loadMoreMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string) => Promise<MessageWithSender>;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: {},
  chatMessages: {},
  isLoading: false,
  error: null,

  // State setters
  setChats: (chats) => set({ chats }),
  setCurrentChat: (chat) => set({ currentChat: chat }),
  addChat: (chat) => set((state) => ({ 
    chats: [...state.chats, chat] 
  })),
  updateChat: (chatId, updates) => set((state) => ({
    chats: state.chats.map(chat => 
      chat.id === chatId ? { ...chat, ...updates } : chat
    )
  })),
  removeChat: (chatId) => set((state) => ({
    chats: state.chats.filter(chat => chat.id !== chatId)
  })),
  addMessage: (chatId, message) => set((state) => {
    const existingMessages = state.messages[chatId] || [];
    // Check if message already exists to prevent duplicates
    const messageExists = existingMessages.some(msg => msg.id === message.id);
    
    if (messageExists) {
      return state; // Don't add duplicate message
    }

    // Update both legacy and new message structures
    const updatedState = {
      messages: {
        ...state.messages,
        [chatId]: [...existingMessages, message]
      }
    };

    // Update new chatMessages structure if it exists
    if (state.chatMessages[chatId]) {
      get().prependNewMessage(chatId, message);
    }
    
    return updatedState;
  }),

  // Enhanced Message Actions
  initializeChatMessages: (chatId) => set((state) => ({
    chatMessages: {
      ...state.chatMessages,
      [chatId]: {
        messages: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          has_more: true,
        },
        isLoading: false,
        hasInitialLoad: false,
      }
    }
  })),

  appendOlderMessages: (chatId, newMessages, pagination) => set((state) => {
    const existingChat = state.chatMessages[chatId];
    if (!existingChat) return state;

    // Filter out duplicates by ID
    const existingIds = new Set(existingChat.messages.map(msg => msg.id));
    const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));

    return {
      chatMessages: {
        ...state.chatMessages,
        [chatId]: {
          ...existingChat,
          messages: [...uniqueNewMessages, ...existingChat.messages],
          pagination,
          isLoading: false,
        }
      }
    };
  }),

  prependNewMessage: (chatId, message) => set((state) => {
    const existingChat = state.chatMessages[chatId];
    if (!existingChat) {
      // Initialize if doesn't exist
      return {
        chatMessages: {
          ...state.chatMessages,
          [chatId]: {
            messages: [message],
            pagination: {
              page: 1,
              limit: 50,
              total: 1,
              has_more: false,
            },
            isLoading: false,
            hasInitialLoad: true,
          }
        }
      };
    }

    // Check if message already exists to prevent duplicates
    const messageExists = existingChat.messages.some(msg => msg.id === message.id);
    if (messageExists) return state;

    return {
      chatMessages: {
        ...state.chatMessages,
        [chatId]: {
          ...existingChat,
          messages: [...existingChat.messages, message],
          pagination: {
            ...existingChat.pagination,
            total: existingChat.pagination.total + 1,
          }
        }
      }
    };
  }),

  // API Actions
  createChat: async (data: CreateChatData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/chats', data);
      const newChat = response.data.data;
      
      get().addChat(newChat);
      set({ isLoading: false });
      return newChat;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create chat';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  searchChats: async (query: string, type?: ChatType) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      if (type) params.append('type', type);
      
      const response = await api.get(`/chats/search?${params.toString()}`);
      set({ isLoading: false });
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to search chats';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  searchUsers: async (query: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      
      const response = await api.get(`/users/search?${params.toString()}`);
      set({ isLoading: false });
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to search users';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  loadUserChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/chats');
      const chats = response.data.data;
      set({ chats, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load chats';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  joinChat: async (chatId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/chats/${chatId}/join`);
      
      // Fetch the updated chat and add it to the user's chats
      const response = await api.get(`/chats/${chatId}`);
      const chat = response.data.data;
      get().addChat(chat);
      
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to join chat';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  leaveChat: async (chatId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/chats/${chatId}/leave`);
      get().removeChat(chatId);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to leave chat';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  loadMessages: async (chatId: string, page = 1, cursor?: string) => {
    const state = get();
    
    // Initialize chat messages if not exists
    if (!state.chatMessages[chatId]) {
      get().initializeChatMessages(chatId);
    }

    // Set loading state
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [chatId]: {
          ...state.chatMessages[chatId],
          isLoading: true
        }
      }
    }));

    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await api.get(`/messages/chat/${chatId}?${params.toString()}`);
      const data = response.data.data;
      const messages = data.data || [];
      const pagination = data.pagination;

      if (page === 1) {
        // Initial load - replace all messages
        set((state) => ({
          chatMessages: {
            ...state.chatMessages,
            [chatId]: {
              messages: messages.reverse(), // Reverse to show newest at bottom
              pagination,
              isLoading: false,
              hasInitialLoad: true,
            }
          },
          // Keep legacy messages for compatibility
          messages: {
            ...state.messages,
            [chatId]: messages.reverse()
          }
        }));
      } else {
        // Load more - append older messages
        get().appendOlderMessages(chatId, messages.reverse(), pagination);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load messages';
      set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [chatId]: {
            ...state.chatMessages[chatId],
            isLoading: false
          }
        },
        error: errorMessage
      }));
      throw new Error(errorMessage);
    }
  },

  loadMoreMessages: async (chatId: string) => {
    const state = get();
    const chatMessages = state.chatMessages[chatId];
    
    if (!chatMessages || !chatMessages.pagination.has_more || chatMessages.isLoading) {
      return;
    }

    const nextPage = chatMessages.pagination.page + 1;
    const cursor = chatMessages.pagination.next_cursor;
    
    await get().loadMessages(chatId, nextPage, cursor);
  },

  sendMessage: async (chatId: string, content: string, type = 'text') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/messages`, {
        chat_id: chatId,
        content,
        type
      });
      const newMessage = response.data.data;
      
      // Don't add the message locally here - let Socket.IO handle it
      // to avoid duplicates
      set({ isLoading: false });
      
      return newMessage;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
