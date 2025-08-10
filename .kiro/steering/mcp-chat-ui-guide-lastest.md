---
inclusion: always
---
# MCP Chat UI Design / MCP
## Overview 
This document describes a complete design for an MCP Chat UI implemented as a single Next.js application. The goal is to provide a unified chat interface that can connect to any Model Context Protocol (MCP) server through configuration, support multiple large‑language‑model (LLM) providers, and offer users a settings panel for customizing their experience. The design emphasizes security, server‑side execution of tools, and explicit user confirmation before invoking any external MCP tool.

## System Architecture
- Single Next.js Application: The front end and back end are consolidated into one Next.js project using the App Router. There is no separate Vite/React front end; all routes live under the app/ directory. This simplifies deployment and enables code sharing.

- Server Components and Route Handlers: Pages that render history or static content are implemented as Server Components to minimize client bundle size. API endpoints and tool execution logic are implemented as Route Handlers under app/api/… and are marked with runtime = "nodejs" to allow access to Node APIs such as child_process for MCP connections.

- Configuration‑Driven MCP Servers: The UI reads a JSON configuration file (compatible with Cursor’s mcpServers format) listing available MCP servers. Each server entry specifies a unique serverId, a command, optional args, and optional environment variables. The system creates a connection pool keyed by serverId and maintains long‑running subprocesses for stdio transports. Tools from each server are prefixed with serverId. to avoid naming conflicts.

- LLM Provider Abstraction: The chat module supports multiple LLM providers (OpenAI, DeepSeek, OpenRouter, Azure, etc.) through a configuration file. Models are mapped by logical names; the system selects the appropriate provider and model based on the session settings. A default model is defined, and fallback models can be configured. Provider keys are only stored and used on the server. In a single‑user deployment, users are not asked to enter API keys themselves; instead, when a new session is created they choose one provider and model from the list of providers configured with keys on the server.

- Security and Permissions: All MCP and LLM calls are executed exclusively on the server. The client only submits user messages and renders responses. When the LLM requests a tool call, the server returns the proposed call back to the client and awaits user confirmation before executing it. Input schemas provided by MCP servers are converted to Zod schemas and validated on the server to prevent malicious parameters.

- Bundling and Build: The application uses Next.js’s built‑in build tool. During development, the default Turbopack (or future stable bundler) is used via next dev --turbo for rapid incremental builds. For production, next build produces an optimized bundle using Next.js’s bundling system. External bundlers such as Vite or Webpack are not required.


## Chat Component Design / 聊天模塊設計
### Flow / 流程
- User Message: The user submits a message via a client component. The message list is stored on the server or in a session‑backed store. The UI immediately appends the user message to the history.

- Call LLM: The client component calls the /api/chat route handler with the current conversation history, selected model, and allowed serverIds. The route handler loads the LLM provider configuration, fetches the list of available tools (with serverId. prefixes) for the session from the registry, and passes both the message history and tools to the LLM provider’s chat method.

- LLM Response: The LLM returns either plain text or a tool_calls array. If there are no tool calls, the server sends the text response back to the client, which appends it to the chat history.

- Tool Call Proposal: If the LLM suggests tool calls, the server does not execute them immediately. It returns an array of proposed tool calls to the client. Each proposed call includes the id, full tool name (serverId.toolName), and arguments. The client renders a confirmation card showing the tool description, server name, and input arguments.

- User Confirmation: The user can click Run or Cancel on each card. If canceled, the client sends a cancellation event and the conversation continues without executing the tool. If Run is clicked, the client calls /api/run-tool with the tool call details and the current conversation messages.

- Tool Execution and Continuation: The route handler for /api/run-tool parses the full tool name to extract the serverId and toolName, retrieves the appropriate MCP client from the connection pool, validates arguments against the tool’s input schema, and executes the tool via the MCP API. After receiving the tool result, the server feeds the tool output back to the LLM along with the previous messages and returns the LLM’s continuation to the client.

### API Endpoints 
｜Endpoint｜Method｜Description｜
|:-------|:--------:|-------:|
｜/api/chat｜	POST｜	Submit a user message and receive a plain response or proposed tool calls.｜
｜/api/run-tool｜	POST ｜Execute a confirmed MCP tool and ask the LLM to continue the conversation.｜

### Streaming Responses
To deliver a more responsive chat experience, the system supports streaming LLM responses. When a conversation is configured for streaming or the user enables streaming in settings, the client calls /api/chat with a stream=true parameter. The route handler pipes the LLM's stream of tokens into a Node ReadableStream or Server-Sent Events (SSE) and returns it to the client. The client listens to the stream and renders incoming tokens incrementally, showing partial responses as they arrive. Tool calls and user confirmations still follow the same pattern as in the standard flow; streaming stops when the response finishes or a tool call is produced.

## Settings Component
The settings page allows users to customize the chat experience. It typically appears in a modal or side panel.


