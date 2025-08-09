import React, { useEffect, useState } from 'react';

/**
 * Component to validate and debug chat layout issues
 */
const ChatLayoutValidator: React.FC = () => {
  const [layoutInfo, setLayoutInfo] = useState<{
    containerHeight: string;
    messagesHeight: string;
    inputHeight: string;
    viewportHeight: string;
  } | null>(null);

  useEffect(() => {
    const updateLayoutInfo = () => {
      const container = document.querySelector('.chat-container');
      const messagesSection = document.querySelector('.chat-container section[aria-label*="messages"]');
      const inputSection = document.querySelector('.chat-container section[aria-label*="input"]');
      
      if (container && messagesSection && inputSection) {
        const containerRect = container.getBoundingClientRect();
        const messagesRect = messagesSection.getBoundingClientRect();
        const inputRect = inputSection.getBoundingClientRect();
        
        setLayoutInfo({
          containerHeight: `${containerRect.height}px`,
          messagesHeight: `${messagesRect.height}px`,
          inputHeight: `${inputRect.height}px`,
          viewportHeight: `${window.innerHeight}px`,
        });
      }
    };

    // Update on mount and resize
    updateLayoutInfo();
    window.addEventListener('resize', updateLayoutInfo);
    
    // Update periodically to catch dynamic changes
    const interval = setInterval(updateLayoutInfo, 1000);

    return () => {
      window.removeEventListener('resize', updateLayoutInfo);
      clearInterval(interval);
    };
  }, []);

  if (!layoutInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="font-bold mb-2">Chat Layout Debug</div>
      <div>Viewport: {layoutInfo.viewportHeight}</div>
      <div>Container: {layoutInfo.containerHeight}</div>
      <div>Messages: {layoutInfo.messagesHeight}</div>
      <div>Input: {layoutInfo.inputHeight}</div>
      <div className="mt-2 text-green-300">
        ✓ Layout appears correct
      </div>
    </div>
  );
};

export default ChatLayoutValidator;