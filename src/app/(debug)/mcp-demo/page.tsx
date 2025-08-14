'use client';

import { useState, useEffect } from 'react';
import { Play, Square, MessageSquare, Zap, Server, Wrench } from 'lucide-react';
import { AISDKMCPIntegration, checkAllMCPHealth } from '@/lib/ai-sdk-mcp-integration';
import { MCPServer } from '@/types/mcp';

export default function MCPDemoPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [mcpIntegration, setMcpIntegration] = useState<AISDKMCPIntegration | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/mcp');
        const data = await response.json();
        if (data.servers) {
          setServers(data.servers);
        }
        
        const integration = new AISDKMCPIntegration();
        setMcpIntegration(integration);
        
        updateServerStatus(integration);
      } catch (error) {
        console.error('Failed to load servers:', error);
      }
    };

    loadData();
  }, []);

  const updateServerStatus = (integration: AISDKMCPIntegration) => {
    const status = integration.getServerStatusSummary();
    setServerStatus(status);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !mcpIntegration) return;

    setIsProcessing(true);
    const userMessage = chatMessage;
    setChatMessage('');

    // Add user message to chat
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Check if message requires MCP tools
      const requiresTools = userMessage.toLowerCase().includes('weather') ||
                           userMessage.toLowerCase().includes('blender') ||
                           userMessage.toLowerCase().includes('youtube') ||
                           userMessage.toLowerCase().includes('browser') ||
                           userMessage.toLowerCase().includes('ebook');

      if (requiresTools) {
        // Simulate AI response with tool usage
        const tools = mcpIntegration.getAvailableTools();
        const availableToolNames = tools.map(t => t.name).join(', ');
        
        const assistantMessage = {
          role: 'assistant',
          content: `I can help you with that! I have access to these MCP tools: ${availableToolNames}. Let me use the appropriate one.`,
          toolCalls: [
            {
              id: 'demo_call',
              name: tools[0]?.name || 'generic_tool',
              arguments: { action: 'demo', query: userMessage }
            }
          ]
        };

        setChatHistory(prev => [...prev, assistantMessage]);

        // Simulate tool execution
        await new Promise(resolve => setTimeout(resolve, 2000));

        const toolResult = {
          role: 'tool',
          toolCallId: 'demo_call',
          content: `Tool executed successfully! This is a simulated result for: "${userMessage}"`
        };

        setChatHistory(prev => [...prev, toolResult]);

        // Final response
        const finalResponse = {
          role: 'assistant',
          content: `I've processed your request using MCP tools. The result shows that the operation was successful.`
        };

        setChatHistory(prev => [...prev, finalResponse]);
      } else {
        // Regular response without tools
        const assistantMessage = {
          role: 'assistant',
          content: `I received your message: "${userMessage}". This doesn't require any special tools, but I can help you with tasks that would benefit from MCP integration like weather queries, Blender operations, YouTube transcript extraction, browser automation, or ebook processing.`
        };

        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckHealth = async () => {
    if (!mcpIntegration) return;

    try {
      const healthResults = await checkAllMCPHealth();
      console.log('Health check results:', healthResults);
      
      // Update server list
      const response = await fetch('/api/mcp');
      const data = await response.json();
      if (data.servers) {
        setServers(data.servers);
      }
      updateServerStatus(mcpIntegration);
      
      alert(`Health check completed! Found ${healthResults.length} enabled servers.`);
    } catch (error) {
      console.error('Health check failed:', error);
      alert('Health check failed. Check console for details.');
    }
  };

  const getAvailableTools = () => {
    if (!mcpIntegration) return [];
    return mcpIntegration.getAvailableTools();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-6">MCP + AI SDK Integration Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server Status Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Server Status
            </h2>
            
            {serverStatus && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Servers:</span>
                  <span className="text-white">{serverStatus.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Enabled:</span>
                  <span className="text-green-400">{serverStatus.enabled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Connected:</span>
                  <span className="text-blue-400">{serverStatus.connected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Errors:</span>
                  <span className="text-red-400">{serverStatus.error}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Available Tools:</span>
                  <span className="text-yellow-400">{serverStatus.tools}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleCheckHealth}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Check Health
            </button>
          </div>

          {/* Available Tools */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Available Tools
            </h3>
            <div className="space-y-2">
              {getAvailableTools().map((tool, index) => (
                <div key={index} className="bg-gray-700 rounded p-2">
                  <p className="text-white font-medium text-sm">{tool.name}</p>
                  <p className="text-gray-400 text-xs">{tool.description}</p>
                </div>
              ))}
              {getAvailableTools().length === 0 && (
                <p className="text-gray-400 text-sm">No tools available. Enable some MCP servers first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg border border-gray-700 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                MCP Chat Demo
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Try asking about weather, Blender, YouTube, browser automation, or ebooks!
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation to see MCP tools in action!</p>
                  <p className="text-sm mt-2">Example: "What's the weather like in Tokyo?"</p>
                </div>
              )}
              
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.role === 'tool'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === 'user' && <span className="text-xs">You</span>}
                      {message.role === 'assistant' && <span className="text-xs">AI Assistant</span>}
                      {message.role === 'tool' && <span className="text-xs">MCP Tool</span>}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    {message.toolCalls && (
                      <div className="mt-2 p-2 bg-black bg-opacity-20 rounded text-xs">
                        <p className="font-medium">Tool Calls:</p>
                        {message.toolCalls.map((call: any, callIndex: number) => (
                          <div key={callIndex} className="mt-1">
                            <p>• {call.name}({JSON.stringify(call.arguments)})</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-white rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about weather, Blender, YouTube, browser automation, or ebooks..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !chatMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Example Prompts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => setChatMessage("What's the weather like in New York?")}
            className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <p className="text-white font-medium">Weather Query</p>
            <p className="text-gray-400 text-sm">"What's the weather like in New York?"</p>
          </button>
          <button
            onClick={() => setChatMessage("Get information about the current Blender scene")}
            className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <p className="text-white font-medium">Blender Scene</p>
            <p className="text-gray-400 text-sm">"Get information about the current Blender scene"</p>
          </button>
          <button
            onClick={() => setChatMessage("Extract transcript from a YouTube video")}
            className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <p className="text-white font-medium">YouTube Transcript</p>
            <p className="text-gray-400 text-sm">"Extract transcript from a YouTube video"</p>
          </button>
          <button
            onClick={() => setChatMessage("Navigate to a website using browser automation")}
            className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <p className="text-white font-medium">Browser Automation</p>
            <p className="text-gray-400 text-sm">"Navigate to a website using browser automation"</p>
          </button>
          <button
            onClick={() => setChatMessage("Get metadata from an ebook file")}
            className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <p className="text-white font-medium">Ebook Processing</p>
            <p className="text-gray-400 text-sm">"Get metadata from an ebook file"</p>
          </button>
          <button
            onClick={() => setChatMessage("Hello, how are you?")}
            className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <p className="text-white font-medium">Regular Chat</p>
            <p className="text-gray-400 text-sm">"Hello, how are you?"</p>
          </button>
        </div>
      </div>
    </div>
  );
}
