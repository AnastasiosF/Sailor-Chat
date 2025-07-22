import React from 'react';
import { Layout, Avatar, Typography, Space, Dropdown, Button, Divider } from 'antd';
import { UserOutlined, DownOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;
const { Text, Title } = Typography;

interface ChatHeaderProps {
  onLogout?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onLogout }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => {
        // Navigate to profile page when implemented
        console.log('Profile clicked');
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => {
        // Navigate to settings page when implemented
        console.log('Settings clicked');
      }
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true
    }
  ];

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* App Logo and Title */}
      <Space align="center" size="middle">
        <div
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          ⚓
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            SailorChat
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Real-time messaging
          </Text>
        </div>
      </Space>

      {/* User Info and Menu */}
      <Space align="center" size="middle">
        {user && (
          <>
            <Space align="center" size="small">
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
                  {user.display_name || user.username}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  @{user.username}
                </Text>
              </div>
              <Avatar
                size={40}
                src={user.avatar_url}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#667eea',
                  border: '2px solid #e5e7eb'
                }}
              />
            </Space>
            
            <Divider type="vertical" style={{ height: '24px' }} />
            
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<DownOutlined />}
                size="small"
                style={{
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center'
                }}
              />
            </Dropdown>
          </>
        )}
      </Space>
    </Header>
  );
};

export default ChatHeader;
