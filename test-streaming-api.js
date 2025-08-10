// Test the streaming API endpoint directly
async function testStreamingAPI() {
  console.log('Testing streaming API endpoint...');
  
  const testRequest = {
    messages: [
      { role: 'user', content: 'Hello, can you tell me about streaming?' }
    ],
    sessionId: 'test-session-123',
    provider: 'openai',
    model: 'gpt-3.5-turbo'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });
    
    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('No response body reader available');
      return;
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    console.log('Starting to read streaming response...');
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream ended');
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('data: ')) {
          const dataStr = trimmedLine.slice(6);
          
          if (dataStr === '[DONE]') {
            console.log('Received [DONE] marker');
            return;
          }
          
          try {
            const chunk = JSON.parse(dataStr);
            console.log('Received chunk:', chunk);
            
            if (chunk.type === 'error') {
              console.error('Streaming error:', chunk.error);
              return;
            }
            
            if (chunk.type === 'done') {
              console.log('Streaming completed successfully');
              return;
            }
          } catch (parseError) {
            console.warn('Failed to parse chunk:', dataStr, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testStreamingAPI };
}

// Run if executed directly
if (typeof window === 'undefined' && require.main === module) {
  testStreamingAPI();
}