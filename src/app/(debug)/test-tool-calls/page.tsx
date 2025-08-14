'use client';

import { useState } from 'react';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client';
import ToolCallStatus from '@/components/chat/ToolCallStatus';

export default function TestToolCallsPage() {
  const [toolStatus, setToolStatus] = useState<'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'>('pending');
  
  const mockToolCalls: ToolCall[] = [
    {
      id: 'tool_1',
      name: 'system:getCurrentTime',
      arguments: {},
      serverName: 'system'
    },
    {
      id: 'tool_2',
      name: 'filesystem:readFile',
      arguments: { path: './example.txt' },
      serverName: 'filesystem'
    },
    {
      id: 'tool_3',
      name: 'ebook-mcp:get_all_epub_files',
      arguments: { path: '/Users/onebird/Downloads' },
      serverName: 'ebook-mcp'
    }
  ];

  const mockToolResults: ToolCallResult[] = [
    {
      toolCallId: 'tool_1',
      success: true,
      result: {
        currentTime: new Date().toISOString(),
        timezone: 'UTC'
      }
    },
    {
      toolCallId: 'tool_2',
      success: false,
      error: 'File not found: ./example.txt'
    },
    {
      toolCallId: 'tool_3',
      success: true,
      result: [
        'Beyond Vibe Coding 2.epub',
        'Learning.Blender.3rd.2021.4(4).epub',
        'SwiftUI.Apprentice.2nd.2023.4(2).epub'
      ]
    }
  ];

  const handleRetry = () => {
    setToolStatus('executing');
    setTimeout(() => {
      setToolStatus('completed');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Cursor风格工具状态UI测试
        </h1>
        
        <div className="space-y-6">
          {/* 状态切换按钮 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              切换工具执行状态
            </h2>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'executing', 'completed', 'failed', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setToolStatus(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    toolStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {status === 'pending' && '等待确认'}
                  {status === 'executing' && '执行中'}
                  {status === 'completed' && '已完成'}
                  {status === 'failed' && '执行失败'}
                  {status === 'cancelled' && '已取消'}
                </button>
              ))}
            </div>
          </div>

          {/* 工具调用状态显示 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              工具执行状态显示
            </h2>
            <ToolCallStatus
              toolCalls={mockToolCalls}
              toolResults={toolStatus === 'completed' || toolStatus === 'failed' ? mockToolResults : undefined}
              toolStatus={toolStatus}
              onRetry={toolStatus === 'failed' ? handleRetry : undefined}
            />
          </div>

          {/* 新UI特性说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
              新UI特性
            </h3>
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              <li>• 🎨 <strong>Cursor风格设计</strong>：更简洁、现代的视觉设计</li>
              <li>• 🔄 <strong>独立展开</strong>：每个工具可以独立展开查看参数和结果</li>
              <li>• ✅ <strong>清晰状态</strong>：绿色勾选表示成功，红色叉号表示失败</li>
              <li>• 📊 <strong>成功统计</strong>：显示成功执行的工具数量</li>
              <li>• 🎯 <strong>直观操作</strong>：失败时显示重试按钮</li>
              <li>• 🌙 <strong>深色模式</strong>：完整的深色模式支持</li>
              <li>• ⚡ <strong>流畅动画</strong>：平滑的展开/折叠动画</li>
            </ul>
          </div>

          {/* 使用说明 */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-900 dark:text-green-100">
              使用说明
            </h3>
            <ul className="space-y-2 text-green-800 dark:text-green-200">
              <li>• 点击上方按钮切换不同的工具执行状态</li>
              <li>• 点击每个工具右侧的箭头可以展开/折叠详细信息</li>
              <li>• 当状态为"失败"时，会显示重试按钮</li>
              <li>• 展开后可以看到每个工具的详细参数和执行结果</li>
              <li>• 成功和失败的工具会用不同的颜色区分</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
