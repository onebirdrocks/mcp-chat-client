#!/usr/bin/env node

/**
 * Test network connection between frontend and backend
 */

async function testConnection() {
  console.log('🔍 Testing Network Connection\n');
  
  // Test 1: Basic backend health check
  console.log('1. Testing backend health...');
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend health check passed:', data.status);
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to backend:', error.message);
    return;
  }

  // Test 2: CORS preflight request
  console.log('\n2. Testing CORS preflight...');
  try {
    const response = await fetch('http://localhost:3001/api/settings', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5178',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    if (response.ok) {
      console.log('✅ CORS preflight passed');
      console.log('   Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    } else {
      console.log('❌ CORS preflight failed:', response.status);
    }
  } catch (error) {
    console.log('❌ CORS preflight error:', error.message);
  }

  // Test 3: Settings API with CORS
  console.log('\n3. Testing settings API with CORS...');
  try {
    const response = await fetch('http://localhost:3001/api/settings', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5178',
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Settings API with CORS passed');
      console.log('   LLM Providers:', data.llmProviders.length);
    } else {
      console.log('❌ Settings API failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Settings API error:', error.message);
  }

  // Test 4: Chat API with proper format
  console.log('\n4. Testing chat API...');
  try {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5178',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            id: 'test_msg_001',
            role: 'user',
            content: 'Hello, this is a test message'
          }
        ],
        sessionId: 'test-session-001',
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Chat API test passed');
      console.log('   Response:', data.reply ? data.reply.substring(0, 50) + '...' : 'No reply');
    } else {
      console.log('❌ Chat API failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Chat API error:', error.message);
  }

  // Test 5: Check if backend is accessible from different origins
  console.log('\n5. Testing different origins...');
  const origins = ['http://localhost:5173', 'http://localhost:5178', 'http://localhost:3000'];
  
  for (const origin of origins) {
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET',
        headers: {
          'Origin': origin,
        },
      });
      
      if (response.ok) {
        console.log(`✅ Origin ${origin}: OK`);
      } else {
        console.log(`❌ Origin ${origin}: Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Origin ${origin}: Error - ${error.message}`);
    }
  }

  console.log('\n🔍 Network test completed!');
}

testConnection().catch(console.error);