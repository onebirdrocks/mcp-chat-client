import React, { useState, useEffect } from 'react';

/**
 * Theme debugger component to help diagnose theme switching issues
 */
const ThemeDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<{
    localStorage: string | null;
    documentClass: string;
    systemPreference: boolean;
    computedStyle: string;
  } | null>(null);

  const updateDebugInfo = () => {
    const localStorage = window.localStorage.getItem('mcp-chat-ui-theme');
    const documentClass = document.documentElement.className;
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const computedStyle = window.getComputedStyle(document.documentElement).backgroundColor;

    setDebugInfo({
      localStorage,
      documentClass,
      systemPreference,
      computedStyle,
    });
  };

  useEffect(() => {
    updateDebugInfo();
    
    // Update every second to catch changes
    const interval = setInterval(updateDebugInfo, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const forceApplyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log('🔧 Force applied dark theme');
    } else {
      root.classList.remove('dark');
      console.log('🔧 Force applied light theme');
    }
    
    localStorage.setItem('mcp-chat-ui-theme', theme);
    updateDebugInfo();
  };

  const clearCache = () => {
    localStorage.removeItem('mcp-chat-ui-theme');
    document.documentElement.className = '';
    console.log('🧹 Cleared theme cache');
    updateDebugInfo();
  };

  if (!debugInfo) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="font-bold mb-2 text-yellow-300">🐛 Theme Debug Info</div>
      
      <div className="space-y-1 mb-3">
        <div>
          <span className="text-blue-300">localStorage:</span> 
          <span className="text-green-300">{debugInfo.localStorage || 'null'}</span>
        </div>
        <div>
          <span className="text-blue-300">document.class:</span> 
          <span className="text-green-300">'{debugInfo.documentClass}'</span>
        </div>
        <div>
          <span className="text-blue-300">system dark:</span> 
          <span className="text-green-300">{debugInfo.systemPreference ? 'true' : 'false'}</span>
        </div>
        <div>
          <span className="text-blue-300">bg-color:</span> 
          <span className="text-green-300">{debugInfo.computedStyle}</span>
        </div>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => forceApplyTheme('light')}
          className="block w-full bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-xs"
        >
          🔧 Force Light
        </button>
        <button
          onClick={() => forceApplyTheme('dark')}
          className="block w-full bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs"
        >
          🔧 Force Dark
        </button>
        <button
          onClick={clearCache}
          className="block w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          🧹 Clear Cache
        </button>
      </div>
    </div>
  );
};

export default ThemeDebugger;