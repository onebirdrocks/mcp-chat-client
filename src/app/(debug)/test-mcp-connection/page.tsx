'use client';

import { useState } from 'react';

export default function TestMCPConnectionPage() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testEbookMCP = async () => {
    setLoading(true);
    setStatus('Testing ebook-mcp connection...');
    
    try {
      const response = await fetch('/api/mcp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverType: 'ebook-mcp' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.message);
        setTools(result.tools || []);
      } else {
        setStatus(`Error: ${result.error}`);
        setTools([]);
      }
      
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('MCP test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Real MCP Connection Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <p className="text-gray-300 mb-4">Status: {status}</p>
          
          <button
            onClick={testEbookMCP}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
          >
            {loading ? 'Testing...' : 'Test ebook-mcp Connection'}
          </button>
        </div>

        {tools.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Available Tools ({tools.length})</h2>
            <div className="space-y-2">
              {tools.map((tool, index) => (
                <div key={index} className="bg-gray-700 p-3 rounded">
                  <h3 className="font-medium text-blue-400">{tool.name}</h3>
                  <p className="text-gray-300 text-sm">{tool.description}</p>
                  {tool.inputSchema && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">Input Schema:</p>
                      <pre className="text-xs bg-gray-900 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
