'use client';

import { useState } from 'react';
import { toolCallClientService } from '@/lib/tool-call-client';

export default function TestEbookToolsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testEbookTools = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 测试工具调用检测
      const toolResponse = await toolCallClientService.callModelWithTools(
        'openai',
        'gpt-4o',
        'Please help me list all ebooks in /Users/onebird/Downloads directory',
        []
      );

      setResult({
        toolResponse,
        message: '工具调用检测完成'
      });

      console.log('Tool response:', toolResponse);
    } catch (err: any) {
      setError(err.message || '测试失败');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testModelSupport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supportsTools = await toolCallClientService.checkModelSupportsTools(
        'openai',
        'gpt-4o'
      );

      setResult({
        supportsTools,
        message: '模型工具支持检测完成'
      });

      console.log('Model supports tools:', supportsTools);
    } catch (err: any) {
      setError(err.message || '测试失败');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testToolExecution = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const toolCalls = [
        {
          id: 'test1',
          name: 'ebook-mcp:get_all_epub_files',
          arguments: { path: '/Users/onebird/Downloads' },
          serverName: 'ebook-mcp'
        },
        {
          id: 'test2',
          name: 'ebook-mcp:get_all_pdf_files',
          arguments: { path: '/Users/onebird/Downloads' },
          serverName: 'ebook-mcp'
        }
      ];

      const results = await toolCallClientService.executeToolCalls(toolCalls);

      setResult({
        toolCalls,
        results,
        message: '工具执行测试完成'
      });

      console.log('Tool execution results:', results);
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
          Ebook工具调用测试
        </h1>
        
        <div className="space-y-6">
          {/* 测试按钮 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              测试功能
            </h2>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={testModelSupport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                测试模型工具支持
              </button>
              
              <button
                onClick={testEbookTools}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                测试Ebook工具调用检测
              </button>
              
              <button
                onClick={testToolExecution}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                测试工具执行
              </button>
            </div>
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 dark:text-blue-200">测试中...</span>
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
              <pre className="text-sm text-green-700 dark:text-green-300 overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* 说明 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              测试说明
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• <strong>测试模型工具支持</strong>: 检查GPT-4o是否支持工具调用</li>
              <li>• <strong>测试Ebook工具调用检测</strong>: 测试是否能检测到ebook相关的请求并生成工具调用</li>
              <li>• <strong>测试工具执行</strong>: 直接测试ebook-mcp工具的执行</li>
              <li>• 查看控制台输出获取更详细的信息</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
