---
inclusion: fileMatch
fileMatchPattern: "components/**/*.tsx"
---

# mcp-chat-ui-guide.md
A chat tool based on TypeScript + React that can use LLMs and call tools through MCP Server, while seeking user confirmation before executing tools, can be designed with a "Frontend-Backend-MCP Server" layered architecture. Below is the recommended implementation approach, with key code examples from relevant samples:


# Overall Architecture
## Frontend (React/ React Router /):
Display chat history, user input box, and send button.
When the model returns tool calls, pop up a tool confirmation card with "Run" and "Cancel" buttons.
Interact with the backend through HTTP requests, send user questions, trigger tool calls or cancel operations.

## Backend (Next.js):
- Maintain session state.
- Communicate with local MCP Server: Use @modelcontextprotocol/sdk to connect to locally running MCP Server through StdioClientTransport or HttpClientTransport and list tools.
- Call Frontier LLM (or other LLMs that support function calls) to process chat messages.
- Currently supports OpenAI protocol SDK, supporting OpenAI, DeepSeek, OpenRouter
- When LLM returns tool calls, do not execute immediately, but return the call information to the frontend to wait for user confirmation.
- After user confirmation, call the MCP Server's tools and feed the results back to the LLM to get subsequent replies.

## MCP Server (locally running):
A tool server that users install and start on their local machine, can be built using the official @modelcontextprotocol/sdk/server. Through the SDK, interfaces like listTools and callTool can be exposed.
Example configuration for user-configured MCP Server, after correct configuration, can be called by MCP Client.
```
{
  "mcpServers": {
    "ebook-mcp": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/onebird/github/ebook-mcp/src/ebook_mcp/",
        "run",
        "main.py"
      ]
    }
  }
}
```

**Support connecting to local MCP Server**
In the backend, connect to the user's local MCP Server through @modelcontextprotocol/sdk. For example, if the user's installed server is a Stdio protocol server, you can use StdioClientTransport to start the process and establish a connection, then list the tools
```
import { MCPClient } from '@modelcontextprotocol/sdk';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client';

const mcp = new MCPClient();

// Assuming the user's MCP Server script path is /path/to/mcp-server.js
const transport = new StdioClientTransport({
  command: 'node',             // or 'python'
  args: ['/path/to/mcp-server.js'],
});

await mcp.connect(transport);

const toolsResult = await mcp.listTools();
const toolsForLLM = toolsResult.tools.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  },
}));
```
The above listTools() will return the names, descriptions, and parameter schemas of all tools. This information should be passed to the LLM in subsequent calls so the model knows what tools are available to call.

**Backend: Handle chat requests**
Define the processQuery function:
- Construct messages: Add system prompts and historical messages.
- Send to LLM: Call openai.chat.completions.create (or corresponding Frontier LLM API), and pass in toolsForLLM to enable function calling. Currently supports frontier LLMs with OpenAI protocol and models that support tool calls. Supports users configuring their own API Key for calls.
- Judge tool calls: If tool_calls is not empty, return the tool call information (function name, parameters) to the frontend, do not execute immediately.
- Normal reply: If there are no tool calls, directly return the LLM's reply.

Code example:
```
async function processQuery(messagesInput) {
  const messages = [
    { role: 'system', content: 'You are an assistant that can use tools.' },
    ...messagesInput,
  ];
  const response = await llm.chat.completions.create({
    model: MODEL_NAME,
    messages,
    tools: toolsForLLM,
    max_tokens: 1000,
  });

  const replyMessage = response.choices[0].message;
  const toolCalls = replyMessage.tool_calls || [];
  if (toolCalls.length > 0) {
    // Return tool call information, wait for user confirmation
    return { reply: null, toolCalls };
  }
  return { reply: replyMessage.content, toolCalls: [] };
}
```

