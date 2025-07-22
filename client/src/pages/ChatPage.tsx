import React, { useState, useEffect, useRef } from 'react';
import { Layout, List, Input, Button, Avatar, Typography, Card, Space } from 'antd';
import { SendOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { MessageWithSender } from '../../../shared/src/types';
import socketService from '../services/socket.service';
import { useNavigate } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Text } = Typography;

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const chats = useChatStore(state => state.chats);
  const currentChat = useChatStore(state => state.currentChat);
  const messages = useChatStore(state => state.messages);
  const isLoading = useChatStore(state => state.isLoading);
  const loadUserChats = useChatStore(state => state.loadUserChats);
  const loadMessages = useChatStore(state => state.loadMessages);
  const sendMessage = useChatStore(state => state.sendMessage);
  const setCurrentChat = useChatStore(state => state.setCurrentChat);
  const addMessage = useChatStore(state => state.addMessage);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // userId -> username
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      // Add the new message to the store
      addMessage(message.chat_id, message);
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
  }, [addMessage, currentChat?.id, user?.id]);

  // Load user's chats on component mount
  useEffect(() => {
    if (user) {
      loadUserChats();
    }
  }, [user, loadUserChats]);

  const handleChatSelect = async (chat: any) => {
    console.log('Selecting chat:', chat);
    
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
      await loadMessages(chat.id);
      console.log('Messages loaded for chat:', chat.id, messages[chat.id]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
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
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const getChatDisplayName = (chat: any) => {
    if (chat.name) {
      return chat.name;
    }
    // For direct messages, show the other participant's name
    if (chat.type === 'direct' && (chat as any).participants) {
      const otherParticipant = (chat as any).participants.find((p: any) => p.id !== user?.id);
      return otherParticipant ? otherParticipant.display_name || otherParticipant.username : 'Unknown User';
    }
    return chat.type === 'direct' ? 'Direct Message' : 'Group Chat';
  };

  const currentMessages = currentChat ? messages[currentChat.id] || [] : [];

  // Ensure messages is always an array and filter out any invalid entries
  const validMessages = Array.isArray(currentMessages) 
    ? currentMessages.filter(msg => msg && typeof msg === 'object' && msg.id)
    : [];

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Scroll to bottom when typing users change (someone starts/stops typing)
  useEffect(() => {
    if (typingUsers.size > 0) {
      scrollToBottom();
    }
  }, [typingUsers]);

  console.log('ChatPage render - currentChat:', currentChat?.id, 'currentMessages:', currentMessages, 'validMessages:', validMessages);

  return (
    <Layout style={{ height: '100vh' }}>
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
            
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <List
                dataSource={validMessages}
                renderItem={(message: MessageWithSender) => {
                  try {
                    if (!message || !message.id) return null;
                    
                    return (
                      <List.Item style={{ border: 'none', padding: '8px 0' }}>
                        <Card
                          size="small"
                          style={{
                            marginLeft: message.sender_id === user?.id ? 'auto' : '0',
                            marginRight: message.sender_id === user?.id ? '0' : 'auto',
                            maxWidth: '70%',
                            backgroundColor: message.sender_id === user?.id ? '#1890ff' : '#4a4a4a',
                            color: message.sender_id === user?.id ? 'white' : 'white'
                          }}
                        >
                          <div>
                            <Text
                              style={{
                                color: message.sender_id === user?.id ? 'white' : 'white',
                                fontSize: '12px'
                              }}
                            >
                              {message.sender_id === user?.id ? 'You' : (message.sender?.username || 'Unknown User')}
                            </Text>
                            <br />
                            <Text
                              style={{
                                color: message.sender_id === user?.id ? 'white' : 'white'
                              }}
                            >
                              {message.content || ''}
                            </Text>
                          </div>
                        </Card>
                      </List.Item>
                    );
                  } catch (error) {
                    console.error('Error rendering message:', error, message);
                    return null;
                  }
                }}
              />
              <div ref={messagesEndRef} />
              
              {/* Typing indicator */}
              {typingUsers.size > 0 && (
                <div style={{ padding: '8px 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                  {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </div>
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
  );
};

export default ChatPage;
