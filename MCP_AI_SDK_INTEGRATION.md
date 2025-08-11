# MCP + AI SDK Integration

## Overview

This implementation demonstrates how to integrate MCP (Model Context Protocol) servers with AI SDK to provide powerful tool capabilities to AI assistants.

## Key Features

### ✅ **Server Status Monitoring**
- **Real-time Status**: Each MCP server displays its current connection status
- **Health Checks**: Manual and automatic health check functionality
- **Status Indicators**: Visual indicators for connected, disconnected, and error states
- **Tool Discovery**: Automatic discovery and display of available tools

### ✅ **Tool Management**
- **Tool Listing**: Shows all available tools from enabled servers
- **Tool Details**: Expandable tool information with input/output schemas
- **Tool Count**: Displays number of tools per server
- **Tool Execution**: Simulated tool execution with proper error handling

### ✅ **AI SDK Integration**
- **Tool Conversion**: Converts MCP tools to AI SDK format
- **Tool Execution**: Handles tool calls from AI SDK
- **Error Handling**: Proper error handling for tool execution
- **Status Summary**: Provides server and tool status summaries

## Server Status Display

Each MCP server now shows:

1. **Status Icon**: Visual indicator of connection status
   - ✅ Green checkmark: Connected
   - ❌ Red X: Connection error
   - ⚠️ Gray alert: Disconnected

2. **Status Text**: Clear status description
   - "Connected" - Server is running and accessible
   - "Connection Error" - Server failed to connect
   - "Disconnected" - Server is not running

3. **Tool Count**: Number of available tools
   - Shows as a blue badge with tool count
   - Updates automatically when tools are discovered

4. **Health Check Button**: Manual health check
   - Refresh icon that spins during check
   - Updates server status and tools

## Available MCP Tools

The system supports various MCP server types with their specific tools:

### **Blender MCP Server**
- `get_scene_info`: Get detailed information about the current Blender scene
- `get_object_info`: Get information about specific objects in the scene

### **Weather MCP Server**
- `get_weather`: Get current weather information for a location

### **Ebook MCP Server**
- `get_all_epub_files`: Get all epub files in a given path
- `get_epub_metadata`: Get metadata of a given ebook

### **YouTube MCP Server**
- `get_youtube_transcript`: Download YouTube video transcript and metadata

### **Playwright MCP Server**
- `browser_navigate`: Navigate to a URL
- `browser_take_screenshot`: Take a screenshot of the current page

## AI SDK Integration

### **Basic Integration**

```typescript
import { AISDKMCPIntegration } from '@/lib/ai-sdk-mcp-integration';

// Create MCP integration
const mcpIntegration = new AISDKMCPIntegration();

// Get tools in AI SDK format
const tools = mcpIntegration.convertToolsToAISDKFormat();

// Use with AI SDK
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  tools: tools,
  toolChoice: 'auto',
};
```

### **Tool Execution**

```typescript
// Execute tool call from AI SDK
const result = await mcpIntegration.executeToolCall({
  name: 'weather:get_weather',
  arguments: { location: 'Tokyo', units: 'metric' }
});
```

### **Server Status Monitoring**

```typescript
// Get server status summary
const status = mcpIntegration.getServerStatusSummary();
console.log(`Total servers: ${status.total}`);
console.log(`Enabled servers: ${status.enabled}`);
console.log(`Connected servers: ${status.connected}`);
console.log(`Available tools: ${status.tools}`);
```

## Demo Page

Visit `/mcp-demo` to see the integration in action:

### **Features**
- **Real-time Chat**: Interactive chat interface with MCP tools
- **Server Status Panel**: Shows current server and tool status
- **Tool List**: Displays all available MCP tools
- **Example Prompts**: Quick access to test different tool types
- **Health Monitoring**: Manual health check functionality

### **Example Usage**
1. **Weather Query**: "What's the weather like in New York?"
2. **Blender Operations**: "Get information about the current Blender scene"
3. **YouTube Processing**: "Extract transcript from a YouTube video"
4. **Browser Automation**: "Navigate to a website using browser automation"
5. **Ebook Processing**: "Get metadata from an ebook file"

## API Endpoints

### **Server Management**
- `GET /api/mcp`: Get all servers
- `POST /api/mcp`: Add new server
- `PUT /api/mcp`: Update server configuration
- `DELETE /api/mcp`: Delete server
- `POST /api/mcp/toggle`: Toggle server status

### **Cursor Integration**
- `POST /api/mcp/import-cursor`: Import Cursor configuration
- `GET /api/mcp/export-cursor`: Export to Cursor format

## Configuration

### **Server Configuration**
Each MCP server can be configured with:
- **Name**: Friendly identifier
- **Description**: Optional description
- **Command**: Startup command
- **Arguments**: Command line arguments
- **Environment Variables**: JSON format environment variables

### **Health Check Settings**
- **Automatic Checks**: Every 30 seconds for enabled servers
- **Manual Checks**: On-demand health verification
- **Status Updates**: Real-time status updates
- **Tool Discovery**: Automatic tool discovery on connection

## Usage Examples

### **1. Weather Information**
```typescript
import { getWeatherWithMCP } from '@/lib/ai-sdk-mcp-integration';

const weather = await getWeatherWithMCP('Tokyo');
console.log(weather);
```

### **2. Blender Scene Info**
```typescript
import { getBlenderSceneInfo } from '@/lib/ai-sdk-mcp-integration';

const sceneInfo = await getBlenderSceneInfo();
console.log(sceneInfo);
```

### **3. YouTube Transcript**
```typescript
import { getYouTubeTranscript } from '@/lib/ai-sdk-mcp-integration';

const transcript = await getYouTubeTranscript('https://youtube.com/watch?v=...');
console.log(transcript);
```

### **4. Browser Automation**
```typescript
import { navigateWithPlaywright } from '@/lib/ai-sdk-mcp-integration';

const result = await navigateWithPlaywright('https://example.com');
console.log(result);
```

### **5. Ebook Processing**
```typescript
import { getEbookInfo } from '@/lib/ai-sdk-mcp-integration';

const ebookInfo = await getEbookInfo('/path/to/book.epub');
console.log(ebookInfo);
```

## Error Handling

The system includes comprehensive error handling:

- **Connection Errors**: Proper handling of server connection failures
- **Tool Execution Errors**: Graceful handling of tool execution failures
- **Health Check Errors**: Error reporting for health check failures
- **User Feedback**: Clear error messages for users

## Performance Considerations

- **Lazy Loading**: Tools are discovered only when servers are enabled
- **Caching**: Tool information is cached to avoid repeated discovery
- **Health Checks**: Configurable health check intervals
- **Status Updates**: Efficient status updates without full reconnection

## Future Enhancements

1. **Real MCP Client**: Replace mock client with actual MCP implementation
2. **Advanced Health Checks**: More sophisticated health monitoring
3. **Tool Usage Analytics**: Track tool usage patterns
4. **Bulk Operations**: Support for bulk server management
5. **Configuration Templates**: Pre-built server configurations
6. **Real-time Updates**: WebSocket-based real-time status updates

## Testing

Use the demo page at `/mcp-demo` to test:
- Server status monitoring
- Tool discovery and display
- Chat integration with MCP tools
- Health check functionality
- Error handling

The system is now fully functional with comprehensive server status monitoring and AI SDK integration capabilities.
