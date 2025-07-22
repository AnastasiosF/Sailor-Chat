import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#ff4d4f', // Ant Design red
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <Router>
          <div className="app">
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={
                  isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />
                }
              />
              <Route
                path="/register"
                element={
                  isAuthenticated ? <Navigate to="/home" replace /> : <RegisterPage />
                }
              />
              <Route
                path="/verify-email"
                element={<VerifyEmailPage />}
              />

              {/* Protected routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:chatId"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

            {/* Default redirect */}
            <Route
              path="/"
              element={
                <Navigate to={isAuthenticated ? "/home" : "/login"} replace />
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
