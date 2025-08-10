# MCP Chat UI - Developer Guide

## Architecture Overview

MCP Chat UI is built as a unified Next.js 15 application using the App Router architecture. The application consolidates frontend and backend into a single project for simplified deployment and maintenance.

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Runtime**: Node.js with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + useState
- **MCP Integration**: @modelcontextprotocol/sdk
- **LLM Integration**: OpenAI SDK (compatible with multiple providers)
- **Security**: AES encryption for sensitive data
- **Testing**: Jest, React Testing Library, Playwright
- **Internationalization**: Next.js built-in i18n

### Project Structure

```
mcp-chat-ui/
├── app/                          # Next.js App Router
│   ├── api/                      # Route Handlers (API endpoints)
│   │   ├── chat/                 # Chat-related APIs
│   │   ├── settings/             # Settings management
│   │   ├── sessions/             # Session management
│   │   └── tool-execution/       # Tool execution APIs
│   ├── chat/                     # Chat pages
│   ├── settings/                 # Settings pages
│   ├── history/                  # History pages
│   ├── components/               # Server/Client components
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── lib/                          # Shared libraries
│   ├── services/                 # Business logic services
│   ├── security/                 # Security utilities
│   ├── middleware/               # Request middleware
│   └── types.ts                  # Type definitions
├── src/                          # Client-side components
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # State management
│   ├── services/                 # Client services
│   └── locales/                  # Translation files
├── config/                       # Configuration files
│   └── mcp.config.json          # MCP server configuration
├── data/                         # Data storage
│   ├── sessions/                 # Chat sessions
│   └── settings/                 # Application settings
├── docs/                         # Documentation
├── tests/                        # Test files
└── examples/                     # Example configurations
```

## Development Setup

### Prerequisites

- Node.js 18+ with npm/yarn
- Git for version control
- Code editor with TypeScript support

### Local Development

1. **Clone and Install**:
```bash
git clone <repository-url>
cd mcp-chat-ui
npm install
```

2. **Environment Setup**:
```bash
# Copy example environment file
cp .env.example .env.local

# Configure your environment variables
# OPENAI_API_KEY=your-key-here
# DEEPSEEK_API_KEY=your-key-here
```

3. **Start Development Server**:
```bash
npm run dev
```

4. **Run Tests**:
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Development Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Implement changes with tests
   - Run full test suite
   - Submit pull request

2. **Code Quality**:
   - ESLint for code linting
   - Prettier for code formatting
   - TypeScript for type checking
   - Husky for pre-commit hooks

3. **Testing Strategy**:
   - Unit tests for components and utilities
   - Integration tests for API routes and services
   - E2E tests for complete workflows
   - Performance tests for critical paths

## Core Components

### Server Components (app/ directory)

**Page Components**:
- Render initial page content server-side
- Handle data fetching and initial state
- Provide SEO-friendly markup
- Pass data to client components

**Layout Components**:
- Define page structure and navigation
- Handle theme and language detection
- Provide global context and providers

### Client Components (src/components/)

**Interactive Components**:
- Handle user interactions and state
- Manage real-time updates and streaming
- Implement responsive behavior
- Provide accessibility features

**Key Components**:
- `ChatInterface`: Main chat interaction
- `MessageList`: Message rendering with streaming
- `ToolConfirmationDialog`: Tool execution approval
- `Sidebar`: Navigation and chat history
- `SettingsPage`: Configuration management

### Route Handlers (app/api/)

**API Design Principles**:
- RESTful endpoints with consistent patterns
- Input validation using Zod schemas
- Error handling with standardized responses
- Security middleware for all routes
- Comprehensive logging and monitoring

**Key Endpoints**:
- `POST /api/chat`: Process chat messages
- `POST /api/run-tool`: Execute confirmed tools
- `GET/POST /api/settings`: Manage configuration
- `GET /api/sessions`: Chat session management
- `GET /api/tool-execution/active`: Active tool status

## Service Layer Architecture

### MCPClientManager

Manages connections to MCP servers:

