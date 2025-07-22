import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SailorChat API',
      version: '1.0.0',
      description: 'A real-time chat application API with Socket.IO support',
      contact: {
        name: 'SailorChat Team',
        url: 'https://github.com/AnastasiosF/Sailor-Chat',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://your-domain.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
            },
            username: {
              type: 'string',
              description: 'User username',
              example: 'johndoe',
            },
            display_name: {
              type: 'string',
              description: 'User display name',
              example: 'John Doe',
            },
            avatar_url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'User avatar URL',
            },
            status: {
              type: 'string',
              enum: ['online', 'away', 'busy', 'offline'],
              description: 'User status',
            },
            is_online: {
              type: 'boolean',
              description: 'Whether user is currently online',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },
        Chat: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Chat unique identifier',
            },
            name: {
              type: 'string',
              nullable: true,
              description: 'Chat name',
              example: 'Project Team',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Chat description',
            },
            type: {
              type: 'string',
              enum: ['direct', 'group'],
              description: 'Chat type',
            },
            avatar_url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Chat avatar URL',
            },
            is_private: {
              type: 'boolean',
              description: 'Whether chat is private',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who created the chat',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Chat creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Chat last update timestamp',
            },
            last_message_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last message timestamp',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Message unique identifier',
            },
            chat_id: {
              type: 'string',
              format: 'uuid',
              description: 'Chat ID this message belongs to',
            },
            sender_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who sent the message',
            },
            content: {
              type: 'string',
              description: 'Message content',
              example: 'Hello everyone!',
            },
            type: {
              type: 'string',
              enum: ['text', 'image', 'file', 'system'],
              description: 'Message type',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Message creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Message last update timestamp',
            },
            sender: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            error: {
              type: 'string',
              description: 'Error message (only present on errors)',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            data: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {},
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'integer',
                      description: 'Current page number',
                    },
                    limit: {
                      type: 'integer',
                      description: 'Items per page',
                    },
                    total: {
                      type: 'integer',
                      description: 'Total number of items',
                    },
                    totalPages: {
                      type: 'integer',
                      description: 'Total number of pages',
                    },
                  },
                },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Username or email',
              example: 'johndoe',
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'securePassword123',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password', 'display_name'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'Username (3-30 characters, alphanumeric and underscores)',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Password (minimum 8 characters)',
              example: 'securePassword123',
            },
            display_name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Display name (1-100 characters)',
              example: 'John Doe',
            },
          },
        },
        CreateChatRequest: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['direct', 'group'],
              description: 'Chat type',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Chat name (optional for direct chats)',
              example: 'Project Team',
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Chat description',
              example: 'Discussion for the new project',
            },
            participant_ids: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Array of user IDs to add as participants',
            },
            is_private: {
              type: 'boolean',
              description: 'Whether the chat is private',
              default: false,
            },
          },
        },
        SendMessageRequest: {
          type: 'object',
          required: ['chat_id', 'content'],
          properties: {
            chat_id: {
              type: 'string',
              format: 'uuid',
              description: 'Chat ID to send message to',
            },
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              description: 'Message content',
              example: 'Hello everyone!',
            },
            type: {
              type: 'string',
              enum: ['text', 'image', 'file', 'system'],
              description: 'Message type',
              default: 'text',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Detailed error information',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI setup
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SailorChat API Documentation',
  }));

  // Raw OpenAPI spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger UI available at: http://localhost:3001/api-docs');
  console.log('📄 OpenAPI spec available at: http://localhost:3001/api-docs.json');
};

export default specs;
