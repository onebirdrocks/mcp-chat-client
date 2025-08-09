#!/usr/bin/env node

/**
 * Test script to verify the settings API handles empty/masked API keys correctly
 */

const API_BASE = 'http://localhost:3001';

async function testSettingsAPI() {
  console.log('🧪 Testing Settings API with empty/masked API keys...\n');

  // Test data with empty and masked API keys
  const testSettings = {
    llmProviders: [
      {
        id: 'test-openai',
        name: 'openai',
        apiKey: '', // Empty API key
        baseUrl: 'https://api.openai.com/v1',
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            supportsToolCalling: true,
            maxTokens: 8192,
          },
        ],
        enabled: false,
      },
      {
        id: 'test-deepseek',
        name: 'deepseek',
        apiKey: '••••abcd', // Masked API key
        baseUrl: 'https://api.deepseek.com/v1',
        models: [
          {
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            supportsToolCalling: true,
            maxTokens: 4096,
          },
        ],
        enabled: false,
      },
    ],
    mcpServers: [],
    preferences: {
      theme: 'light',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
    },
  };

  try {
    console.log('📤 Sending test settings to backend...');
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSettings),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Settings API test PASSED');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Settings API test FAILED');
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Settings API test FAILED with exception');
    console.error('Error:', error.message);
  }

  console.log('\n🧪 Testing with valid API key...');

  // Test with a valid API key
  const validSettings = {
    ...testSettings,
    llmProviders: [
      {
        ...testSettings.llmProviders[0],
        apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz', // Valid format
      },
    ],
  };

  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validSettings),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Valid API key test PASSED');
      console.log('📊 API key in response should be masked:', result.llmProviders[0].apiKey);
    } else {
      const errorText = await response.text();
      console.log('❌ Valid API key test FAILED');
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Valid API key test FAILED with exception');
    console.error('Error:', error.message);
  }
}

// Run the test
testSettingsAPI().catch(console.error);