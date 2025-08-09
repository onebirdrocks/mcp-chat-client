import React from 'react';

/**
 * Demo component to visualize chat layout structure
 * This shows how the chat interface is structured with input at bottom
 */
const ChatLayoutDemo: React.FC = () => {
  return (
    <div className="h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto h-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Chat Layout Demo</h1>
        
        {/* Chat Container - Same structure as actual Chat component */}
        <div className="chat-container bg-white rounded-lg shadow-lg">
          
          {/* Header/Alerts Area */}
          <div className="flex-shrink-0 p-4 bg-blue-50 border-b">
            <div className="text-sm text-blue-700">
              📍 Header/Alerts Area (flex-shrink-0)
            </div>
          </div>
          
          {/* Messages Area - Takes remaining space */}
          <section 
            className="flex-1 min-h-0 overflow-hidden bg-gray-50 p-4"
            style={{ minHeight: '200px' }}
          >
            <div className="h-full flex flex-col justify-center items-center text-gray-600">
              <div className="text-lg font-semibold mb-2">📝 Messages Area</div>
              <div className="text-sm text-center">
                <div>flex-1 min-h-0 overflow-hidden</div>
                <div className="mt-2">This area expands to fill available space</div>
                <div className="mt-4 p-4 bg-white rounded border">
                  <div className="text-xs text-gray-500 mb-2">Sample messages would appear here:</div>
                  <div className="space-y-2">
                    <div className="bg-blue-100 p-2 rounded text-sm">User: Hello!</div>
                    <div className="bg-green-100 p-2 rounded text-sm">Assistant: Hi there!</div>
                    <div className="bg-blue-100 p-2 rounded text-sm">User: How are you?</div>
                    <div className="bg-green-100 p-2 rounded text-sm">Assistant: I'm doing well, thanks!</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Input Area - Fixed at bottom */}
          <section className="flex-shrink-0 mt-auto bg-white border-t">
            <div className="p-4">
              <div className="text-sm text-green-700 mb-2">
                💬 Input Area (flex-shrink-0 mt-auto)
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  className="flex-1 p-3 border rounded-lg bg-gray-50"
                  disabled
                />
                <button 
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg"
                  disabled
                >
                  Send
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                This input area is always at the bottom thanks to:
                <ul className="list-disc list-inside mt-1">
                  <li>flex-shrink-0: Won't shrink when space is limited</li>
                  <li>mt-auto: Pushes itself to the bottom</li>
                  <li>sticky bottom-0: Stays at bottom when scrolling</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
        
        {/* Layout Explanation */}
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Layout Structure Explanation</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div><strong>Container:</strong> <code>chat-container</code> - Uses flexbox column layout with full height</div>
            <div><strong>Messages:</strong> <code>flex-1 min-h-0</code> - Expands to fill available space, allows scrolling</div>
            <div><strong>Input:</strong> <code>flex-shrink-0 mt-auto</code> - Fixed size, pushed to bottom</div>
            <div><strong>Sticky:</strong> <code>sticky bottom-0</code> - Stays at bottom when content scrolls</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayoutDemo;