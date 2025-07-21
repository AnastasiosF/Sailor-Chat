import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Button,
  Input,
  Modal,
  Form,
  Radio,
  List,
  Avatar,
  Typography,
  Space,
  Tag,
  message,
  Row,
  Col,
  Empty,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MessageOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  LockOutlined,
  GlobalOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { Chat, User, ChatType } from '../../../shared/src/types';
import './HomePage.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

interface CreateRoomFormData {
  name: string;
  description?: string;
  isPrivate: boolean;
}

interface RoomSearchResult extends Chat {
  memberCount?: number;
  isJoined?: boolean;
  is_private?: boolean;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { chats, createChat, searchChats, searchUsers, joinChat, loadUserChats } = useChatStore();
  
  // Modal states
  const [isCreateRoomModalVisible, setIsCreateRoomModalVisible] = useState(false);
  const [isSearchRoomModalVisible, setIsSearchRoomModalVisible] = useState(false);
  const [isSearchUserModalVisible, setIsSearchUserModalVisible] = useState(false);
  
  // Form instances
  const [createRoomForm] = Form.useForm();
  
  // Search states
  const [roomSearchResults, setRoomSearchResults] = useState<RoomSearchResult[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [roomSearchLoading, setRoomSearchLoading] = useState(false);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  
  // Recent conversations (direct messages and joined rooms)
  const recentChats = chats.slice(0, 10); // Show last 10 chats

  useEffect(() => {
    // Load recent chats on component mount
    loadRecentChats();
  }, []);

  const loadRecentChats = async () => {
    try {
      await loadUserChats();
    } catch (error) {
      console.error('Error loading recent chats:', error);
    }
  };

  const handleCreateRoom = async (values: CreateRoomFormData) => {
    try {
      const chatData = {
        name: values.name,
        description: values.description,
        type: 'group' as ChatType,
        is_private: values.isPrivate,
      };
      
      await createChat(chatData);
      message.success('Room created successfully!');
      setIsCreateRoomModalVisible(false);
      createRoomForm.resetFields();
      loadRecentChats(); // Refresh the list
    } catch (error) {
      message.error('Failed to create room. Please try again.');
      console.error('Error creating room:', error);
    }
  };

  const handleSearchRooms = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setRoomSearchResults([]);
      return;
    }

