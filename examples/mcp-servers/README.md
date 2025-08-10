# MCP Server Configuration Examples

This directory contains example configurations for common MCP servers that can be used with the MCP Chat UI application.

## Overview

MCP (Model Context Protocol) servers provide tools that AI models can use to interact with external systems, files, databases, and APIs. The MCP Chat UI supports any MCP-compatible server through configuration.

## Configuration Format

All MCP servers are configured in the `config/mcp.config.json` file using the following format:

```json
{
  "mcpServers": {
    "server-id": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

## Available Examples

### File System Operations
- **filesystem**: Basic file system operations (read, write, list files)
- **filesystem-advanced**: Advanced file operations with search and monitoring

### Web and API Integration
- **brave-search**: Web search using Brave Search API
- **fetch**: HTTP requests and web scraping
- **puppeteer**: Browser automation and web scraping

### Development Tools
- **git**: Git repository operations
- **github**: GitHub API integration
- **sqlite**: SQLite database operations
- **postgres**: PostgreSQL database operations

### Productivity Tools
- **google-drive**: Google Drive file operations
- **gmail**: Gmail email operations
- **slack**: Slack messaging integration
- **notion**: Notion workspace integration

### System and Utilities
- **shell**: System command execution
- **memory**: Persistent memory for conversations
- **time**: Date and time utilities
- **weather**: Weather information

## Quick Start

1. Choose the MCP servers you want to use from the examples
2. Copy the relevant configuration to your `config/mcp.config.json`
3. Install any required dependencies (see individual server documentation)
4. Configure API keys and environment variables as needed
5. Restart the MCP Chat UI application
6. Enable the servers in your chat session settings

## Security Considerations

- **API Keys**: Store sensitive API keys in environment variables, not in the configuration file
- **File Access**: Limit file system access to specific directories
- **Command Execution**: Be cautious with servers that execute system commands
- **Network Access**: Review what external services each server connects to

## Installation Methods

Most MCP servers can be installed using one of these methods:

### Using uvx (Recommended)
```bash
# Install and run directly
uvx package-name
```

### Using npm/npx
```bash
# Install globally
npm install -g package-name

# Or run directly
npx package-name
```

### Using Python/pip
```bash
# Install with pip
pip install package-name

# Or use uv
uv run package-name
```

### From Source
```bash
# Clone and build
git clone repository-url
cd repository
npm install && npm run build
```

## Troubleshooting

### Common Issues

1. **Server Not Connecting**
   - Check that the command path is correct
   - Verify required dependencies are installed
   - Review environment variables and API keys

2. **Tools Not Available**
   - Ensure the server is enabled in chat session settings
   - Check server logs for connection errors
   - Verify the server supports the MCP protocol version

3. **Permission Errors**
   - Check file system permissions for data directories
   - Verify API key permissions and quotas
   - Review server-specific access requirements

### Debugging

Enable debug logging by setting environment variables:
```bash
DEBUG_MCP=true
LOG_LEVEL=debug
```

Check server status in the Settings → MCP Servers panel of the application.

## Contributing

To add a new MCP server example:

1. Create a new file in the appropriate category directory
2. Include complete configuration with comments
3. Document required dependencies and setup steps
4. Add troubleshooting tips for common issues
5. Test the configuration with the MCP Chat UI

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Community Servers](https://github.com/topics/mcp-server)
- [Building Custom MCP Servers](https://modelcontextprotocol.io/docs/building-servers)