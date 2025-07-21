import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { ApiResponse } from '../../shared/src/types';

// Load environment variables FIRST - Load development environment in development
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

// Check environment variables
import './utils/env-check';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'SailorChat API',
      version: '1.0.0',
      description: 'Secure chat application API',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        chats: '/api/chats',
        users: '/api/users',
        messages: '/api/messages',
      },
    },
  };
  res.json(response);
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`,
  };
  res.status(404).json(response);
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', error);
  
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
  };
  
  res.status(500).json(response);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let userId: string | null = null;
  let username: string | null = null;

  // Store user info when they authenticate
  socket.on('authenticate', (data: { userId: string, username: string }) => {
    userId = data.userId;
    username = data.username;
    console.log(`User authenticated: ${username} (${userId})`);
  });

  // Handle joining a chat room
  socket.on('join_chat', (chatId: string) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  // Handle leaving a chat room
  socket.on('leave_chat', (chatId: string) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User ${socket.id} left chat ${chatId}`);
  });

  // Handle typing indicators
  socket.on('typing_start', (chatId: string) => {
    if (userId && username) {
      socket.to(`chat_${chatId}`).emit('user_typing', {
        userId,
        username,
        chatId
      });
      console.log(`User ${username} started typing in chat ${chatId}`);
    }
  });

  socket.on('typing_stop', (chatId: string) => {
    if (userId) {
      socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
        userId,
        chatId
      });
      console.log(`User ${username} stopped typing in chat ${chatId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to other modules
export { io };

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 SailorChat API is running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
    console.log(`🔌 Socket.IO server is running`);
  });

  server.on('error', (error: any) => {
    console.error('❌ Server failed to start:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
  });
}

export default app;
