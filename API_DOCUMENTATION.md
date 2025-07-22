# SailorChat API Documentation

## Overview

SailorChat is a real-time chat application with REST API endpoints and WebSocket support for instant messaging. This documentation covers all available endpoints, request/response formats, authentication, and WebSocket events.

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

SailorChat uses JWT (JSON Web Tokens) for authentication with refresh token rotation.

### Authentication Flow

1. **Register** or **Login** to get access and refresh tokens
2. Include access token in `Authorization` header: `Bearer <access_token>`
3. Use refresh token to get new access tokens when they expire
4. Access tokens expire in 15 minutes, refresh tokens expire in 7 days

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "error": string (only on errors),
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  } (only for paginated responses)
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "SailorChat API is running",
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### Register User

#### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "display_name": "John Doe"
}
```

**Validation:**
- `username`: 3-30 characters, alphanumeric and underscores only
- `email`: Valid email format
- `password`: Minimum 8 characters, at least one uppercase, lowercase, number
- `display_name`: 1-100 characters

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "display_name": "John Doe",
      "status": "offline",
      "is_online": false,
      "created_at": "2025-01-22T10:30:00.000Z"
    }
  }
}
```

### Login User

#### POST /auth/login

Authenticate user and get tokens.

**Request:**
```json
{
  "username": "johndoe",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "avatar_url": null,
      "status": "online",
      "is_online": true
    },
    "access_token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token",
    "expires_in": 900
  }
}
```

### Refresh Token

#### POST /auth/refresh

Get a new access token using refresh token.

**Request:**
```json
{
  "refresh_token": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new_jwt_access_token",
    "refresh_token": "new_jwt_refresh_token",
    "expires_in": 900
  }
}
```

### Verify Email

#### POST /auth/verify-email

Verify user email with verification token.

**Request:**
```json
{
  "token": "verification_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

### Resend Verification

#### POST /auth/resend-verification

Resend email verification.

**Request:**
```json
{
  "email": "john@example.com"
}
```

### Logout

#### POST /auth/logout

Logout user and invalidate tokens.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User

#### GET /auth/me

Get current authenticated user information.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": null,
    "status": "online",
    "is_online": true,
    "created_at": "2025-01-22T10:30:00.000Z"
  }
}
```

---

## Chat Endpoints

All chat endpoints require authentication.

### Create Chat

#### POST /chats

Create a new chat room.

**Request:**
```json
{
  "type": "group",
  "name": "Project Team",
  "description": "Discussion for the new project",
  "participant_ids": ["user_uuid_1", "user_uuid_2"],
  "is_private": false
}
```

**Validation:**
- `type`: "direct" or "group"
- `name`: 1-100 characters (optional for direct chats)
- `description`: max 500 characters (optional)
- `participant_ids`: array of user UUIDs (optional)
- `is_private`: boolean (optional, default false)

**Response:**
```json
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "id": "chat_uuid",
    "name": "Project Team",
    "description": "Discussion for the new project",
    "type": "group",
    "is_private": false,
    "created_by": "user_uuid",
    "created_at": "2025-01-22T10:30:00.000Z",
    "participants": [...]
  }
}
```

### Get User Chats

#### GET /chats

Get all chats for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chat_uuid",
      "name": "Project Team",
      "type": "group",
      "avatar_url": null,
      "last_message_at": "2025-01-22T10:30:00.000Z",
      "participants": [...]
    }
  ]
}
```

### Get Chat by ID

#### GET /chats/:chatId

Get specific chat details.

**Parameters:**
- `chatId`: UUID of the chat

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chat_uuid",
    "name": "Project Team",
    "description": "Discussion for the new project",
    "type": "group",
    "participants": [...]
  }
}
```

### Search Chats

#### GET /chats/search

Search for public chats.

**Query Parameters:**
- `query`: Search term (minimum 2 characters)
- `type`: Filter by chat type ("direct" or "group") - optional

**Example:**
```http
GET /api/chats/search?query=project&type=group
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chat_uuid",
      "name": "Project Team",
      "type": "group",
      "description": "Discussion for the new project",
      "participants_count": 5
    }
  ]
}
```

### Join Chat

#### POST /chats/:chatId/join

Join a public chat.

