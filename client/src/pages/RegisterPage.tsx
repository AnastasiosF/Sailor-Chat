import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { RegisterRequest } from '../../../shared/src/types';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'form' | 'verification'>('form');
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [resendLoading, setResendLoading] = useState(false);

  const onFinish = async (values: RegisterRequest) => {
    setLoading(true);

    try {
      const response = await authApi.register(values);

      if (response.success) {
        setRegisteredEmail(values.email);
        setRegistrationStep('verification');
        message.success('Registration successful! Please check your email to verify your account.');
      } else {
        message.error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Registration failed';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);

    try {
      const response = await authApi.resendVerification({ email: registeredEmail });

      if (response.success) {
        message.success('Verification email sent! Please check your inbox.');
      } else {
        message.error(response.error || 'Failed to resend verification email');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to resend verification email';
      message.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  if (registrationStep === 'verification') {
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
            maxWidth: '450px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              Verify Your Email
            </Title>
            <Text type="secondary">
              We've sent a verification link to your email address
            </Text>
          </div>

          <Alert
            message="Check Your Email"
            description={
              <div>
                <p>We've sent a verification link to <strong>{registeredEmail}</strong></p>
                <p>Click the link in the email to activate your account and complete the registration process.</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Button
              type="primary"
              loading={resendLoading}
              onClick={handleResendVerification}
              style={{
                width: '100%',
                height: '45px',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            >
              Resend Verification Email
            </Button>

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                Already verified? <Link to="/login">Sign In</Link>
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    );
  }

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
          maxWidth: '450px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            Create Account
          </Title>
          <Text type="secondary">
            Join SailorChat and start connecting
          </Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              {
                required: true,
                message: 'Please input your email!',
              },
              {
                type: 'email',
                message: 'Please enter a valid email address!',
              },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your email"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[
              {
                required: true,
                message: 'Please input your username!',
              },
              {
                min: 3,
                max: 50,
                message: 'Username must be between 3 and 50 characters!',
              },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Username can only contain letters, numbers, and underscores!',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Choose a username"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Display Name"
            rules={[
              {
                required: true,
                message: 'Please input your display name!',
              },
              {
                min: 1,
                max: 100,
                message: 'Display name must be between 1 and 100 characters!',
              },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="Enter your display name"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              {
                required: true,
                message: 'Please input your password!',
              },
              {
                min: 8,
                max: 128,
                message: 'Password must be between 8 and 128 characters!',
              },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number!',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Create a password"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              {
                required: true,
                message: 'Please confirm your password!',
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm your password"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                height: '45px',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              Create Account
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Already have an account? <Link to="/login">Sign In</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
