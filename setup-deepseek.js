#!/usr/bin/env node

/**
 * Setup DeepSeek API for MCP Chat UI
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupDeepSeek() {
  console.log('🚀 DeepSeek API Setup for MCP Chat UI\n');
  
  // Test backend connection
  console.log('1. Testing backend connection...');
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('✅ Backend is running on port 3001');
    } else {
      console.log('❌ Backend responded with error:', response.status);
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to backend:', error.message);
    console.log('Please make sure the backend server is running with: cd backend && npm run dev');
    return;
  }

  // Prompt for DeepSeek API key
  console.log('\n2. DeepSeek API Key Setup...');
  console.log('You can get your DeepSeek API key from: https://platform.deepseek.com/api_keys');
  
  rl.question('Enter your DeepSeek API key (starts with sk-): ', async (apiKey) => {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.log('❌ Invalid API key format. DeepSeek keys should start with "sk-"');
      rl.close();
      return;
    }

    console.log('\n3. Testing DeepSeek API connection...');
    try {
      const testResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
        }),
      });

      if (testResponse.ok) {
        console.log('✅ DeepSeek API key is valid and working');
      } else {
        const errorData = await testResponse.json();
        console.log('❌ DeepSeek API key test failed:', errorData.error?.message || 'Unknown error');
        rl.close();
        return;
      }
    } catch (error) {
      console.log('❌ Network error testing DeepSeek API:', error.message);
      rl.close();
      return;
    }

    console.log('\n4. Configuring DeepSeek provider in backend...');
    try {
      const updateResponse = await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          llmProviders: [{
            id: 'deepseek-provider',
            name: 'deepseek',
            apiKey: apiKey,
            baseUrl: 'https://api.deepseek.com/v1',
            models: [
              {
                id: 'deepseek-chat',
                name: 'DeepSeek Chat',
                supportsToolCalling: true,
                maxTokens: 32768
              },
              {
                id: 'deepseek-coder',
                name: 'DeepSeek Coder',
                supportsToolCalling: true,
                maxTokens: 16384
              }
            ],
            enabled: true
          }]
        }),
      });

      if (updateResponse.ok) {
        console.log('✅ DeepSeek provider configured successfully');
      } else {
        const errorData = await updateResponse.json();
        console.log('❌ Failed to configure DeepSeek provider:', errorData.error || 'Unknown error');
        rl.close();
        return;
      }
    } catch (error) {
      console.log('❌ Network error configuring DeepSeek:', error.message);
      rl.close();
      return;
    }

    console.log('\n5. Testing backend connection to DeepSeek...');
    try {
      const testResponse = await fetch('http://localhost:3001/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId: 'deepseek-provider' }),
      });

      const result = await testResponse.json();
      if (result.success) {
        console.log('✅ Backend connection to DeepSeek successful!');
      } else {
        console.log('❌ Backend connection test failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Error testing backend connection:', error.message);
    }

    console.log('\n6. Testing chat functionality...');
    try {
      const chatResponse = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              id: 'deepseek_test_' + Date.now(),
              role: 'user',
              content: '你好，请用中文回复我'
            }
          ],
          sessionId: 'deepseek-test-session',
          provider: 'deepseek',
          model: 'deepseek-chat'
        }),
      });
      
      if (chatResponse.ok) {
        const data = await chatResponse.json();
        console.log('✅ DeepSeek chat test successful!');
        console.log('   Response:', data.reply ? data.reply.substring(0, 100) + '...' : 'No reply');
      } else {
        console.log('❌ Chat test failed:', chatResponse.status);
        const errorText = await chatResponse.text();
        console.log('   Error:', errorText);
      }
    } catch (error) {
      console.log('❌ Chat test error:', error.message);
    }

    console.log('\n🎉 DeepSeek setup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Open your browser and go to: http://localhost:5178');
    console.log('2. Go to Settings > LLM Provider');
    console.log('3. You should see DeepSeek configured and ready to use');
    console.log('4. Start chatting with DeepSeek models!');
    
    rl.close();
  });
}

setupDeepSeek().catch(console.error);