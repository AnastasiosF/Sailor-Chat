# SailorChat - Secure Real-Time Chat Application

A modern, secure real-time chat application with advanced messaging features, typing indicators, and end-to-end encryption capabilities.

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- Secure user registration and login
- Row Level Security (RLS) policies
- API-only database access (no direct client access)
- Input validation and sanitization
- Rate limiting protection

### 💬 Real-Time Messaging
- Instant message delivery with Socket.IO
- Live typing indicators
- Message read receipts
- Auto-scroll to latest messages
- Real-time participant notifications

### 🎯 Chat Management
- Direct messages between users
- Group chat creation and management
- Public/private chat rooms
- Chat search functionality
- User search and discovery
- Join/leave chat rooms

### 🎨 User Experience
- Modern UI with Ant Design components
- Responsive design for all devices
- Dark/light message themes
- Message bubble styling (sender vs participants)
- Back navigation to home page
- Real-time status indicators

### 🔒 Privacy & Encryption
- Browser-compatible E2E encryption service
- Message encryption at rest
- Secure key management
- Device-specific encryption keys

## Architecture

- **Database**: Supabase PostgreSQL with RLS (Row Level Security)
- **Authentication**: Supabase Auth with JWT tokens and refresh tokens
- **API**: TypeScript + Express.js (secure proxy to database)
- **Client**: React + Ant Design + TypeScript + Zustand
- **Real-time**: Socket.IO for live messaging and typing indicators
- **Security**: All database access through API, no direct client access

## Project Structure

```text
SailorChat/
├── database/          # Database schema and migrations
├── api/               # Express.js API server
│   ├── src/
│   │   ├── controllers/   # Route handlers and business logic
│   │   ├── middleware/    # Authentication, validation, etc.
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # External service integrations
│   │   └── utils/         # Helper functions and utilities
├── client/            # React web application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages/screens
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API and Socket.IO services
│   │   └── types/         # TypeScript type definitions
└── shared/            # Shared types and utilities
    └── src/
        ├── types.ts       # Common TypeScript interfaces
        └── utils.ts       # Shared utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SailorChat
   ```

2. **Set up Supabase project**
   - Create a new Supabase project
   - Copy your project URL and API keys
   - Run database migrations (see `/database` folder)

3. **Configure environment variables**
   - Copy `.env.example` to `.env` in both `api/` and `client/` directories
   - Fill in your Supabase credentials and other configuration

4. **Install dependencies**
   ```bash
   # Install API dependencies
   cd api && npm install

   # Install client dependencies
   cd ../client && npm install
   ```

5. **Start the applications**
   ```bash
   # Start API server (from api/ directory)
   npm run dev

   # Start client application (from client/ directory)
   npm run dev
   ```

6. **Access the application**
   - Client: http://localhost:3000
   - API: http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Chat Management
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:chatId` - Get specific chat details
- `GET /api/chats/search` - Search public chats
- `POST /api/chats/:chatId/join` - Join a chat room

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/chat/:chatId` - Get chat messages
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/chat/:chatId/read` - Mark messages as read
- `POST /api/messages/direct` - Send direct message

### Users
- `GET /api/users/search` - Search users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Socket.IO Events

### Client to Server
- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server to Client
- `new_message` - New message received
- `user_typing` - User started typing
- `user_stopped_typing` - User stopped typing

## Security Features

- JWT-based authentication with refresh tokens
- Row Level Security (RLS) policies
- API-only database access
- Message encryption at rest
- Rate limiting
- Input validation and sanitization
- CORS protection
- Helmet security headers

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Real-time**: Socket.IO
- **Validation**: express-validator
- **Security**: Helmet, CORS, rate limiting

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Ant Design
- **State Management**: Zustand
- **Routing**: React Router
- **Real-time**: Socket.IO Client
- **Build Tool**: Vite
- **Styling**: CSS-in-JS with Ant Design themes

### Database
- **Primary**: Supabase PostgreSQL
- **Features**: Row Level Security, Real-time subscriptions
- **Migrations**: SQL-based schema management

## Development

### Project Scripts

**API Server:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run test suite

**Client Application:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## Deployment

### Production Environment

1. **Database Setup**
   - Use Supabase production project
   - Run all migrations
   - Configure RLS policies

2. **API Deployment**
   - Set production environment variables
   - Deploy to your preferred platform (Vercel, Railway, etc.)
   - Configure CORS for your domain

3. **Client Deployment**
   - Update API URLs for production
   - Build the application
   - Deploy to static hosting (Vercel, Netlify, etc.)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email anastasiosfortis@gmail.com or create an issue in the GitHub repository.
