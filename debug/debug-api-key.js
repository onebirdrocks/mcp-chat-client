#!/usr/bin/env node

/**
 * Debug script to test API key storage and retrieval
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testApiKeyStorage() {
  console.log('🔍 MCP Chat UI - API Key Debug Tool\n');
  
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

  // Get current settings
  console.log('\n2. Checking current settings...');
  try {
    const response = await fetch('http://localhost:3001/api/settings');
    const settings = await response.json();
    console.log('Current LLM providers:', settings.llmProviders.length);
    
    settings.llmProviders.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (${provider.id})`);
      console.log(`     API Key: ${provider.apiKey || 'NOT SET'}`);
      console.log(`     Enabled: ${provider.enabled}`);
    });
  } catch (error) {
    console.log('❌ Failed to get settings:', error.message);
    return;
  }

  // Prompt for API key
  console.log('\n3. Let\'s test API key storage...');
  
  rl.question('Enter your OpenAI API key (starts with sk-): ', async (apiKey) => {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.log('❌ Invalid API key format. OpenAI keys should start with "sk-"');
      rl.close();
      return;
    }

    console.log('\n4. Testing API key with OpenAI...');
    try {
      const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
        }),
      });

      if (testResponse.ok) {
        console.log('✅ API key is valid and working with OpenAI');
      } else {
        const errorData = await testResponse.json();
        console.log('❌ API key test failed:', errorData.error?.message || 'Unknown error');
        rl.close();
        return;
      }
    } catch (error) {
      console.log('❌ Network error testing API key:', error.message);
      rl.close();
      return;
    }

    console.log('\n5. Saving API key to backend...');
    try {
      const updateResponse = await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          llmProviders: [{
            id: 'default-openai',
            name: 'openai',
            apiKey: apiKey,
            baseUrl: 'https://api.openai.com/v1',
            models: [
              {
                id: 'gpt-4o',
                name: 'GPT-4o',
                supportsToolCalling: true,
                maxTokens: 128000
              },
              {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                supportsToolCalling: true,
                maxTokens: 16385
              }
            ],
            enabled: true
          }]
        }),
      });

      if (updateResponse.ok) {
        console.log('✅ API key saved successfully');
      } else {
        const errorData = await updateResponse.json();
        console.log('❌ Failed to save API key:', errorData.error || 'Unknown error');
        rl.close();
        return;
      }
    } catch (error) {
      console.log('❌ Network error saving API key:', error.message);
      rl.close();
      return;
    }

    console.log('\n6. Testing connection through backend...');
    try {
      const testResponse = await fetch('http://localhost:3001/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId: 'default-openai' }),
      });

      const result = await testResponse.json();
      if (result.success) {
        console.log('✅ Backend connection test successful!');
        console.log('\n🎉 Your OpenAI API key is now properly configured!');
        console.log('You can now use the chat interface.');
      } else {
        console.log('❌ Backend connection test failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Error testing backend connection:', error.message);
    }

    rl.close();
  });
}

testApiKeyStorage().catch(console.error);