**Parameters:**
- `chatId`: UUID of the chat to join

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined chat"
}
```

---

## Message Endpoints

All message endpoints require authentication.

### Send Message

#### POST /messages

Send a message to a chat.

**Request:**
```json
{
  "chat_id": "chat_uuid",
  "content": "Hello everyone!",
  "type": "text"
}
```

**Validation:**
- `chat_id`: Valid UUID
- `content`: 1-2000 characters
- `type`: "text", "image", "file", or "system"

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "message_uuid",
    "chat_id": "chat_uuid",
    "sender_id": "user_uuid",
    "content": "Hello everyone!",
    "type": "text",
    "created_at": "2025-01-22T10:30:00.000Z",
    "sender": {
      "username": "johndoe",
      "display_name": "John Doe"
    }
  }
}
```

### Get Chat Messages

#### GET /messages/chat/:chatId

Get messages for a specific chat with pagination.

**Parameters:**
- `chatId`: UUID of the chat

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 50, max: 100)

**Example:**
```http
GET /api/messages/chat/chat_uuid?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "message_uuid",
        "chat_id": "chat_uuid",
        "content": "Hello everyone!",
        "type": "text",
        "created_at": "2025-01-22T10:30:00.000Z",
        "sender": {
          "id": "user_uuid",
          "username": "johndoe",
          "display_name": "John Doe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

### Edit Message

#### PUT /messages/:messageId

Edit an existing message (only by sender).

**Parameters:**
- `messageId`: UUID of the message

**Request:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message updated successfully",
  "data": {
    "id": "message_uuid",
    "content": "Updated message content",
    "updated_at": "2025-01-22T10:35:00.000Z"
  }
}
```

### Delete Message

#### DELETE /messages/:messageId

Delete a message (only by sender).

**Parameters:**
- `messageId`: UUID of the message

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

### Mark Messages as Read

#### POST /messages/chat/:chatId/read

Mark all messages in a chat as read.

**Parameters:**
- `chatId`: UUID of the chat

**Response:**
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

### Send Direct Message

#### POST /messages/direct

Send a direct message to a user.

**Request:**
```json
{
  "recipient_id": "user_uuid",
  "content": "Hi there!",
  "type": "text"
}
```

### Get Direct Message Conversations

#### GET /messages/conversations

Get list of direct message conversations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "chat_id": "chat_uuid",
      "participant": {
        "id": "user_uuid",
        "username": "janedoe",
        "display_name": "Jane Doe"
      },
      "last_message": {
        "content": "See you tomorrow!",
        "created_at": "2025-01-22T10:30:00.000Z"
      }
    }
  ]
}
```

---

## User Endpoints

All user endpoints require authentication.

### Search Users

#### GET /users/search

Search for users by username or display name.

**Query Parameters:**
- `query`: Search term (minimum 2 characters)

**Example:**
```http
GET /api/users/search?query=john
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "avatar_url": null,
      "status": "online",
      "is_online": true
    }
  ]
}
```

### Get User Profile

#### GET /users/:userId

Get public profile of a specific user.

**Parameters:**
- `userId`: UUID of the user

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": null,
    "status": "online",
    "last_seen": "2025-01-22T10:30:00.000Z"
  }
}
```

### Update User Profile

#### PUT /users/profile

Update current user's profile.

**Request:**
```json
{
  "display_name": "John Smith",
  "avatar_url": "https://example.com/avatar.jpg",
  "status": "away"
}
```

