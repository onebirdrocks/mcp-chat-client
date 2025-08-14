'use client';

import { useState } from 'react';
import { ToolCall } from '@/lib/tool-call-client';
import InlineToolCallConfirmation from '@/components/chat/InlineToolCallConfirmation';

export default function TestInlineToolConfirmationPage() {
  const [toolCalls] = useState<ToolCall[]>([
    {
      id: '1',
      name: 'ebook-mcp:get_all_epub_files',
      arguments: { path: '/Users/onebird/Downloads' },
      serverName: 'ebook-mcp'
    },
    {
      id: '2',
      name: 'playwright:browser_navigate',
      arguments: { url: 'https://example.com' },
      serverName: 'playwright'
    },
    {
      id: '3',
      name: 'filesystem:read_file',
      arguments: { path: '/etc/hosts' },
      serverName: 'filesystem'
    }
  ]);

  const [confirmedTools, setConfirmedTools] = useState<ToolCall[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleConfirm = (tools: ToolCall[]) => {
    setConfirmedTools(tools);
    console.log('Confirmed tools:', tools);
  };

  const handleCancel = () => {
    setIsCancelled(true);
    console.log('Tool execution cancelled');
  };

  const handleSelectAll = () => {
    console.log('Select all clicked');
  };

  const handleSelectNone = () => {
    console.log('Select none clicked');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          内联工具调用确认测试
        </h1>
        
        <div className="space-y-6">
          {/* 模拟聊天消息 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">AI</span>
              </div>
              <div className="flex-1">
                <div className="text-gray-900 dark:text-white mb-4">
                  <p>我需要帮您查找下载文件夹中的电子书文件，并打开一个网页来获取更多信息。</p>
                </div>
                
                {/* 内联工具调用确认组件 */}
                <InlineToolCallConfirmation
                  toolCalls={toolCalls}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  onSelectAll={handleSelectAll}
                  onSelectNone={handleSelectNone}
                />
              </div>
            </div>
          </div>

          {/* 结果显示 */}
          {confirmedTools.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h3 className="text-green-800 dark:text-green-200 font-semibold mb-2">
                已确认的工具
              </h3>
              <div className="space-y-2">
                {confirmedTools.map((tool) => (
                  <div key={tool.id} className="text-green-700 dark:text-green-300">
                    <strong>{tool.name}</strong> ({tool.serverName}) - {JSON.stringify(tool.arguments)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <h3 className="text-red-800 dark:text-red-200 font-semibold">
                工具执行已取消
              </h3>
            </div>
          )}

          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
              功能说明
            </h3>
            <ul className="space-y-2 text-blue-700 dark:text-blue-300">
              <li>• 工具调用确认现在直接在对话消息中显示，而不是弹出窗口</li>
              <li>• 用户可以展开/折叠工具列表查看详细信息</li>
              <li>• 支持单个选择、全选、全不选功能</li>
              <li>• 可以查看每个工具的参数详情</li>
              <li>• 确认后工具会立即执行，取消则停止执行</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
