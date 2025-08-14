'use client';

import { useState } from 'react';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client';
import { toolCallClientService } from '@/lib/tool-call-client';

export default function TestMarkdownFormattingPage() {
  const [userPrompt, setUserPrompt] = useState('请帮我查找下载文件夹中的电子书文件，并告诉我有哪些PDF文件');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testMarkdownFormatting = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 模拟工具调用结果
      const mockToolResults: ToolCallResult[] = [
        {
          toolCallId: 'tool_1',
          success: true,
          result: {
            files: [
              { name: 'book1.pdf', size: '2.5MB', path: '/Users/onebird/Downloads/book1.pdf' },
              { name: 'document.pdf', size: '1.8MB', path: '/Users/onebird/Downloads/document.pdf' },
              { name: 'report.pdf', size: '3.2MB', path: '/Users/onebird/Downloads/report.pdf' }
            ],
            totalCount: 3,
            totalSize: '7.5MB'
          }
        },
        {
          toolCallId: 'tool_2',
          success: true,
          result: {
            epubFiles: [
              { name: 'novel.epub', size: '1.2MB' },
              { name: 'guide.epub', size: '0.8MB' }
            ],
            totalCount: 2
          }
        }
      ];

      // 使用工具调用服务处理结果
      const response = await toolCallClientService.continueConversationWithToolResults(
        'openai',
        'gpt-4o',
        userPrompt,
        mockToolResults
      );

      setResult({
        userPrompt,
        toolResults: mockToolResults,
        formattedResponse: response
      });

    } catch (error) {
      console.error('Test error:', error);
      setResult({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        userPrompt 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Markdown 格式化测试
        </h1>
        
        <div className="space-y-6">
          {/* 输入区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              测试配置
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
                  placeholder="输入需要工具调用的请求..."
                />
              </div>
              
              <button
                onClick={testMarkdownFormatting}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '处理中...' : '测试 Markdown 格式化'}
              </button>
            </div>
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 dark:text-blue-200">正在处理工具调用结果并生成 Markdown 格式的回复...</span>
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="space-y-6">
              {/* 原始工具调用结果 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  原始工具调用结果
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">用户请求:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{result.userPrompt}</p>
                  </div>
                  
                  {result.toolResults && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">工具执行结果:</h4>
                      <div className="space-y-2">
                        {result.toolResults.map((toolResult: ToolCallResult, index: number) => (
                          <div key={index} className="p-3 bg-white dark:bg-gray-700 rounded border">
                            <div className="text-sm">
                              <strong>工具 ID:</strong> {toolResult.toolCallId}
                            </div>
                            <div className="text-sm">
                              <strong>状态:</strong> {toolResult.success ? '成功' : '失败'}
                            </div>
                            {toolResult.success ? (
                              <div className="text-sm mt-2">
                                <strong>结果:</strong>
                                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs overflow-auto">
                                  {JSON.stringify(toolResult.result, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div className="text-sm mt-2 text-red-600">
                                <strong>错误:</strong> {toolResult.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Markdown 格式化结果 */}
              {result.formattedResponse && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">
                    Markdown 格式化结果
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                    <div className="prose dark:prose-invert max-w-none">
                      <div 
                        className="markdown-content"
                        dangerouslySetInnerHTML={{ 
                          __html: result.formattedResponse.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* 原始 Markdown 文本 */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-green-700 dark:text-green-300 font-medium">
                      查看原始 Markdown 文本
                    </summary>
                    <pre className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border text-sm overflow-auto">
                      {result.formattedResponse}
                    </pre>
                  </details>
                </div>
              )}

              {/* 错误信息 */}
              {result.error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">
                    错误信息
                  </h3>
                  <p className="text-red-700 dark:text-red-300">{result.error}</p>
                </div>
              )}
            </div>
          )}

          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
              功能说明
            </h3>
            <ul className="space-y-2 text-blue-700 dark:text-blue-300">
              <li>• 工具调用后，AI 会自动将结果格式化为结构化的 Markdown 格式</li>
              <li>• 包含总结、详细信息、分析和建议等部分</li>
              <li>• 使用表格、列表、代码块等 Markdown 元素来展示数据</li>
              <li>• 提供更好的可读性和结构化展示</li>
              <li>• 支持在聊天界面中正确渲染 Markdown 格式</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
