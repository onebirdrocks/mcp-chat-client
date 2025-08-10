// Simple test to verify streaming functionality
const { chatApi } = require('./src/services/apiClient');

async function testStreaming() {
  console.log('Testing streaming functionality...');
  
  const testRequest = {
    messages: [
      { role: 'user', content: 'Hello, can you tell me about streaming?' }
    ],
    sessionId: 'test-session-123',
    provider: 'openai',
    model: 'gpt-3.5-turbo'
  };
  
  try {
    console.log('Starting streaming request...');
    
    for await (const chunk of chatApi.sendMessageStream(testRequest)) {
      console.log('Received chunk:', chunk);
      
      if (chunk.type === 'error') {
        console.error('Streaming error:', chunk.error);
        break;
      }
      
      if (chunk.type === 'done') {
        console.log('Streaming completed successfully');
        break;
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testStreaming();
}

module.exports = { testStreaming };