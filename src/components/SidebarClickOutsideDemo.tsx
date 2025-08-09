import React, { useState, useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { Button } from './ui';

/**
 * Demo component to test sidebar click-outside functionality
 */
const SidebarClickOutsideDemo: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Use the click outside hook
  useClickOutside(
    sidebarRef,
    () => setSidebarOpen(false),
    sidebarOpen,
    ['[data-sidebar-trigger]', '[data-exclude-click-outside]']
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              侧边栏
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
              aria-label="关闭侧边栏"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  这是侧边栏内容。点击侧边栏外的任何地方都会关闭侧边栏。
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                data-exclude-click-outside
                onClick={() => alert('这个按钮被排除在点击外部关闭功能之外')}
              >
                排除的按钮
              </Button>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  导航项目
                </h3>
                <ul className="space-y-1">
                  <li>
                    <a href="#" className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                      首页
                    </a>
                  </li>
                  <li>
                    <a href="#" className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                      设置
                    </a>
                  </li>
                  <li>
                    <a href="#" className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                      帮助
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
                data-sidebar-trigger
                aria-label="打开侧边栏"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                点击外部关闭侧边栏演示
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-sm px-2 py-1 rounded-full ${
                sidebarOpen 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                侧边栏: {sidebarOpen ? '打开' : '关闭'}
              </span>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                功能测试说明
              </h2>
              
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    如何测试点击外部关闭功能：
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>在移动设备上或缩小浏览器窗口，点击左上角的菜单按钮打开侧边栏</li>
                    <li>点击侧边栏外的任何地方（比如这个内容区域）</li>
                    <li>侧边栏应该自动关闭</li>
                    <li>点击侧边栏内的"排除的按钮"不会关闭侧边栏</li>
                    <li>点击菜单按钮本身也不会关闭侧边栏</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h4 className="font-medium mb-2">桌面端行为</h4>
                    <p className="text-sm">
                      在大屏幕上，侧边栏默认显示。点击外部区域仍然可以关闭侧边栏。
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h4 className="font-medium mb-2">移动端行为</h4>
                    <p className="text-sm">
                      在小屏幕上，侧边栏默认隐藏。需要点击菜单按钮打开，点击外部区域关闭。
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    排除元素
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    某些元素被排除在点击外部关闭功能之外，包括：
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                    <li>菜单按钮 (data-sidebar-trigger)</li>
                    <li>标记为排除的元素 (data-exclude-click-outside)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarClickOutsideDemo;