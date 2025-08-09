import React from 'react';
import ChatInterface from './ChatInterface';

/**
 * Legacy Chat component - now uses the new ChatInterface
 * This maintains backward compatibility while using the enhanced implementation
 */
const Chat: React.FC = () => {
  return <ChatInterface className="chat-container in-layout" />;
};

export default Chat;