### Options
- LLM Provider and Model Selection (required): When creating a new chat session, the user must select which provider and model to use for the conversation from a drop‑down list. The list is populated from the providers and models sections of the LLM configuration and includes only providers that have API keys stored on the server. This ensures that keys remain server side and avoids prompting the user for any secret tokens.

- MCP Server Permissions: Users select which MCP servers are allowed in the current session. The UI reads the available servers from the configuration file and displays them as a list of checkboxes. Only selected servers will be used for tool discovery and invocation. This allows users to disable potentially sensitive servers in certain conversations.

- Provider Selection Policy: Because this application is designed for a single user, API keys are configured by the system administrator and stored on the server. Custom keys are not permitted in this environment. The provider and model chosen at session creation determine which key is used.

- LLM Provider Management: The settings panel includes a management section where users can add new LLM providers by specifying the provider type, API base URL, and API key. Users can also delete existing providers or toggle providers between enabled and disabled states. When a provider is disabled, it will not appear in the provider selection list. All keys remain securely stored on the server.

- Language Preference: The settings may allow users to choose the UI language (e.g., English/中文). This preference is stored in local storage or session and determines which language version of the interface labels and prompts is displayed.

- Theme Selection: The UI supports multiple color themes (e.g., light and dark). A toggle or selector in the settings allows the user to choose the theme. The chosen theme is stored in local storage or a cookie and applied across the application. The design uses CSS variables or Tailwind classes to implement theme switching.


## MCP Server Invocation Design
### Configuration Format
The configuration file under config/mcp.config.json is compatible with Cursor’s mcpServers format. Each entry is keyed by a serverId and contains a command, optional arguments and environment variables. For example:

```
{
  "mcpServers": {
    "ebook-mcp": {
      "command": "uv",
      "args": ["--directory","/path/to/ebook-mcp/src/ebook_mcp/","run","main.py"]
    },
    "weather": {
      "command": "uvx",
      "args": ["--directory","/path/to/weather","run","weather.py"]
    }
  }
}
```


### Registry and Connection Pool
- Loading Config: On server start or on demand, the system reads the configuration file and validates it using Zod. The result is stored in memory and can be reloaded when the file changes.

- Creating Clients: For each serverId, the system creates a client in a Map keyed by serverId. For stdio transports, it spawns a child process using command and args. For HTTP or WebSocket transports (future support), it creates an HTTP/WS client. The clients support listTools() and callTool() methods.

- Tool Discovery: The first time a session requests tools, the server iterates through the allowed serverIds and calls listTools() on each client. Each tool is transformed into the OpenAI function schema, with the name prefixed by serverId. The combined list is cached per session for a short period (e.g., 1 minute) to reduce overhead.

- Tool Execution: When a tool call is confirmed, the server parses the full tool name, retrieves the client for the corresponding serverId, validates the arguments against the tool’s input schema, and executes the tool using callTool(). Timeouts and concurrency limits are enforced per server. The raw tool output (often JSON) is returned to the LLM as a tool message.

### User Confirmation
- After the LLM proposes a tool call, the UI displays a card summarizing the tool’s purpose, server, and arguments. Users must explicitly click Run to execute it or Cancel to reject it. This prevents the model from executing tools autonomously and gives users full control.

- If a tool fails or times out, the UI displays an error message and offers the option to retry. All tool invocations and results are logged for auditing and debugging.

- Security and Auditing / 安全與審計
Sensitive Information Isolation: API keys and file paths are never sent to the client. Only the server reads the configuration and stores secrets in environment variables or secure stores.

- Input Validation: The system converts each MCP tool’s input schema into a Zod schema for server‑side validation. Any invalid or unexpected arguments cause the tool execution to be aborted.

- Timeouts and Rate Limits: Each MCP server configuration can define a timeout and concurrency limit to prevent long‑running or runaway processes. If a timeout occurs, the tool call is aborted and the user is notified.

- Audit Logs: The server logs each tool call with the timestamp, server id, tool name, input parameters, execution duration, success/failure status, and truncated output for later analysis and auditing.

## Usage Statistics
The application tracks token usage for each conversation and LLM call. Whenever an LLM provider returns usage metadata (such as prompt tokens and completion tokens), the server stores these metrics along with the conversation ID, provider, and model. A dedicated statistics page allows the user to view aggregated usage information, including total tokens consumed per session and per provider, breakdown by prompt and completion tokens, and estimated cost if pricing data is configured. This page can be accessed from the settings panel or through a navigation link, giving users visibility into their consumption.

## Conclusion
This design outlines a robust, configuration‑driven chat application that integrates multiple LLM providers and arbitrary MCP servers within a unified Next.js architecture. By enforcing server‑side execution, explicit user confirmation, and granular settings, the system maintains security and gives users control over external tool invocation. The bilingual UI and modular architecture ensure adaptability and ease of use for a wide range of applications.