**Frontend: Render chat and confirmation interface**
- Chat messages are saved in state, containing roles (user, assistant, tool) and text.
- When the backend returns toolCalls, display the tool name and parameters in the interface, and present "Run" / "Cancel" buttons.
- When the user clicks "Run", call /api/run-tool; when clicking "Cancel", call /api/cancel-tool or ignore directly.
Simple pseudo-code:
```
function Chat() {
  const [messages, setMessages] = useState([]);
  const [pendingTool, setPendingTool] = useState(null);

  async function sendUserMessage(content) {
    const newMessages = [...messages, { role: 'user', content }];
    const data = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: newMessages }),
    }).then(res => res.json());
    if (data.toolCalls?.length) {
      setPendingTool(data.toolCalls[0]);
      setMessages([...newMessages, { role: 'assistant', content: 'Model requests to run tool' }]);
    } else {
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    }
  }

  async function runTool() {
    const res = await fetch('/api/run-tool', {
      method: 'POST',
      body: JSON.stringify({ toolCall: pendingTool, messages }),
    }).then(res => res.json());
    setMessages([
      ...messages,
      { role: 'tool', content: res.result },   // Tool result
      { role: 'assistant', content: res.reply }, // LLM's subsequent reply
    ]);
    setPendingTool(null);
  }

  function cancelTool() {
    setMessages([...messages, { role: 'assistant', content: 'Tool call cancelled' }]);
    setPendingTool(null);
  }
}
```

***Execute tools and continue conversation***
- When the user confirms tool execution:
Extract the function name and parameters from toolCall.
Call mcp.callTool({ name, arguments }) to execute the tool.
Append the tool's returned result as a role: 'tool' message to the session, and call the LLM again to get subsequent replies.

Example:
```
async function runToolAndContinue(toolCall, messages) {
  const { function: fn } = toolCall;
  const result = await mcp.callTool({
    name: fn.name,
    arguments: JSON.parse(fn.arguments || '{}'),
  });
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall] });
  messages.push({ role: 'tool', content: result.content, tool_call_id: toolCall.id });

  const followUp = await llm.chat.completions.create({
    model: MODEL_NAME,
    messages,
  });
  return { reply: followUp.choices[0].message.content, result: result.content };
}
```

**Session loop and exit logic**
Maintain a loop in the backend to control the alternating use of LLM and tools. When two consecutive non-tool replies are generated, the automatic loop can be ended, waiting for new user input. The core idea is to alternately call tools and feed the results back to the model.

**Install dependencies in frontend/backend project**
```
npm install @modelcontextprotocol/sdk openai # or other LLM SDK
```
Start the backend service (Next.js API or Express).
Run the frontend React application, ensuring the backend interface address is configured correctly.

## Summary
This project solution implements a locally runnable chat tool that supports calling tools through MCP Server. The key points are: connect to local MCP Server in the backend and get the tool list
modelcontextprotocol.io
; confirm with the user before calling tools; call tools and continue conversation after user confirmation; frontend is responsible for chat interface and user interaction through React. Since all components run locally, there are no external dependencies, and tool logic and data security can be completely controlled.


## Recommend Structure

```
mcp-chat-ui/
├── public/                     # Static assets (favicon, icons, etc.)
├── src/                        # All source code
│   ├── main.tsx                # App entry point
│   ├── App.tsx                 # Router container
│
│   ├── routes/                 # Route-level page components
│   │   ├── index.tsx           # Home page
│   │   ├── chat/
│   │   │   └── ChatPage.tsx
│   │   └── settings/
│   │       └── SettingsPage.tsx
│
│   ├── components/             # Reusable components
│   │   ├── ui/                 # Generic UI elements (Button, Modal, etc.)
│   │   ├── layout/             # Layout components (Sidebar, Header)
│   │   └── chat/               # Chat-specific components
│
│   ├── stores/                 # Zustand stores (state management)
│   │   ├── userStore.ts
│   │   └── chatStore.ts
│
│   ├── hooks/                  # Custom React hooks
│   │   └── useScrollToBottom.ts
│
│   ├── lib/                    # Shared utilities and services
│   │   ├── api.ts              # API client
│   │   └── i18n.ts             # i18n config (optional)
│
│   ├── types/                  # Global TypeScript type definitions
│   │   └── message.ts
│
│   ├── styles/                 # Tailwind + global CSS
│   │   ├── index.css           # Entry for Tailwind
│   │   └── theme.css           # Optional: custom themes
│
│   └── assets/                 # Images, icons, SVGs, etc.
│       └── logo.svg
│
├── index.html
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── package.json
```

Vite Configuration Example
If you want to use path alias like @/components/Button, add this to vite.config.ts:

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```
Then in code:
```
import Button from '@/components/ui/Button'
```