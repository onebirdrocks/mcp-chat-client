'use client';

import { useState, useEffect } from 'react';
import { AISDKMCPIntegration } from '@/lib/ai-sdk-mcp-integration';

export default function TestAIToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAIIntegration = async () => {
      try {
        setLoading(true);
        const mcpIntegration = new AISDKMCPIntegration();
        await mcpIntegration.refreshEnabledTools();
        
        const aiSDKTools = mcpIntegration.convertToolsToAISDKFormat();
        setTools(aiSDKTools);
        
        console.log('AI SDK Tools:', aiSDKTools);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error testing AI integration:', err);
      } finally {
        setLoading(false);
      }
    };

    testAIIntegration();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">测试 AI SDK MCP 集成</h1>
        <p>正在加载工具...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">测试 AI SDK MCP 集成</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>错误:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">测试 AI SDK MCP 集成</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">工具统计</h2>
        <p>总共获取到 <strong>{tools.length}</strong> 个工具</p>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">工具列表</h2>
        <div className="space-y-2">
          {tools.map((tool, index) => (
            <div key={index} className="border p-3 rounded">
              <h3 className="font-medium text-blue-600">{tool.function.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{tool.function.description}</p>
              <div className="mt-2">
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500">查看参数</summary>
                  <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(tool.function.parameters, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">原始数据</h2>
        <details>
          <summary className="cursor-pointer text-blue-600">查看完整的工具数据</summary>
          <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(tools, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