```typescript
class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  private config: MCPConfig;
  
  async connect(serverId: string): Promise<void>
  async disconnect(serverId: string): Promise<void>
  async listTools(serverId: string): Promise<Tool[]>
  async callTool(serverId: string, toolName: string, args: any): Promise<any>
  getConnectionStatus(serverId: string): ConnectionStatus
}
```

**Key Features**:
- Connection pooling and lifecycle management
- Automatic reconnection with exponential backoff
- Tool discovery with serverId prefixes
- Health monitoring and status reporting
- Configuration hot-reloading

### LLMService

Abstracts LLM provider interactions:

```typescript
class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  
  async chat(messages: Message[], options: ChatOptions): Promise<ChatResponse>
  async streamChat(messages: Message[], options: ChatOptions): Promise<ReadableStream>
  validateProvider(config: ProviderConfig): Promise<ValidationResult>
  getAvailableModels(providerId: string): Promise<ModelInfo[]>
}
```

**Supported Providers**:
- OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
- DeepSeek (DeepSeek Chat, DeepSeek Coder)
- OpenRouter (Multiple models via unified API)

### SessionManager

Handles chat session persistence:

```typescript
class SessionManager {
  async createSession(config: SessionConfig): Promise<Session>
  async getSession(sessionId: string): Promise<Session>
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void>
  async deleteSession(sessionId: string): Promise<void>
  async listSessions(filters?: SessionFilters): Promise<Session[]>
  async generateTitle(sessionId: string): Promise<string>
}
```

**Features**:
- File-based session storage with encryption
- Automatic title generation using LLM
- Session search and filtering
- Data export and import capabilities
- Cleanup and archiving functionality

## Security Implementation

### Data Protection

**API Key Management**:
- AES-256 encryption for stored keys
- Server-side only storage and usage
- Masked display in client interfaces
- Secure transmission over HTTPS

**Input Validation**:
- Zod schemas for all API inputs
- XSS protection for user content
- Parameter validation for tool calls
- File upload restrictions and scanning

**Session Security**:
- Secure session tokens
- Automatic timeout and cleanup
- CSRF protection
- Rate limiting per session

### Middleware Stack

```typescript
// Security middleware chain
export const securityMiddleware = [
  rateLimitMiddleware,
  validationMiddleware,
  auditMiddleware,
  corsMiddleware
];
```

**Components**:
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Sanitize and validate all inputs
- **Audit Logging**: Track security-relevant events
- **CORS Configuration**: Control cross-origin requests

## Testing Framework

### Unit Testing

**Component Testing**:
```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from '../ChatInterface';

describe('ChatInterface', () => {
  it('should send message when form is submitted', async () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button', { name: 'Send' });
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(button);
    
    expect(mockSendMessage).toHaveBeenCalledWith('Hello');
  });
});
```

**Service Testing**:
```typescript
// Example service test
import { MCPClientManager } from '../MCPClientManager';

describe('MCPClientManager', () => {
  it('should connect to MCP server successfully', async () => {
    const manager = new MCPClientManager(mockConfig);
    
    await manager.connect('test-server');
    
    expect(manager.getConnectionStatus('test-server')).toBe('connected');
  });
});
```

### Integration Testing

**API Testing**:
```typescript
// Example API test
import { POST } from '../app/api/chat/route';

describe('/api/chat', () => {
  it('should process chat message successfully', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        sessionId: 'test-session'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.reply).toBeDefined();
  });
});
```

### E2E Testing

**Workflow Testing**:
```typescript
// Example E2E test
import { test, expect } from '@playwright/test';

test('complete chat workflow', async ({ page }) => {
  await page.goto('/');
  
  // Start new chat
  await page.click('[data-testid="new-chat"]');
  await page.selectOption('[data-testid="provider-select"]', 'openai');
  await page.selectOption('[data-testid="model-select"]', 'gpt-4');
  await page.click('[data-testid="create-session"]');
  
  // Send message
  await page.fill('[data-testid="message-input"]', 'Hello, world!');
  await page.click('[data-testid="send-button"]');
  
  // Verify response
  await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();
});
```

## Extending the Application

