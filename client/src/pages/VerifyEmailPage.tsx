import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, Result, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type') || 'signup';

      if (!token) {
        setError('Invalid verification link');
        setVerified(false);
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.verifyEmail({
          token,
          type: type as 'signup' | 'email_change',
        });

        if (response.success && response.data) {
          setUser(response.data.user);
          setVerified(true);

          // Redirect to chat after a delay
          setTimeout(() => {
            navigate('/chat');
          }, 3000);
        } else {
          setError(response.error || 'Email verification failed');
          setVerified(false);
        }
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || 'Email verification failed';
        setError(errorMessage);
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams, setUser, navigate]);

  if (loading) {
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
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: '20px' }}>
            <Title level={3}>Verifying Your Email</Title>
            <Text type="secondary">Please wait while we verify your email address...</Text>
          </div>
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
        {verified ? (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Email Verified Successfully!"
            subTitle="Your account has been activated. You will be redirected to the chat in a few seconds."
            extra={[
              <Button type="primary" key="chat">
                <Link to="/chat">Go to Chat</Link>
              </Button>,
              <Button key="login">
                <Link to="/login">Sign In</Link>
              </Button>,
            ]}
          />
        ) : (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title="Email Verification Failed"
            subTitle={error || 'The verification link is invalid or has expired.'}
            extra={[
              <Button type="primary" key="register">
                <Link to="/register">Create New Account</Link>
              </Button>,
              <Button key="login">
                <Link to="/login">Sign In</Link>
              </Button>,
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