    setRoomSearchLoading(true);
    try {
      const results = await searchChats(searchTerm, 'group');
      // Add additional metadata for display
      const enhancedResults = results.map((chat: Chat) => ({
        ...chat,
        memberCount: Math.floor(Math.random() * 100) + 1, // Mock data
        isJoined: chats.some((userChat: Chat) => userChat.id === chat.id),
      }));
      setRoomSearchResults(enhancedResults);
    } catch (error) {
      message.error('Failed to search rooms');
      console.error('Error searching rooms:', error);
    } finally {
      setRoomSearchLoading(false);
    }
  };

  const handleSearchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setUserSearchResults([]);
      return;
    }

    setUserSearchLoading(true);
    try {
      const results = await searchUsers(searchTerm);
      setUserSearchResults(results);
    } catch (error) {
      message.error('Failed to search users');
      console.error('Error searching users:', error);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await joinChat(roomId);
      message.success('Joined room successfully!');
      // Update the search results to reflect the joined status
      setRoomSearchResults(prev => 
        prev.map(room => 
          room.id === roomId ? { ...room, isJoined: true } : room
        )
      );
      loadRecentChats();
    } catch (error) {
      message.error('Failed to join room');
      console.error('Error joining room:', error);
    }
  };

  const handleStartDirectMessage = async (userId: string, username: string) => {
    try {
      const chatData = {
        type: 'direct' as ChatType,
        name: `DM with ${username}`,
        participant_ids: [userId],
      };
      
      const newChat = await createChat(chatData);
      message.success(`Started conversation with ${username}`);
      setIsSearchUserModalVisible(false);
      
      // Navigate to the chat
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      message.error('Failed to start conversation');
      console.error('Error starting direct message:', error);
    }
  };

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      message.error('Error logging out');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'green';
      case 'away': return 'orange';
      case 'busy': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Layout className="home-container" style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={3} style={{ margin: 0 }} className="branding">
          SailorChat
        </Title>
        <Space>
          <Text className="welcome-text">Welcome, {user?.display_name || user?.username}</Text>
          <Button 
            type="text" 
            icon={<SettingOutlined />} 
            onClick={() => navigate('/settings')}
          />
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
          />
        </Space>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Row gutter={[24, 24]}>
          {/* Quick Actions */}
          <Col span={24}>
            <Card title="Quick Actions" style={{ marginBottom: 24 }} className="quick-actions">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    block
                    onClick={() => setIsCreateRoomModalVisible(true)}
                  >
                    Create Room
                  </Button>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Button
                    size="large"
                    icon={<SearchOutlined />}
                    block
                    onClick={() => setIsSearchRoomModalVisible(true)}
                  >
                    Search Rooms
                  </Button>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Button
                    size="large"
                    icon={<UserOutlined />}
                    block
                    onClick={() => setIsSearchUserModalVisible(true)}
                  >
                    Find Users
                  </Button>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Button
                    size="large"
                    icon={<MessageOutlined />}
                    block
                    onClick={() => navigate('/chat')}
                  >
                    All Chats
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Recent Conversations */}
          <Col span={24}>
            <Card 
              title="Recent Conversations" 
              extra={
                <Button type="link" onClick={() => navigate('/chat')}>
                  View All
                </Button>
              }
            >
              {recentChats.length > 0 ? (
                <List
                  itemLayout="horizontal"
                  dataSource={recentChats}
                  renderItem={(chat: Chat) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleChatClick(chat.id)}
                      actions={[
                        <Button type="link" size="small">
                          Open
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={chat.avatar_url} 
                            icon={chat.type === 'direct' ? <UserOutlined /> : <UsergroupAddOutlined />}
                          />
                        }
                        title={
                          <Space>
                            {chat.name || 'Unnamed Chat'}
                            {chat.type === 'group' && (
                              <Tag icon={<UsergroupAddOutlined />} color="blue">
                                Group
                              </Tag>
                            )}
                          </Space>
                        }
                        description={chat.description || 'No description'}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No recent conversations" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Create Room Modal */}
        <Modal
          title="Create New Room"
          open={isCreateRoomModalVisible}
          onCancel={() => setIsCreateRoomModalVisible(false)}
          footer={null}
          width={500}
        >
          <Form
            form={createRoomForm}
            layout="vertical"
            onFinish={handleCreateRoom}
          >
            <Form.Item
              name="name"
              label="Room Name"
              rules={[
                { required: true, message: 'Please enter a room name' },
                { min: 3, message: 'Room name must be at least 3 characters' },
                { max: 50, message: 'Room name cannot exceed 50 characters' }
              ]}
            >
              <Input placeholder="Enter room name" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description (Optional)"
            >
              <Input.TextArea 
                placeholder="Enter room description" 
                rows={3}
                maxLength={200}
              />
            </Form.Item>

            <Form.Item
              name="isPrivate"
              label="Room Privacy"
              initialValue={false}
            >
              <Radio.Group>
                <Radio value={false}>
                  <Space>
                    <GlobalOutlined />
                    Public - Anyone can find and join
                  </Space>
                </Radio>
                <Radio value={true}>
                  <Space>
                    <LockOutlined />
                    Private - Invite only
                  </Space>
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsCreateRoomModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Create Room
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Search Rooms Modal */}
        <Modal
          title="Search Rooms"
          open={isSearchRoomModalVisible}
          onCancel={() => setIsSearchRoomModalVisible(false)}
          footer={null}
          width={600}
        >
          <Search
            placeholder="Search for rooms..."
            onSearch={handleSearchRooms}
            style={{ marginBottom: 16 }}
            enterButton
          />
          
          <Spin spinning={roomSearchLoading}>
            {roomSearchResults.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={roomSearchResults}
                renderItem={(room) => (
                  <List.Item
                    actions={[
                      room.isJoined ? (
                        <Button 
                          type="link" 
                          onClick={() => handleChatClick(room.id)}
                        >
                          Open
                        </Button>
                      ) : (
                        <Button 
                          type="primary" 
                          onClick={() => handleJoinRoom(room.id)}
                        >
                          Join
                        </Button>
                      )
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UsergroupAddOutlined />} />}
                      title={
                        <Space>
                          {room.name}
                          {room.type === 'group' && (
                            <Tag icon={room.is_private ? <LockOutlined /> : <GlobalOutlined />}>
                              {room.is_private ? 'Private' : 'Public'}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary">{room.description || 'No description'}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {room.memberCount} members
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No rooms found" />
            )}
          </Spin>
        </Modal>

        {/* Search Users Modal */}
        <Modal
          title="Find Users"
          open={isSearchUserModalVisible}
          onCancel={() => setIsSearchUserModalVisible(false)}
          footer={null}
          width={600}
        >
          <Search
            placeholder="Search for users..."
            onSearch={handleSearchUsers}
            style={{ marginBottom: 16 }}
            enterButton
          />
          
          <Spin spinning={userSearchLoading}>
            {userSearchResults.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={userSearchResults}
                renderItem={(user) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="primary" 
                        icon={<MessageOutlined />}
                        onClick={() => handleStartDirectMessage(user.id, user.username)}
                      >
                        Message
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          src={user.avatar_url} 
                          icon={<UserOutlined />}
                        />
                      }
                      title={
                        <Space>
                          {user.display_name}
                          <Tag color={getStatusColor(user.status)}>
                            {user.status}
                          </Tag>
                        </Space>
                      }
                      description={`@${user.username}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No users found" />
            )}
          </Spin>
        </Modal>
      </Content>
    </Layout>
  );
};

export default HomePage;