### Adding New LLM Providers

1. **Implement Provider Interface**:
```typescript
class CustomLLMProvider implements LLMProvider {
  async chat(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    // Implementation
  }
  
  async validateConfig(config: ProviderConfig): Promise<boolean> {
    // Validation logic
  }
}
```

2. **Register Provider**:
```typescript
// In LLMService constructor
this.providers.set('custom', new CustomLLMProvider());
```

3. **Add Configuration UI**:
```typescript
// In LLMProviderConfig component
const providerConfigs = {
  custom: {
    name: 'Custom Provider',
    fields: ['apiKey', 'baseUrl'],
    models: ['custom-model-1', 'custom-model-2']
  }
};
```

### Adding New MCP Server Types

1. **Extend Configuration Schema**:
```typescript
const mcpServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  transport: z.enum(['stdio', 'http', 'websocket']).default('stdio')
});
```

2. **Implement Transport Handler**:
```typescript
class HTTPMCPClient extends MCPClient {
  async connect(): Promise<void> {
    // HTTP transport implementation
  }
}
```

3. **Update Client Manager**:
```typescript
// In MCPClientManager
createClient(config: MCPServerConfig): MCPClient {
  switch (config.transport) {
    case 'http':
      return new HTTPMCPClient(config);
    case 'stdio':
    default:
      return new StdioMCPClient(config);
  }
}
```

### Adding New UI Components

1. **Create Component**:
```typescript
// src/components/MyComponent.tsx
interface MyComponentProps {
  data: MyData;
  onAction: (action: string) => void;
}

export function MyComponent({ data, onAction }: MyComponentProps) {
  return (
    <div className="my-component">
      {/* Component implementation */}
    </div>
  );
}
```

2. **Add Tests**:
```typescript
// src/components/__tests__/MyComponent.test.tsx
describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent data={mockData} onAction={mockAction} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

3. **Add Translations**:
```json
// src/locales/en/translation.json
{
  "myComponent": {
    "title": "My Component",
    "action": "Perform Action"
  }
}
```

## Performance Optimization

### Bundle Optimization

- **Code Splitting**: Automatic with Next.js App Router
- **Tree Shaking**: Remove unused code
- **Dynamic Imports**: Load components on demand
- **Image Optimization**: Next.js built-in optimization

### Runtime Performance

- **Streaming**: Real-time message updates
- **Virtualization**: Handle large chat histories
- **Caching**: Cache API responses and computed data
- **Debouncing**: Optimize user input handling

### Memory Management

- **Connection Pooling**: Reuse MCP connections
- **Session Cleanup**: Automatic cleanup of old sessions
- **Resource Limits**: Prevent memory leaks
- **Garbage Collection**: Proper cleanup of event listeners

## Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
DEEPSEEK_API_KEY=your-deepseek-key
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Monitoring and Logging

- **Application Logs**: Structured logging with levels
- **Performance Metrics**: Response times and resource usage
- **Error Tracking**: Comprehensive error reporting
- **Health Checks**: API endpoints for monitoring

## Contributing

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Run full test suite
5. Submit pull request with description
6. Address review feedback
7. Merge after approval

### Documentation

- Update relevant documentation
- Add JSDoc comments for public APIs
- Include examples for new features
- Update changelog for releases

## Troubleshooting

### Common Development Issues

**Build Errors**:
- Check TypeScript errors: `npm run type-check`
- Verify dependencies: `npm install`
- Clear Next.js cache: `rm -rf .next`

**Test Failures**:
- Update snapshots: `npm run test -- -u`
- Check test environment: Verify test setup files
- Debug specific tests: `npm run test -- --verbose`

**Runtime Errors**:
- Check browser console for client errors
- Review server logs for API errors
- Verify environment variables are set
- Test MCP server connections manually

### Performance Issues

**Slow Builds**:
- Use Turbopack: `npm run dev --turbo`
- Check for circular dependencies
- Optimize imports and exports

**Runtime Performance**:
- Profile with React DevTools
- Monitor memory usage
- Check for unnecessary re-renders
- Optimize database queries

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)