**Validation:**
- `display_name`: 1-100 characters (optional)
- `avatar_url`: Valid URL (optional)
- `status`: "online", "away", "busy", or "offline" (optional)

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "display_name": "John Smith",
    "avatar_url": "https://example.com/avatar.jpg",
    "status": "away"
  }
}
```

### Update User Status

#### PUT /users/status

Update user's online status.

**Request:**
```json
{
  "status": "away",
  "is_online": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

---

## End-to-End Encryption Endpoints

All E2E endpoints require authentication.

### Setup Encryption Keys

#### POST /e2e/setup-keys

Setup E2E encryption keys for the user.

**Request:**
```json
{
  "public_key_encryption": "base64_encoded_public_key",
  "public_key_signing": "base64_encoded_signing_key",
  "encrypted_private_keys": "encrypted_private_keys_bundle",
  "salt": "random_salt_for_key_derivation",
  "nonce": "encryption_nonce"
}
```

### Get Public Keys

#### GET /e2e/public-keys/:userId

Get public keys for a specific user.

**Parameters:**
- `userId`: UUID of the user

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_uuid",
    "public_key_encryption": "base64_encoded_public_key",
    "public_key_signing": "base64_encoded_signing_key"
  }
}
```

### Initiate Key Exchange

#### POST /e2e/key-exchange/initiate

Initiate key exchange for secure communication.

**Request:**
```json
{
  "recipient_id": "user_uuid",
  "chat_id": "chat_uuid",
  "ephemeral_public_key": "base64_encoded_ephemeral_key"
}
```

### Complete Key Exchange

#### POST /e2e/key-exchange/complete

Complete the key exchange process.

**Request:**
```json
{
  "session_id": "session_uuid",
  "ephemeral_public_key": "base64_encoded_ephemeral_key"
}
```

### Get Pending Key Exchanges

#### GET /e2e/key-exchange/pending

Get list of pending key exchange requests.

### Register Device

#### POST /e2e/devices

Register a new device for multi-device E2E encryption.

**Request:**
```json
{
  "device_name": "iPhone 13",
  "device_fingerprint": "unique_device_identifier",
  "public_key_encryption": "device_public_key",
  "public_key_signing": "device_signing_key"
}
```

### Get User Devices

#### GET /e2e/devices

Get list of registered devices for the current user.

---

## WebSocket Events

SailorChat uses Socket.IO for real-time communication.

### Connection

Connect to WebSocket server:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_access_token'
  }
});
```

### Client Events (Emit)

#### authenticate
Authenticate the socket connection.

```javascript
socket.emit('authenticate', {
  userId: 'user_uuid',
  username: 'johndoe'
});
```

#### join_chat
Join a chat room.

```javascript
socket.emit('join_chat', 'chat_uuid');
```

#### leave_chat
Leave a chat room.

```javascript
socket.emit('leave_chat', 'chat_uuid');
```

#### typing_start
Indicate user started typing.

```javascript
socket.emit('typing_start', 'chat_uuid');
```

#### typing_stop
Indicate user stopped typing.

```javascript
socket.emit('typing_stop', 'chat_uuid');
```

### Server Events (Listen)

#### new_message
Receive new messages in real-time.

```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // message object contains: id, chat_id, sender_id, content, type, created_at, sender
});
```

#### user_typing
Receive typing indicators from other users.

```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // data: { userId, username, chatId }
});
```

#### user_stopped_typing
Receive when users stop typing.

```javascript
socket.on('user_stopped_typing', (data) => {
  console.log('User stopped typing:', data);
  // data: { userId, chatId }
});
```

#### connect
Socket connection established.

```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

#### disconnect
Socket connection lost.

```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

#### connect_error
Connection error occurred.

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Message endpoints**: 100 requests per minute per user
- **Other endpoints**: 60 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

---

## Security

### HTTPS
All production API calls must use HTTPS.

### CORS
Cross-Origin Resource Sharing is configured to allow requests from authorized domains only.

### Input Validation
All inputs are validated and sanitized to prevent injection attacks.

### Authentication
JWT tokens are signed with a secure secret and include expiration times.

### Database Security
Row Level Security (RLS) is implemented in Supabase to ensure data isolation.

---

## Environment Variables

### Server (.env)
```env
# Server Configuration
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000

# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Client (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001

# Database (Client-side access)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Example Usage

### JavaScript/TypeScript Client

```javascript
class SailorChatAPI {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    return response.json();
  }

  // Authentication
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Chats
  async getChats() {
    return this.request('/chats');
  }

  async sendMessage(chatId, content) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, content, type: 'text' }),
    });
  }

  // WebSocket
  connectSocket() {
    this.socket = io(this.baseUrl.replace('/api', ''), {
      auth: { token: this.accessToken }
    });

    this.socket.on('new_message', (message) => {
      this.onNewMessage(message);
    });
  }
}

// Usage
const api = new SailorChatAPI('http://localhost:3001/api', 'your_access_token');
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"securePassword123"}'

# Get chats
curl -X GET http://localhost:3001/api/chats \
  -H "Authorization: Bearer your_access_token"

# Send message
curl -X POST http://localhost:3001/api/messages \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"chat_uuid","content":"Hello!","type":"text"}'
```

---

## Support

For API questions or issues:
- Create an issue in the GitHub repository
- Check existing documentation and examples
- Review error messages and status codes for debugging

## Changelog

### v1.0.0
- Initial API release
- Basic authentication and chat functionality
- Real-time messaging with WebSocket
- End-to-end encryption support
