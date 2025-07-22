import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { LoginRequest } from '../../../shared/src/types';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setUser, setError } = useAuthStore();
  const navigate = useNavigate();

  const onFinish = async (values: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(values);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        message.success('Welcome back!');
        navigate('/chat');
      } else {
        message.error(response.error || 'Login failed');
        setError(response.error || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Login failed';
      message.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            SailorChat
          </Title>
          <Text type="secondary">
            Welcome back! Please sign in to your account.
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 48 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="small">
            <Text type="secondary">
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#1890ff' }}>
                Sign up now
              </Link>
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
