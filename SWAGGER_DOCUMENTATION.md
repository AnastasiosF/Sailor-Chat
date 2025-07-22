# Swagger API Documentation

SailorChat now includes interactive Swagger/OpenAPI documentation for easy API exploration and testing.

## 🌐 Access Swagger UI

Once your API server is running, you can access the interactive documentation at:

**Swagger UI**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

**OpenAPI Spec (JSON)**: [http://localhost:3001/api-docs.json](http://localhost:3001/api-docs.json)

## 📚 Features

### **Interactive API Testing**
- Test all API endpoints directly from the browser
- Built-in request/response examples
- Authentication support with JWT Bearer tokens
- Real-time validation and error handling

### **Comprehensive Documentation**
- Complete endpoint descriptions
- Request/response schemas
- Validation rules and constraints
- Error codes and examples

### **Security Testing**
- JWT authentication integration
- Bearer token input field
- Protected endpoint testing

## 🚀 Getting Started

### 1. Start the API Server
```bash
cd api
npm run dev
```

### 2. Open Swagger UI
Navigate to [http://localhost:3001/api-docs](http://localhost:3001/api-docs) in your browser.

### 3. Authenticate (Optional)
For protected endpoints:
1. Click the **"Authorize"** button (🔒 icon)
2. Enter your JWT token in the format: `Bearer your_jwt_token_here`
3. Click **"Authorize"**

### 4. Test Endpoints
1. Expand any endpoint section
2. Click **"Try it out"**
3. Fill in required parameters
4. Click **"Execute"**
5. View the response

## 📋 Available Endpoint Groups

### **Authentication** (`/api/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/logout` - User logout (protected)
- `GET /auth/me` - Get current user (protected)

### **Chats** (`/api/chats`)
- `POST /chats` - Create new chat (protected)
- `GET /chats` - Get user's chats (protected)
- `GET /chats/search` - Search public chats (protected)
- `GET /chats/{chatId}` - Get chat by ID (protected)
- `POST /chats/{chatId}/join` - Join a chat (protected)

### **Messages** (`/api/messages`)
- `POST /messages` - Send message (protected)
- `GET /messages/chat/{chatId}` - Get chat messages (protected)
- `PUT /messages/{messageId}` - Edit message (protected)
- `DELETE /messages/{messageId}` - Delete message (protected)
- `POST /messages/chat/{chatId}/read` - Mark as read (protected)
- `POST /messages/direct` - Send direct message (protected)
- `GET /messages/conversations` - Get DM conversations (protected)

### **Users** (`/api/users`)
- `GET /users/search` - Search users (protected)
- `GET /users/{userId}` - Get user profile (protected)
- `PUT /users/profile` - Update profile (protected)
- `PUT /users/status` - Update status (protected)

### **End-to-End Encryption** (`/api/e2e`)
- `POST /e2e/setup-keys` - Setup encryption keys (protected)
- `GET /e2e/public-keys/{userId}` - Get public keys (protected)
- `POST /e2e/key-exchange/initiate` - Initiate key exchange (protected)
- `POST /e2e/key-exchange/complete` - Complete key exchange (protected)
- `GET /e2e/key-exchange/pending` - Get pending exchanges (protected)
- `POST /e2e/devices` - Register device (protected)
- `GET /e2e/devices` - Get user devices (protected)

### **Health** (`/api/health`)
- `GET /health` - API health check (public)

## 🔧 Development

### Adding New Endpoints

To add Swagger documentation for new endpoints:

1. **Add JSDoc comments** to your route files:
```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Your endpoint description
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YourSchema'
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
```

2. **Add schemas** to `api/src/config/swagger.ts` if needed:
```typescript
YourSchema: {
  type: 'object',
  required: ['field1', 'field2'],
  properties: {
    field1: {
      type: 'string',
      description: 'Field description'
    }
  }
}
```

3. **Restart the server** to see changes

### Customizing Swagger UI

Edit `api/src/config/swagger.ts` to:
- Update API information (title, version, description)
- Add new schemas and components
- Configure security schemes
- Modify UI appearance

## 📖 Schema Documentation

All request/response schemas are defined in the Swagger configuration and include:

- **Data types and formats**
- **Validation rules** (min/max length, required fields)
- **Example values**
- **Enum constraints**
- **Nested object relationships**

## 🌐 Production Deployment

For production deployment:

1. Update the server URL in `swagger.ts`:
```typescript
servers: [
  {
    url: 'https://your-domain.com/api',
    description: 'Production server',
  }
]
```

2. Consider security:
- Disable Swagger UI in production if needed
- Use HTTPS for all API calls
- Implement proper CORS policies

## 🔗 Integration with Other Tools

### **Postman Collection Generation**
Generate a Postman collection from the OpenAPI spec:
```bash
curl http://localhost:3001/api-docs.json > sailorchat-api.json
```
Import this file into Postman for team collaboration.

### **Code Generation**
Use the OpenAPI spec to generate client SDKs:
- JavaScript/TypeScript clients
- Python clients
- Mobile app integrations

## 📚 Additional Resources

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3/)
- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/)
- [JSDoc to OpenAPI](https://github.com/Surnet/swagger-jsdoc)

---

The Swagger documentation provides a comprehensive, interactive way to explore and test the SailorChat API, making development and integration much easier for both internal teams and external developers.
