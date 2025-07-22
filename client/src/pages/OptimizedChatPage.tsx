import React, { useState, useEffect, useCallback } from 'react';
import { Layout, List, Input, Button, Avatar, Typography, Space, Spin } from 'antd';
import { SendOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { MessageWithSender } from '../../../shared/src/types';
import socketService from '../services/socket.service';
import { useNavigate } from 'react-router-dom';
import VirtualMessageList from '../components/VirtualMessageList';
import ChatHeader from '../components/ChatHeader';

const { Sider, Content } = Layout;
const { Text } = Typography;

const OptimizedChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const chats = useChatStore(state => state.chats);
  const currentChat = useChatStore(state => state.currentChat);
  const chatMessages = useChatStore(state => state.chatMessages);
  const isLoading = useChatStore(state => state.isLoading);
  const loadUserChats = useChatStore(state => state.loadUserChats);
  const loadMessages = useChatStore(state => state.loadMessages);
  const loadMoreMessages = useChatStore(state => state.loadMoreMessages);
  const sendMessage = useChatStore(state => state.sendMessage);
  const setCurrentChat = useChatStore(state => state.setCurrentChat);
  const initializeChatMessages = useChatStore(state => state.initializeChatMessages);
  const prependNewMessage = useChatStore(state => state.prependNewMessage);
  
  const [newMessageContent, setNewMessageContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  // Current chat messages data
  const currentChatMessages = currentChat ? chatMessages[currentChat.id] : null;
  const messages = currentChatMessages?.messages || [];
  const messagesLoading = currentChatMessages?.isLoading || false;
  const hasMoreMessages = currentChatMessages?.pagination?.has_more || false;

  // Connect to socket when user is available
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('access_token');
      if (token) {
        socketService.connect(token, user.id, user.username);
      }
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  // Handle real-time messages
  useEffect(() => {
    const handleNewMessage = (message: MessageWithSender) => {
      console.log('Received new message:', message);
      if (currentChat && message.chat_id === currentChat.id) {
        prependNewMessage(currentChat.id, message);
      }
    };

    const handleUserTyping = (data: any) => {
      if (data.chatId === currentChat?.id && data.userId !== user?.id) {
        setTypingUsers(prev => new Map(prev).set(data.userId, data.username));
      }
    };

    const handleUserStoppedTyping = (data: any) => {
      if (data.chatId === currentChat?.id) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserStoppedTyping(handleUserStoppedTyping);

    return () => {
      socketService.offNewMessage();
      socketService.offUserTyping();
      socketService.offUserStoppedTyping();
    };
  }, [prependNewMessage, currentChat?.id, user?.id]);

  // Load user's chats on component mount
  useEffect(() => {
    if (user) {
      loadUserChats();
    }
  }, [user, loadUserChats]);

  const handleChatSelect = useCallback(async (chat: any) => {
    console.log('Selecting chat:', chat);
    
    setIsInitialLoading(true);
    
    // Clear typing timeout when switching chats
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    
    // Leave previous chat room if any
    if (currentChat) {
      socketService.leaveChat(currentChat.id);
      socketService.stopTyping(currentChat.id);
    }
    
    setCurrentChat(chat);
    setTypingUsers(new Map()); // Clear typing users when switching chats
    
    // Join new chat room
    socketService.joinChat(chat.id);
    
    try {
      // Initialize chat messages structure
      initializeChatMessages(chat.id);
      
      // Load initial messages
      await loadMessages(chat.id, 1);
      console.log('Messages loaded for chat:', chat.id);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [currentChat, typingTimeout, setCurrentChat, initializeChatMessages, loadMessages]);

  const handleLoadMoreMessages = useCallback(async () => {
    if (currentChat && !messagesLoading) {
      try {
        await loadMoreMessages(currentChat.id);
      } catch (error) {
        console.error('Error loading more messages:', error);
      }
    }
  }, [currentChat, messagesLoading, loadMoreMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!currentChat || !newMessageContent.trim()) return;

    try {
      // Stop typing when sending message
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      socketService.stopTyping(currentChat.id);

      await sendMessage(currentChat.id, newMessageContent);
      setNewMessageContent('');
      // Real-time updates will handle showing the new message
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [currentChat, newMessageContent, typingTimeout, sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessageContent(value);

    if (!currentChat) return;

    // Handle typing indicators
    if (value.trim() && !typingTimeout) {
      // Start typing
      socketService.startTyping(currentChat.id);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      socketService.stopTyping(currentChat.id);
      setTypingTimeout(null);
    }, 2000);

    setTypingTimeout(timeout);
  }, [currentChat, typingTimeout]);

  const getChatDisplayName = useCallback((chat: any) => {
    if (chat.name) {
      return chat.name;
    }
    // For direct messages, show the other participant's name
    if (chat.type === 'direct' && (chat as any).participants) {
      const otherParticipant = (chat as any).participants.find((p: any) => p.id !== user?.id);
      return otherParticipant ? otherParticipant.display_name || otherParticipant.username : 'Unknown User';
    }
    return chat.type === 'direct' ? 'Direct Message' : 'Group Chat';
  }, [user?.id]);

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ChatHeader />
      
      <Layout style={{ flex: 1 }}>
        <Sider width={300} style={{ backgroundColor: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/')}
              style={{ padding: '4px' }}
            />
            <Text strong>Chats</Text>
          </div>
        <List
          loading={isLoading}
          dataSource={chats}
          renderItem={(chat) => (
            <List.Item
              style={{
                cursor: 'pointer',
                backgroundColor: currentChat?.id === chat.id ? '#f6ffed' : 'transparent',
                padding: '12px 16px'
              }}
              onClick={() => handleChatSelect(chat)}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={getChatDisplayName(chat)}
                description={
                  chat.description || 
                  ((chat as any).participants ? `${(chat as any).participants.length} participants` : `${chat.type} chat`)
                }
              />
            </List.Item>
          )}
        />
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {currentChat ? (
          <>
            <div style={{ padding: '16px', borderBottom: '3px solid #f0f0f0' }}>
              <Text strong>{getChatDisplayName(currentChat)}</Text>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              {isInitialLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%' 
                }}>
                  <Spin size="large" />
                </div>
              ) : (
                <VirtualMessageList
                  messages={messages}
                  isLoading={messagesLoading}
                  hasMore={hasMoreMessages}
                  onLoadMore={handleLoadMoreMessages}
                  typingUsers={typingUsers}
                />
              )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Type a message..."
                  value={newMessageContent}
                  onChange={handleInputChange}
                  onPressEnter={handleSendMessage}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={isLoading}
                />
              </Space.Compact>
            </div>
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <Text type="secondary">Select a chat to start messaging</Text>
          </div>
        )}
      </Content>
      </Layout>
    </Layout>
  );
};

export default OptimizedChatPage;
