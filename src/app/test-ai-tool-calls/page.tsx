'use client';

import { useState } from 'react';
import { toolCallClientService } from '@/lib/tool-call-client';

export default function TestAIToolCallsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('Please help me list all ebooks in /Users/onebird/Downloads directory');

  const testAIToolCalls = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 获取可用工具
      const tools = await toolCallClientService.getAllAvailableTools();
      
      // 测试AI驱动的工具调用检测
      const toolResponse = await toolCallClientService.callModelWithTools(
        'openai',
        'gpt-4o',
        userPrompt,
        tools
      );

      setResult({
        userPrompt,
        availableTools: tools,
        toolResponse,
        message: 'AI驱动的工具调用检测完成'
      });

      console.log('AI Tool response:', toolResponse);
    } catch (err: any) {
      setError(err.message || '测试失败');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testDifferentPrompts = async (prompt: string) => {
    setUserPrompt(prompt);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const tools = await toolCallClientService.getAllAvailableTools();
      const toolResponse = await toolCallClientService.callModelWithTools(
        'openai',
        'gpt-4o',
        prompt,
        tools
      );

      setResult({
        userPrompt: prompt,
        availableTools: tools,
        toolResponse,
        message: 'AI驱动的工具调用检测完成'
      });
    } catch (err: any) {
      setError(err.message || '测试失败');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          AI驱动的工具调用测试
        </h1>
        
        <div className="space-y-6">
          {/* 输入区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              测试输入
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  用户请求
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                  placeholder="输入您的请求..."
                />
              </div>
              <button
                onClick={testAIToolCalls}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '测试中...' : '测试AI工具调用'}
              </button>
            </div>
          </div>

          {/* 快速测试按钮 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              快速测试
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => testDifferentPrompts('Please help me list all ebooks in /Users/onebird/Downloads directory')}
                disabled={loading}
                className="p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <div className="font-medium">电子书列表</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">应该调用ebook工具</div>
              </button>
              
              <button
                onClick={() => testDifferentPrompts('What is the current time?')}
                disabled={loading}
                className="p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <div className="font-medium">获取时间</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">应该调用系统工具</div>
              </button>
              
              <button
                onClick={() => testDifferentPrompts('Can you read the file example.txt for me?')}
                disabled={loading}
                className="p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <div className="font-medium">读取文件</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">应该调用文件系统工具</div>
              </button>
              
              <button
                onClick={() => testDifferentPrompts('Hello, how are you today?')}
                disabled={loading}
                className="p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <div className="font-medium">普通问候</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">不应该调用任何工具</div>
              </button>
            </div>
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 dark:text-blue-200">AI正在分析您的请求...</span>
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">错误</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-green-800 dark:text-green-200 font-semibold mb-2">
                {result.message}
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-700 dark:text-green-300">用户请求:</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">{result.userPrompt}</p>
                </div>
                
                {result.toolResponse.toolCalls && result.toolResponse.toolCalls.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-300">AI决定调用工具:</h4>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {result.toolResponse.toolCalls.map((tool: any, index: number) => (
                        <div key={index} className="mt-2 p-2 bg-green-100 dark:bg-green-800 rounded">
                          <div><strong>工具:</strong> {tool.name}</div>
                          <div><strong>服务器:</strong> {tool.serverName}</div>
                          <div><strong>参数:</strong> {JSON.stringify(tool.arguments)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-300">AI决定不使用工具:</h4>
                    <p className="text-sm text-green-600 dark:text-green-400">{result.toolResponse.text}</p>
                  </div>
                )}
                
                <details className="text-sm">
                  <summary className="cursor-pointer text-green-700 dark:text-green-300 font-medium">
                    查看完整结果
                  </summary>
                  <pre className="mt-2 p-2 bg-green-100 dark:bg-green-800 rounded overflow-auto max-h-96 text-xs">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {/* 说明 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              测试说明
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• <strong>AI驱动判断</strong>: 现在由AI模型自己判断是否需要工具调用</li>
              <li>• <strong>智能分析</strong>: AI会分析用户请求的语义，而不是简单的字符串匹配</li>
              <li>• <strong>灵活响应</strong>: 可以处理各种自然语言表达方式</li>
              <li>• <strong>JSON格式</strong>: AI返回结构化的工具调用信息</li>
              <li>• 查看控制台输出获取更详细的AI分析过程</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
