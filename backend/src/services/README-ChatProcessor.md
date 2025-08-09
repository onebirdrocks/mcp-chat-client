# Chat Processing Service

The ChatProcessor service handles the core chat processing logic for the MCP Chat UI backend. It manages message history, constructs system prompts, detects tool calls, and coordinates between the LLM service and session management.

## Features

- **Message History Management**: Maintains conversation context and manages message flow
- **System Prompt Construction**: Dynamically builds system prompts based on available tools
- **Tool Call Detection**: Identifies and formats tool calls from LLM responses
- **Session Management Integration**: Automatically creates and updates chat sessions
- **Streaming Support**: Provides foundation for real-time streaming responses
- **Error Handling**: Comprehensive error handling with proper validation

## Usage

### Basic Chat Processing

```typescript
import { createChatProcessor } from '@/services/ChatProcessor';
import { createLLMService } from '@/services/LLMService';
import { getSessionManager } from '@/services/SessionManager';

// Create dependencies
const llmService = createLLMService({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4',
});

const sessionManager = getSessionManager();
const chatProcessor = createChatProcessor(llmService, sessionManager);

// Process a chat query
const response = await chatProcessor.processQuery({
  messages: [
    {
      id: 'msg1',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: new Date(),
    },
  ],
  sessionId: 'session_123',
  provider: 'openai',
  model: 'gpt-4',
});

console.log(response.reply); // LLM's response
```

### With Tool Support

```typescript
const availableTools = [
  {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string' },
      },
    },
    serverId: 'math_server',
  },
];

const response = await chatProcessor.processQuery({
  messages: [...],
  sessionId: 'session_123',
  provider: 'openai',
  model: 'gpt-4',
  availableTools,
  systemPrompt: 'You are a helpful math assistant.',
  temperature: 0.7,
  maxTokens: 1000,
});

// Check for tool calls
if (response.toolCalls) {
  console.log('Tool calls detected:', response.toolCalls);
}
```

### Streaming Support

```typescript
// Process streaming query (returns AsyncGenerator)
const streamGenerator = await chatProcessor.processStreamingQuery({
  messages: [...],
  sessionId: 'session_123',
  provider: 'openai',
  model: 'gpt-4',
});

// Consume the stream
for await (const chunk of streamGenerator) {
  console.log('Stream chunk:', chunk);
  if (chunk.reply) {
    // Handle partial response
  }
  if (chunk.toolCalls) {
    // Handle tool calls
  }
}
```

## API Endpoints

### POST /api/chat

Process a chat message and return the LLM response.

**Request Body:**
```json
{
  "messages": [
    {
      "id": "msg1",
      "role": "user",
      "content": "Hello!",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "sessionId": "session_123",
  "provider": "openai",
  "model": "gpt-4",
  "apiKey": "sk-your-api-key",
  "systemPrompt": "You are a helpful assistant",
  "temperature": 0.7,
  "maxTokens": 1000,
  "availableTools": [...]
}
```

**Response:**
```json
{
  "reply": "Hello! How can I help you today?",
  "sessionId": "session_123",
  "toolCalls": [...] // Optional, if tools were called
}
```

### POST /api/chat/stream

Process a chat message with streaming response.

**Request:** Same as `/api/chat`

**Response:** Server-Sent Events stream with JSON chunks:
```
data: {"reply": "Hello!", "sessionId": "session_123", "isStreaming": true}

data: [DONE]
```

## System Prompt Construction

The ChatProcessor automatically constructs system prompts based on:

1. **Custom System Prompt**: User-provided prompt (optional)
2. **Available Tools**: Automatically includes tool descriptions
3. **Default Behavior**: Provides standard MCP assistant behavior

Example generated system prompt:
```
You are a helpful AI assistant with access to various tools through the Model Context Protocol (MCP).

When you need to use a tool to help the user, you should:
1. Explain what you're going to do
2. Call the appropriate tool with the correct parameters
3. Wait for the tool result
4. Interpret and explain the results to the user

Available tools:
- calculator: Perform mathematical calculations
- weather: Get weather information

Use these tools when they can help answer the user's questions or complete their requests.
```

## Tool Call Handling

### Detection
```typescript
import { ChatProcessor } from '@/services/ChatProcessor';

const toolCalls = ChatProcessor.detectToolCalls(message);
if (toolCalls.length > 0) {
  // Handle tool calls
}
```

### Formatting for Confirmation
```typescript
const formatted = ChatProcessor.formatToolCallForConfirmation(toolCall);
console.log(formatted);
// {
//   name: 'calculator',
//   description: 'Execute calculator with the provided parameters',
//   parameters: { expression: '2 + 2' }
// }
```

### Creating Tool Result Messages
```typescript
// Success result
const successMessage = ChatProcessor.createToolResultMessage(
  'call_123',
  'Result: 4'
);

// Error result
const errorMessage = ChatProcessor.createToolResultMessage(
  'call_123',
  'Division by zero error',
  true
);
```

## Session Management

The ChatProcessor automatically:

1. **Creates Sessions**: If a session doesn't exist, creates a new one
2. **Updates Messages**: Adds user messages and LLM responses to the session
3. **Generates Titles**: Automatically generates descriptive titles for new conversations
4. **Maintains Context**: Preserves conversation history for context

## Error Handling

The service provides comprehensive error handling:

- **Validation Errors**: Invalid request parameters
- **LLM Errors**: API failures, rate limits, invalid keys
- **Session Errors**: Storage failures, corrupted sessions
- **Tool Errors**: Invalid tool calls, execution failures

All errors are properly typed and include helpful error messages.

## Utility Functions

### Token Estimation
```typescript
import { estimateTokenCount, truncateMessageHistory } from '@/services/ChatProcessor';

const tokenCount = estimateTokenCount(messages);
const truncated = truncateMessageHistory(messages, 4000, true);
```

### Message Utilities
```typescript
import { getLastUserMessage } from '@/services/ChatProcessor';

const lastMessage = getLastUserMessage(messages);
```

## Configuration

The ChatProcessor accepts various configuration options:

- **Temperature**: Controls randomness (0-2)
- **Max Tokens**: Limits response length
- **System Prompt**: Custom instructions
- **Available Tools**: MCP tools to make available
- **Provider Settings**: LLM provider configuration

## Integration with Frontend

The frontend can use these endpoints to:

1. Send chat messages and receive responses
2. Handle tool confirmation workflows
3. Stream responses for real-time chat experience
4. Manage conversation history and sessions

See the frontend documentation for complete integration examples.