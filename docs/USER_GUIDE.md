# MCP Chat UI - User Guide

## Overview

MCP Chat UI is a modern web application that provides a secure, local-first chat interface for interacting with large language models (OpenAI, DeepSeek, OpenRouter) while leveraging local MCP (Model Context Protocol) servers for tool execution.

## Key Features

- **Unified Next.js Architecture**: Single application with frontend and backend consolidated
- **Multiple LLM Providers**: Support for OpenAI, DeepSeek, and OpenRouter
- **MCP Server Integration**: Connect to local MCP servers for tool execution
- **Tool Execution Control**: Explicit user confirmation required for all tool calls
- **Multi-language Support**: English and Chinese interface
- **Responsive Design**: Works on desktop and mobile devices
- **Data Privacy**: Local-first architecture with encrypted API key storage

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- MCP servers you want to use (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-chat-ui
```

2. Install dependencies:
```bash
npm install
```

3. Configure your settings (see Configuration section below)

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Configuration

### LLM Provider Setup

1. Navigate to Settings → LLM Providers
2. Add your preferred provider:
   - **OpenAI**: Enter your OpenAI API key
   - **DeepSeek**: Enter your DeepSeek API key  
   - **OpenRouter**: Enter your OpenRouter API key and optional base URL
3. Test the connection to verify your configuration
4. Select which models you want to use

### MCP Server Configuration

1. Edit `config/mcp.config.json` to define your MCP servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      }
    }
  }
}
```

2. Navigate to Settings → MCP Servers to view connection status
3. Enable/disable servers as needed for each chat session

## Using the Application

### Starting a New Chat

1. Click "New Chat" in the sidebar
2. Select your preferred LLM provider and model
3. Choose which MCP servers to enable for this session
4. Start chatting!

### Tool Execution

When the AI suggests using a tool:

1. A confirmation dialog will appear showing:
   - Tool name and description
   - Parameters that will be used
   - Which MCP server will execute it

2. Review the information carefully
3. Click "Run" to execute or "Cancel" to reject
4. The tool result will be shown and the conversation continues

### Managing Chat History

- **View History**: Click on any previous chat in the sidebar
- **Rename Chat**: Right-click on a chat and select "Rename"
- **Delete Chat**: Right-click on a chat and select "Delete"
- **Search**: Use the search box to find specific conversations
- **Export**: Export chat history from Settings → Data Export

### Settings and Preferences

Access settings by clicking the gear icon in the sidebar:

- **Language**: Switch between English and Chinese
- **Theme**: Choose light, dark, or system theme
- **Providers**: Manage LLM provider configurations
- **MCP Servers**: View and manage MCP server connections
- **Privacy**: Export data or clean up old conversations

## Troubleshooting

### Common Issues

**Connection Failed to LLM Provider**
- Verify your API key is correct
- Check your internet connection
- Ensure the provider service is available

**MCP Server Not Connecting**
- Check that the command path is correct
- Verify required dependencies are installed
- Review server logs in the browser console

**Tool Execution Fails**
- Ensure the MCP server is running and connected
- Check that you have necessary permissions
- Review the tool parameters for correctness

**Performance Issues**
- Clear old chat history if you have many conversations
- Disable unused MCP servers
- Check available system resources

### Getting Help

1. Check the browser console for error messages
2. Review the server logs in your terminal
3. Verify your configuration files are valid JSON
4. Consult the developer documentation for advanced troubleshooting

## Security and Privacy

- **API Keys**: Stored encrypted on the server, never exposed to the client
- **Chat Data**: Stored locally on your machine
- **Tool Execution**: Requires explicit user confirmation
- **Data Export**: Available for backup and migration purposes
- **No External Tracking**: No data sent to external services except LLM APIs

## Advanced Usage

### Custom MCP Servers

You can connect any MCP-compatible server by adding it to your configuration:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "python",
      "args": ["/path/to/my/server.py"],
      "env": {
        "CUSTOM_API_KEY": "your-key"
      }
    }
  }
}
```

### Keyboard Shortcuts

- **Send Message**: Enter
- **New Line**: Shift + Enter
- **New Chat**: Ctrl/Cmd + N
- **Settings**: Ctrl/Cmd + ,
- **Search History**: Ctrl/Cmd + F

### Mobile Usage

The application is fully responsive and works on mobile devices:

- Swipe to open/close sidebar
- Touch-optimized buttons and inputs
- Responsive layout adapts to screen size
- Virtual keyboard support

## Updates and Maintenance

### Updating the Application

1. Pull the latest changes from the repository
2. Run `npm install` to update dependencies
3. Restart the development server
4. Check for any configuration changes needed

### Backup and Migration

1. Export your settings from Settings → Data Export
2. Export chat history if needed
3. Save your `config/mcp.config.json` file
4. These files can be imported on a new installation

## Support

For additional help:
- Check the developer documentation
- Review the GitHub issues
- Consult the MCP protocol documentation
- Join the community discussions