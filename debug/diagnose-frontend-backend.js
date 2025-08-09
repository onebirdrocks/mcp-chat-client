#!/usr/bin/env node

/**
 * Real-time diagnosis of frontend-backend connection issues
 */

async function diagnoseFrontendBackend() {
  console.log('🔍 Frontend-Backend Connection Diagnosis\n');
  
  // Check current running processes
  console.log('1. Checking running processes...');
  try {
    const { execSync } = await import('child_process');
    
    // Check frontend processes
    try {
      const frontendProcesses = execSync('lsof -i :5178', { encoding: 'utf8' });
      console.log('✅ Frontend running on port 5178');
      console.log('   Process details:', frontendProcesses.split('\n')[1]?.split(/\s+/)[1] || 'Unknown PID');
    } catch (error) {
      console.log('❌ No frontend process found on port 5178');
    }
    
    // Check backend processes
    try {
      const backendProcesses = execSync('lsof -i :3001', { encoding: 'utf8' });
      console.log('✅ Backend running on port 3001');
      console.log('   Process details:', backendProcesses.split('\n')[1]?.split(/\s+/)[1] || 'Unknown PID');
    } catch (error) {
      console.log('❌ No backend process found on port 3001');
    }
  } catch (error) {
    console.log('❌ Error checking processes:', error.message);
  }

  // Test backend health
  console.log('\n2. Testing backend health...');
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend health check passed');
      console.log('   Status:', data.status);
      console.log('   Uptime:', Math.round(data.uptime), 'seconds');
    } else {
      console.log('❌ Backend health check failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend health check error:', error.message);
  }

  // Test CORS with frontend origin
  console.log('\n3. Testing CORS with frontend origin...');
  try {
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5178',
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('✅ CORS test passed');
      console.log('   Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    } else {
      console.log('❌ CORS test failed:', response.status);
    }
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
  }

  // Test chat API with exact frontend format
  console.log('\n4. Testing chat API with frontend format...');
  try {
    const testMessage = {
      messages: [
        {
          id: 'frontend_test_' + Date.now(),
          role: 'user',
          content: 'Hello from frontend diagnosis',
          timestamp: new Date().toISOString()
        }
      ],
      sessionId: 'frontend-diagnosis-session',
      provider: 'deepseek',
      model: 'deepseek-chat'
    };

    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5178',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Chat API test passed');
      console.log('   Response length:', data.reply ? data.reply.length : 0, 'characters');
    } else {
      console.log('❌ Chat API test failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Chat API test error:', error.message);
  }

  // Test settings API
  console.log('\n5. Testing settings API...');
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
      console.log('✅ Settings API test passed');
      console.log('   LLM Providers:', data.llmProviders.length);
      console.log('   DeepSeek configured:', data.llmProviders.some(p => p.name === 'deepseek'));
    } else {
      console.log('❌ Settings API test failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Settings API test error:', error.message);
  }

  // Check if backend is accessible from different localhost variations
  console.log('\n6. Testing different localhost variations...');
  const variations = [
    'http://localhost:3001/api/health',
    'http://127.0.0.1:3001/api/health',
    'http://0.0.0.0:3001/api/health'
  ];

  for (const url of variations) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      if (response.ok) {
        console.log(`✅ ${url} - accessible`);
      } else {
        console.log(`❌ ${url} - failed (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${url} - error: ${error.message}`);
    }
  }

  // Network interface check
  console.log('\n7. Network interface diagnosis...');
  try {
    const { execSync } = await import('child_process');
    const netstat = execSync('netstat -an | grep 3001', { encoding: 'utf8' });
    console.log('✅ Port 3001 network status:');
    console.log(netstat.trim());
  } catch (error) {
    console.log('❌ Could not check network interfaces');
  }

  console.log('\n🔍 Diagnosis completed!');
  console.log('\n💡 Recommendations:');
  console.log('1. If backend tests pass but frontend fails, check browser console for detailed errors');
  console.log('2. Try refreshing the frontend page (Ctrl+F5 or Cmd+Shift+R)');
  console.log('3. Check if any browser extensions are blocking requests');
  console.log('4. Verify that both frontend and backend are running on the expected ports');
  console.log('5. If CORS fails, the backend might need to be restarted');
}

diagnoseFrontendBackend().catch(console.error);