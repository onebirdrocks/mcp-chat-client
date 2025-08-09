# API Endpoints Documentation

This document describes the API endpoints implemented for the MCP Chat UI backend.

## Settings Endpoints

### GET/POST/PUT /api/settings

Manages application settings including LLM provider configurations, MCP server configurations, and user preferences.

**GET /api/settings**
- Returns current settings configuration
- Response: `Settings` object with `llmProviders`, `mcpServers`, and `preferences`

**POST /api/settings**
- Creates or updates settings configuration
- Request body: Partial `Settings` object
- Response: Updated `Settings` object

**PUT /api/settings**
- Updates settings configuration (same as POST)
- Request body: Partial `Settings` object
- Response: Updated `Settings` object

**Example Response:**
```json
{
  "llmProviders": [
    {
      "id": "openai-1",
      "name": "openai",
      "apiKey": "",
      "baseUrl": "https://api.openai.com/v1",
      "models": [
        {
          "id": "gpt-4",
          "name": "GPT-4",
          "supportsToolCalling": true,
          "maxTokens": 8192
        }
      ]
    }
  ],
  "mcpServers": [
    {
      "id": "filesystem-1",
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "enabled": false,
      "status": "disconnected"
    }
  ],
  "preferences": {
    "theme": "system",
    "language": "en",
    "autoScroll": true,
    "soundEnabled": false
  }
}
```

## Chat History Endpoints

### GET /api/chat-history

Retrieves chat session history with optional filtering and pagination.

**Query Parameters:**
- `limit` (optional): Number of sessions to return (1-100, default: 50)
- `offset` (optional): Number of sessions to skip (default: 0)
- `query` (optional): Search query for session titles/content
- `provider` (optional): Filter by LLM provider
- `sortBy` (optional): Sort field ('createdAt', 'updatedAt', 'title', default: 'updatedAt')
- `sortOrder` (optional): Sort order ('asc', 'desc', default: 'desc')

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "title": "Test Session",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "messageCount": 5,
      "provider": "openai",
      "model": "gpt-4"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

### DELETE /api/chat-history

Deletes a chat session.

**Query Parameters:**
- `sessionId` (required): ID of the session to delete

**Response:**
```json
{
  "success": true
}
```

### PUT /api/chat-history

Updates a chat session (e.g., rename).

**Query Parameters:**
- `sessionId` (required): ID of the session to update

**Request Body:**
```json
{
  "title": "New Session Title"
}
```

**Response:**
```json
{
  "id": "session-1",
  "title": "New Session Title",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Individual Session Endpoints

### GET /api/chat-history/[sessionId]

Retrieves a complete chat session with all messages.

**Response:**
```json
{
  "id": "session-1",
  "title": "Test Session",
  "messages": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": []
}
```

### PUT /api/chat-history/[sessionId]

Updates a specific chat session.

**Request Body:**
```json
{
  "title": "Updated Title",
  "messages": [] // Optional: update messages
}
```

### DELETE /api/chat-history/[sessionId]

Deletes a specific chat session.

**Response:**
```json
{
  "success": true
}
```

## Error Handling

All endpoints use consistent error handling:

- **400 Bad Request**: Validation errors, invalid parameters
- **404 Not Found**: Session not found
- **500 Internal Server Error**: Server errors

**Error Response Format:**
```json
{
  "error": "ValidationError",
  "message": "Detailed error message",
  "statusCode": 400
}
```

## CORS Support

All endpoints include CORS headers for local development:
- Allowed origins: `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`
- Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- Credentials supported: `true`

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **2.2**: API credentials storage - Settings endpoints manage LLM provider configurations with secure API key storage
- **7.2**: Encrypted storage - API keys are stored securely in local browser storage (frontend responsibility)
- **9.2**: Display list of conversations - GET /api/chat-history returns paginated session list
- **9.3**: Load complete conversation - GET /api/chat-history/[sessionId] returns full session with messages
- **9.4**: Rename, delete, archive conversations - PUT and DELETE endpoints support session management operations