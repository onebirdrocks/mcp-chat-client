'use client';

import { useState } from 'react';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client';
import InlineToolCallConfirmation from '@/components/chat/InlineToolCallConfirmation';

export default function TestSequentialToolsPage() {
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
    },
    {
      id: '4',
      name: 'system:getCurrentTime',
      arguments: {},
      serverName: 'system'
    }
  ]);

  const [executedTools, setExecutedTools] = useState<ToolCall[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [toolResults, setToolResults] = useState<ToolCallResult[]>([]);
  const [isWaitingForLLM, setIsWaitingForLLM] = useState(false);
  const [executingTools, setExecutingTools] = useState<Set<string>>(new Set());

  const handleConfirm = (tools: ToolCall[]) => {
    setExecutedTools(tools);
    setIsWaitingForLLM(true);
    setExecutionLog(prev => [...prev, `✅ 完成所有工具执行，共执行了 ${tools.length} 个工具`]);
    setExecutionLog(prev => [...prev, `🤖 正在等待AI回复...`]);
    console.log('All tools completed:', tools);
    
    // 模拟AI回复延迟
    setTimeout(() => {
      setIsWaitingForLLM(false);
      setExecutionLog(prev => [...prev, `💬 AI回复：所有工具执行完成，结果已处理完毕。`]);
    }, 3000);
  };

  const handleCancel = () => {
    setIsCancelled(true);
    setExecutionLog(prev => [...prev, '❌ 工具执行已取消']);
    console.log('Tool execution cancelled');
  };

  const handleReset = () => {
    setExecutedTools([]);
    setIsCancelled(false);
    setExecutionLog([]);
    setToolResults([]);
    setIsWaitingForLLM(false);
    setExecutingTools(new Set());
  };

  const handleExecuteSingle = (tool: ToolCall) => {
    setExecutionLog(prev => [...prev, `🔧 执行工具: ${tool.name} (${tool.serverName})`]);
    console.log('Executing single tool:', tool);
    
    // 设置工具为正在执行状态
    setExecutingTools(prev => new Set(prev).add(tool.id));
    
    // 模拟工具执行延迟和结果
    setTimeout(() => {
      // 从正在执行状态中移除
      setExecutingTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(tool.id);
        return newSet;
      });
      
      // 模拟一些工具可能失败的情况
      const shouldFail = tool.name.includes('filesystem') && Math.random() > 0.7; // 30% 概率失败
      
      const result: ToolCallResult = {
        toolCallId: tool.id,
        success: !shouldFail,
        result: shouldFail ? undefined : {
          message: `Tool ${tool.name} executed successfully`,
          timestamp: new Date().toISOString(),
          data: `Mock result for ${tool.name}`,
          files: tool.name.includes('ebook') ? [
            'Beyond Vibe Coding 2.epub',
            'Learning.Blender.3rd.2021.4(4).epub',
            'SwiftUI.Apprentice.2nd.2023.4(2).epub'
          ] : undefined
        },
        error: shouldFail ? 'File not found or permission denied' : undefined
      };
      
      setToolResults(prev => [...prev, result]);
      setExecutionLog(prev => [...prev, 
        shouldFail 
          ? `❌ 工具 ${tool.name} 执行失败: ${result.error}` 
          : `✅ 工具 ${tool.name} 执行完成`
      ]);
    }, 1000 + Math.random() * 500); // 1-1.5秒随机延迟
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Cursor风格工具执行UI测试
        </h1>
        
        {/* 重置按钮 */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            重置测试
          </button>
        </div>

        <div className="space-y-6">
          {/* 模拟聊天消息 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">AI</span>
              </div>
              <div className="flex-1">
                <div className="text-gray-900 dark:text-white mb-4">
                  <p>我需要帮您执行多个操作：首先查找电子书文件，然后打开网页，读取系统文件，最后获取当前时间。</p>
                </div>
                
                {/* 新的Cursor风格工具执行组件 */}
                <InlineToolCallConfirmation
                  toolCalls={toolCalls}
                  toolResults={toolResults}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  onExecuteSingle={handleExecuteSingle}
                  isWaitingForLLM={isWaitingForLLM}
                />
              </div>
            </div>
          </div>

          {/* 执行日志 */}
          {executionLog.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                执行日志
              </h3>
              <div className="space-y-2">
                {executionLog.map((log, index) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 调试信息 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-900 dark:text-yellow-100">
              调试信息
            </h3>
            <div className="space-y-2 text-yellow-800 dark:text-yellow-200">
              <p><strong>当前状态：</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>工具总数: {toolCalls.length}</li>
                <li>已执行工具数: {toolResults.length}</li>
                <li>正在执行工具数: {executingTools.size}</li>
                <li>当前工具索引: 0</li>
                <li>等待LLM: {isWaitingForLLM ? '是' : '否'}</li>
                <li>已取消: {isCancelled ? '是' : '否'}</li>
              </ul>
              <p><strong>工具状态：</strong></p>
              <ul className="list-disc list-inside space-y-1">
                {toolCalls.map((tool, index) => {
                  const result = toolResults.find(r => r.toolCallId === tool.id);
                  const isExecuted = result !== undefined;
                  const isExecuting = executingTools.has(tool.id);
                  const allToolsCompleted = toolResults.length === toolCalls.length;
                  const isCurrent = index === 0 && !isExecuted && !isExecuting && !allToolsCompleted;
                  return (
                    <li key={tool.id}>
                      {tool.name}: {isExecuting ? '正在执行' : isCurrent ? '等待确认执行' : isExecuted ? (
                        isWaitingForLLM ? 
                          (result?.success ? '执行成功，等待AI处理' : '执行失败，等待AI处理') :
                          (result?.success ? '执行成功' : '执行失败')
                      ) : '等待执行'}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* 结果显示 */}
          {executedTools.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-900 dark:text-green-100">
                执行结果
              </h3>
              <div className="space-y-2">
                <p className="text-green-800 dark:text-green-200">
                  成功执行了 {executedTools.length} 个工具：
                </p>
                <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300">
                  {executedTools.map((tool, index) => (
                    <li key={index}>
                      {tool.name} ({tool.serverName})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 取消状态 */}
          {isCancelled && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-900 dark:text-red-100">
                执行已取消
              </h3>
              <p className="text-red-800 dark:text-red-200">
                用户取消了工具执行操作。
              </p>
            </div>
          )}

          {/* 新UI特性说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
              新UI特性
            </h3>
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              <li>• 🎨 <strong>Cursor风格设计</strong>：更简洁、现代的视觉设计</li>
              <li>• 🔄 <strong>独立展开</strong>：每个工具可以独立展开查看参数</li>
              <li>• ✅ <strong>清晰状态</strong>：绿色勾选表示成功，红色叉号表示失败</li>
              <li>• 📱 <strong>响应式布局</strong>：适配不同屏幕尺寸</li>
              <li>• 🌙 <strong>深色模式</strong>：完整的深色模式支持</li>
              <li>• ⚡ <strong>流畅动画</strong>：平滑的展开/折叠动画</li>
              <li>• 🎯 <strong>直观操作</strong>：清晰的按钮和状态指示</li>
              <li>• 🤖 <strong>自动完成</strong>：工具执行完成后自动调用AI处理结果</li>
              <li>• 📊 <strong>实时状态更新</strong>：根据实际执行结果更新工具状态</li>
            </ul>
          </div>

          {/* 自动完成功能说明 */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-purple-900 dark:text-purple-100">
              自动完成功能
            </h3>
            <div className="space-y-3 text-purple-800 dark:text-purple-200">
              <p><strong>什么是自动完成？</strong></p>
              <p>当所有工具执行完成后，系统会自动调用AI来处理工具结果并生成回复，无需手动点击"完成"按钮。</p>
              
              <p><strong>如何控制？</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>默认开启自动完成功能</li>
                <li>可以通过左下角的"自动完成"复选框来控制</li>
                <li>关闭自动完成后，需要手动点击"完成"按钮</li>
              </ul>
              
              <p><strong>用户体验改进：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>减少不必要的交互步骤</li>
                <li>更流畅的对话体验</li>
                <li>工具执行完成后立即看到AI回复</li>
                <li>AI回复作为新消息显示，而不是替换工具调用界面</li>
              </ul>
            </div>
          </div>

          {/* 状态更新说明 */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-orange-900 dark:text-orange-100">
              状态更新机制
            </h3>
            <div className="space-y-3 text-orange-800 dark:text-orange-200">
              <p><strong>问题修复：</strong></p>
              <p>修复了工具一直显示"正在执行"的问题。现在工具状态会根据实际的执行结果进行更新。</p>
              
              <p><strong>更新机制：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>工具执行后，状态会从"正在执行"更新为"执行成功"或"执行失败"</li>
                <li>状态更新基于实际的工具执行结果，而不是用户操作</li>
                <li>可以展开工具查看详细的执行结果和错误信息</li>
                <li>支持成功和失败状态的视觉区分</li>
                <li><strong>自动前进</strong>：当前工具执行完成后，自动前进到下一个未执行的工具</li>
              </ul>
              
              <p><strong>测试说明：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>点击"执行"按钮后，工具会显示"正在执行"状态</li>
                <li>1-1.5秒后，工具状态会自动更新为"执行成功"或"执行失败"</li>
                <li>当前工具执行完成后，会自动前进到下一个工具</li>
                <li>可以展开工具查看模拟的执行结果</li>
                <li>所有工具执行完成后会自动调用完成回调</li>
                <li>filesystem工具有30%概率执行失败，用于测试失败状态</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
