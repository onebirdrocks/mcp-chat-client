#!/usr/bin/env node

/**
 * Test frontend API calls exactly as they would be made from the browser
 */

async function testFrontendAPI() {
  console.log('🔍 Testing Frontend API Calls\n');
  
  const API_BASE_URL = 'http://localhost:3001/api';
  const FRONTEND_ORIGIN = 'http://localhost:5178';
  
  // Test 1: Load sessions (as done in chatStore.ts)
  console.log('1. Testing loadSessions...');
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ loadSessions passed');
      console.log('   Sessions:', Array.isArray(data) ? data.length : 'Not an array');
    } else {
      console.log('❌ loadSessions failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ loadSessions error:', error.message);
  }

  // Test 2: Send message (as done in chatStore.ts)
  console.log('\n2. Testing sendMessage...');
  try {
    const messageData = {
      messages: [
        {
          id: 'test_msg_' + Date.now(),
          role: 'user',
          content: 'Hello from frontend test',
          timestamp: new Date().toISOString()
        }
      ],
      sessionId: 'test-session-' + Date.now(),
      provider: 'openai',
      model: 'gpt-3.5-turbo'
    };

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify(messageData),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ sendMessage passed');
      console.log('   Reply:', data.reply ? data.reply.substring(0, 50) + '...' : 'No reply');
    } else {
      console.log('❌ sendMessage failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ sendMessage error:', error.message);
  }

  // Test 3: Load settings (as done in settingsStore.ts)
  console.log('\n3. Testing loadSettings...');
  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ loadSettings passed');
      console.log('   LLM Providers:', data.llmProviders ? data.llmProviders.length : 'None');
    } else {
      console.log('❌ loadSettings failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ loadSettings error:', error.message);
  }

  // Test 4: Test connection (as done in LLMProviderConfig.tsx)
  console.log('\n4. Testing testConnection...');
  try {
    const response = await fetch(`${API_BASE_URL}/settings/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify({ providerId: 'default-openai' }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ testConnection passed');
      console.log('   Success:', data.success);
      if (!data.success && data.error) {
        console.log('   Error:', data.error);
      }
    } else {
      console.log('❌ testConnection failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ testConnection error:', error.message);
  }

  console.log('\n🔍 Frontend API test completed!');
}

testFrontendAPI().catch(console.error);