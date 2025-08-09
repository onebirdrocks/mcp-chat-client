# Session Management Service

This document describes the SessionManager service and its API endpoints for managing chat sessions in the MCP Chat UI backend.

## SessionManager Features

The SessionManager provides comprehensive session management capabilities:

- **Session Storage**: Persistent storage of chat sessions with file-based storage
- **Session Retrieval**: Get individual sessions or search/filter multiple sessions
- **Session Cleanup**: Automatic cleanup of old sessions based on age and count limits
- **Session Search**: Search sessions by title or message content, filter by provider
- **Automatic Title Generation**: Generate session titles using LLM services
- **Session Statistics**: Get usage statistics and provider breakdowns

## API Endpoints

### Session Management

#### Create New Session
```http
POST /api/sessions
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": ["server1", "server2"],
  "initialMessage": {
    "id": "msg-1",
    "role": "user",
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Session
```http
GET /api/chat-history/{sessionId}
```

#### Update Session
```http
PUT /api/chat-history/{sessionId}
Content-Type: application/json

{
  "title": "Updated Session Title",
  "messages": [...]
}
```

#### Delete Session
```http
DELETE /api/chat-history/{sessionId}
```

### Session Search and Filtering

#### Search Sessions
```http
GET /api/chat-history?query=search&provider=openai&limit=20&offset=0&sortBy=updatedAt&sortOrder=desc
```

Query Parameters:
- `query`: Search term for title or message content
- `provider`: Filter by LLM provider (openai, deepseek, openrouter)
- `limit`: Number of results (1-100, default: 50)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (createdAt, updatedAt, title, default: updatedAt)
- `sortOrder`: Sort order (asc, desc, default: desc)

### Message Management

#### Add Message to Session
```http
POST /api/sessions/{sessionId}/messages
Content-Type: application/json

{
  "message": {
    "id": "msg-1",
    "role": "user",
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Title Generation

#### Generate Session Title
```http
POST /api/chat-history/{sessionId}/generate-title
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "apiKey": "your-api-key",
  "baseUrl": "https://api.openai.com/v1"
}
```

### Statistics and Maintenance

#### Get Session Statistics
```http
GET /api/sessions/stats
```

Response:
```json
{
  "totalSessions": 150,
  "lastCleanup": "2024-01-01T00:00:00.000Z",
  "providerBreakdown": {
    "openai": 80,
    "deepseek": 50,
    "openrouter": 20
  },
  "averageMessagesPerSession": 12.5
}
```

#### Trigger Session Cleanup
```http
POST /api/sessions/stats
```

Response:
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Cleaned up 5 old sessions"
}
```

## Configuration

The SessionManager can be configured with the following parameters:

- `storageDir`: Directory for session storage (default: './data/sessions')
- `maxSessions`: Maximum number of sessions to keep (default: 1000)
- `cleanupIntervalMs`: Automatic cleanup interval in milliseconds (default: 24 hours)

## Storage Format

Sessions are stored in JSON format with the following structure:

```json
{
  "sessions": {
    "session_id": {
      "id": "session_id",
      "title": "Session Title",
      "messages": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "provider": "openai",
      "model": "gpt-4",
      "mcpServers": ["server1"]
    }
  },
  "metadata": {
    "lastCleanup": "2024-01-01T00:00:00.000Z",
    "totalSessions": 1
  }
}
```

## Error Handling

The service uses structured error handling with the following error types:

- `ValidationError` (400): Invalid request parameters
- `NotFoundError` (404): Session not found
- `InternalServerError` (500): Storage or processing errors

## Testing

Run the test suite with:

```bash
npm run test:run
```

The tests cover:
- Session creation, retrieval, update, and deletion
- Session search and filtering
- Title generation (both LLM and fallback)
- Session statistics
- Error handling scenarios