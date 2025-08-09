# MCP Chat UI Backend

Next.js backend API server for the MCP Chat UI application.

## Features

- **RESTful API**: Clean API endpoints for chat, settings, and tool execution
- **CORS Support**: Configured for frontend integration
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Type Safety**: Full TypeScript support with strict typing
- **Security**: Built-in security headers and input validation
- **Health Checks**: Health monitoring endpoint

## API Endpoints

### Chat
- `POST /api/chat` - Send chat messages and receive responses
- `GET /api/chat-history` - Retrieve chat session history
- `DELETE /api/chat-history?sessionId=<id>` - Delete a chat session

### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings

### Tool Execution
- `POST /api/run-tool` - Execute MCP tools
- `POST /api/cancel-tool` - Cancel running tool execution

### System
- `GET /api/health` - Health check endpoint

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Server will start on http://localhost:3001

### Build
```bash
npm run build
```

### Production
```bash
npm run start
```

## Configuration

### Environment Variables
Create a `.env.local` file:
```env
# API Configuration
API_PORT=3001
FRONTEND_URL=http://localhost:5173

# Security
JWT_SECRET=your-jwt-secret-here

# Database (when implemented)
DATABASE_URL=your-database-url-here
```

### CORS Configuration
CORS is configured to allow requests from:
- http://localhost:5173 (Vite dev server)
- http://localhost:3000 (Next.js dev server)
- http://localhost:4173 (Vite preview)

## Project Structure

```
backend/
├── src/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   │   ├── chat/
│   │   │   ├── settings/
│   │   │   ├── chat-history/
│   │   │   ├── run-tool/
│   │   │   ├── cancel-tool/
│   │   │   └── health/
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── lib/               # Utility libraries
│   │   ├── cors.ts        # CORS handling
│   │   ├── errors.ts      # Error handling
│   │   └── validation.ts  # Input validation
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   └── middleware.ts      # Global middleware
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── package.json
```

## API Usage Examples

### Send Chat Message
```javascript
const response = await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { id: '1', role: 'user', content: 'Hello!', timestamp: new Date() }
    ],
    sessionId: 'session-123',
    provider: 'openai',
    model: 'gpt-4'
  })
});
```

### Get Settings
```javascript
const settings = await fetch('http://localhost:3001/api/settings');
const data = await settings.json();
```

### Execute Tool
```javascript
const response = await fetch('http://localhost:3001/api/run-tool', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    toolCall: {
      id: 'call-123',
      type: 'function',
      function: {
        name: 'read_file',
        arguments: JSON.stringify({ path: '/path/to/file.txt' })
      }
    },
    sessionId: 'session-123',
    messages: []
  })
});
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "ValidationError",
  "message": "Detailed error message",
  "statusCode": 400
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Security Features

- **CORS Protection**: Configured allowed origins
- **Input Validation**: All inputs are validated and sanitized
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, etc.
- **Error Sanitization**: Sensitive information is not exposed in error messages

## Next Steps

This backend provides the foundation for:
1. LLM provider integration (OpenAI, DeepSeek, OpenRouter)
2. MCP server management and tool execution
3. Database integration for persistent storage
4. Authentication and authorization
5. Real-time features with WebSockets