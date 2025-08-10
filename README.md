# MCP Chat UI

A modern, secure web application that provides a unified chat interface for interacting with large language models (OpenAI, DeepSeek, OpenRouter) while leveraging local MCP (Model Context Protocol) servers for tool execution.

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd mcp-chat-ui
npm install

# Set up configuration
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Visit http://localhost:3000 to start using the application.

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete setup and usage guide
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Technical documentation and development setup
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment options
- **[MCP Server Examples](examples/mcp-servers/)** - Pre-configured server examples

## ✨ Key Features

- **Unified Next.js Architecture**: Single application with frontend and backend consolidated
- **Multiple LLM Providers**: Support for OpenAI, DeepSeek, and OpenRouter
- **MCP Server Integration**: Connect to any MCP-compatible server for tool execution
- **Tool Execution Control**: Explicit user confirmation required for all tool calls
- **Multi-language Support**: English and Chinese interface
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Data Privacy**: Local-first architecture with encrypted API key storage
- **Real-time Chat**: Streaming responses and real-time message updates
