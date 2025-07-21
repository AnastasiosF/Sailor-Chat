# SailorChat Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Git (optional)

## Quick Setup

### 1. Install Dependencies

**Windows:**
```bash
.\setup.bat
```

**Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Manual Setup:**
```bash
# Install shared dependencies
cd shared && npm install && npm run build && cd ..

# Install API dependencies
cd api && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and keys
3. Go to SQL Editor and run the database setup **IN THIS ORDER**:

```sql
-- 1. First, copy and run the contents of database/schema.sql
-- 2. Then copy and run the contents of database/rls-policies.sql  
-- 3. Finally, run database/migration.sql
```

**Important:** If you have an existing database from a previous version, also run:
```sql
-- 4. Run database/add_is_private_migration.sql to add the new is_private field
```

This migration script safely adds the `is_private` field to existing chat tables and sets appropriate default values.

### 3. Environment Configuration

**API Configuration (`api/.env`):**
```bash
cp api/.env.example api/.env
```

Edit `api/.env` with your values:
```env
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Client Configuration (`client/.env`):**
```bash
cp client/.env.example client/.env
```

Edit `client/.env` with your values:
```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Applications

**Terminal 1 - API Server:**
```bash
cd api
npm run dev
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```

### 5. Access the Application

- Client: http://localhost:3000
- API: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## Database Schema

The application uses the following main tables:

- `users` - User profiles (extends Supabase auth.users)
- `chats` - Chat rooms (direct and group)
- `chat_participants` - Users in chats
- `messages` - Chat messages
- `message_reactions` - Message reactions
- `user_sessions` - Refresh token management

## Security Features

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure token-based auth
- **Refresh Tokens** - Automatic session renewal
- **API-Only Database Access** - Clients can't directly access DB
- **Input Validation** - Server-side validation
- **Rate Limiting** - API abuse prevention
- **CORS Protection** - Cross-origin request security

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/chat/:chatId` - Get chat messages
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/chat/:chatId/read` - Mark as read

## Development

### Project Structure
```
├── database/           # Database schema and migrations
├── shared/            # Shared types and utilities
├── api/               # Express.js API server
├── client/            # React web application
├── setup.sh           # Setup script (Linux/macOS)
└── setup.bat          # Setup script (Windows)
```

### Available Scripts

**API:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

**Client:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Shared:**
- `npm run build` - Build shared types
- `npm run dev` - Watch mode for development

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Run `npm install` in the respective directory
   - Make sure to build shared types: `cd shared && npm run build`

2. **Database connection errors**
   - Check your Supabase URL and keys in `.env`
   - Ensure RLS policies are applied
   - Verify service role key permissions

3. **CORS errors**
   - Check `CORS_ORIGINS` in API `.env`
   - Ensure client URL is included

4. **Authentication issues**
   - Verify JWT_SECRET is set and consistent
   - Check token expiration settings
   - Ensure Supabase auth is properly configured

### Development Tips

- Use browser developer tools to debug API calls
- Check API logs for detailed error messages
- Monitor Supabase logs for database issues
- Use `npm run lint` to catch code issues early

## Production Deployment

### API Deployment
1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS origins
4. Set up process management (PM2, Docker, etc.)
5. Use HTTPS in production

### Client Deployment
1. Update API URLs in `.env`
2. Build with `npm run build`
3. Serve static files with a web server
4. Configure proper routing for SPA

### Database
1. Use Supabase production environment
2. Regular backups
3. Monitor performance
4. Set up alerts for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
