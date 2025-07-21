import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, List, Avatar, message, Typography, Space } from 'antd';
import { UserOutlined, SendOutlined, LockOutlined } from '@ant-design/icons';
import browserE2ECryptoService from '../services/browser-e2e-crypto.service';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface DirectMessageModalProps {
  visible: boolean;
  onClose: () => void;
  token: string;
}

interface Conversation {
  chat_id: string;
  participant: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  last_message: {
    content: string;
    encrypted_content?: string;
    is_encrypted: boolean;
    created_at: string;
  } | null;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  encrypted_content?: string;
  is_encrypted: boolean;
  sender: {
    id: string;
    username: string;
    display_name: string;
  };
  created_at: string;
}

const DirectMessageModal: React.FC<DirectMessageModalProps> = ({ visible, onClose, token }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasEncryptionKeys, setHasEncryptionKeys] = useState(false);

  useEffect(() => {
    if (visible) {
      checkEncryptionKeys();
      loadConversations();
    }
  }, [visible, token]);

  const checkEncryptionKeys = () => {
    const hasKeys = browserE2ECryptoService.hasKeys() || browserE2ECryptoService.loadKeys();
    setHasEncryptionKeys(hasKeys);
    
    if (!hasKeys) {
      generateEncryptionKeys();
    }
  };

  const generateEncryptionKeys = async () => {
    try {
      setLoading(true);
      await browserE2ECryptoService.generateKeys();
      await browserE2ECryptoService.setupKeysOnServer(token);
      setHasEncryptionKeys(true);
      message.success('Encryption keys generated and setup complete');
    } catch (error) {
      console.error('Failed to setup encryption:', error);
      message.error('Failed to setup encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await browserE2ECryptoService.getDirectMessageConversations(token);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      message.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages/chat/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (result.success) {
        setMessages(result.data.reverse()); // Reverse to show newest at bottom
      } else {
        message.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      message.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setLoading(true);
      const success = await browserE2ECryptoService.sendDirectMessage(
        selectedConversation.participant.id,
        newMessage.trim(),
        token
      );

      if (success) {
        setNewMessage('');
        // Reload messages to show the new one
        await loadMessages(selectedConversation.chat_id);
        message.success('Message sent successfully');
      } else {
        message.error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.chat_id);
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderConversationList = () => (
    <div style={{ height: '500px', overflowY: 'auto' }}>
      <List
        dataSource={conversations}
        loading={loading && !selectedConversation}
        renderItem={(conversation) => (
          <List.Item
            onClick={() => selectConversation(conversation)}
            style={{
              cursor: 'pointer',
              backgroundColor: selectedConversation?.chat_id === conversation.chat_id ? '#f0f0f0' : 'white',
              padding: '12px',
            }}
          >
            <List.Item.Meta
              avatar={
                <Avatar 
                  src={conversation.participant.avatar_url} 
                  icon={<UserOutlined />}
                />
              }
              title={conversation.participant.display_name || conversation.participant.username}
              description={
                conversation.last_message ? (
                  <div>
                    {conversation.last_message.is_encrypted ? (
                      <Space>
                        <LockOutlined />
                        <Text type="secondary">Encrypted message</Text>
                      </Space>
                    ) : (
                      <Text ellipsis>{conversation.last_message.content}</Text>
                    )}
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatMessageTime(conversation.last_message.created_at)}
                    </Text>
                  </div>
                ) : (
                  <Text type="secondary">No messages yet</Text>
                )
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  const renderMessageView = () => (
    <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Avatar 
            src={selectedConversation?.participant.avatar_url} 
            icon={<UserOutlined />}
          />
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {selectedConversation?.participant.display_name || selectedConversation?.participant.username}
            </Title>
            <Space>
              <LockOutlined />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                End-to-end encrypted
              </Text>
            </Space>
          </div>
        </Space>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <List
          dataSource={messages}
          loading={loading}
          renderItem={(msg) => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <div style={{ width: '100%' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: msg.sender.id === selectedConversation?.participant.id ? 'flex-start' : 'flex-end',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    maxWidth: '70%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: msg.sender.id === selectedConversation?.participant.id ? '#f0f0f0' : '#1890ff',
                    color: msg.sender.id === selectedConversation?.participant.id ? 'black' : 'white',
                  }}>
                    {msg.is_encrypted ? (
                      <Space>
                        <LockOutlined />
                        <Text style={{ color: 'inherit' }}>Encrypted message</Text>
                      </Space>
                    ) : (
                      <Text style={{ color: 'inherit' }}>{msg.content}</Text>
                    )}
                  </div>
                </div>
                <div style={{ 
                  textAlign: msg.sender.id === selectedConversation?.participant.id ? 'left' : 'right'
                }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {formatMessageTime(msg.created_at)}
                  </Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>

      {/* Message Input */}
      <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            loading={loading}
            disabled={!newMessage.trim()}
          />
        </Space.Compact>
      </div>
    </div>
  );

  return (
    <Modal
      title="Direct Messages"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 50 }}
    >
      {!hasEncryptionKeys ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <LockOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={4}>Setting up End-to-End Encryption</Title>
          <Text type="secondary">
            Generating encryption keys for secure messaging...
          </Text>
          <br />
          <Button 
            type="primary" 
            loading={loading} 
            onClick={generateEncryptionKeys}
            style={{ marginTop: '16px' }}
          >
            Generate Encryption Keys
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '500px' }}>
          {/* Conversations List */}
          <div style={{ width: '300px', borderRight: '1px solid #f0f0f0' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
              <Title level={5} style={{ margin: 0 }}>Conversations</Title>
            </div>
            {renderConversationList()}
          </div>

          {/* Messages View */}
          <div style={{ flex: 1 }}>
            {selectedConversation ? (
              renderMessageView()
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#999'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <br />
                  Select a conversation to start messaging
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DirectMessageModal;
