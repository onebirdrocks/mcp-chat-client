#!/usr/bin/env node

/**
 * Test script to verify frontend data processing logic
 */

// Simulate the frontend data filtering logic
function filterProvidersForBackend(providers) {
  return providers.map(provider => {
    const apiKey = provider.apiKey;
    // Skip validation for empty, masked, or placeholder API keys
    if (!apiKey || 
        apiKey.includes('•') || 
        apiKey.includes('*') || 
        apiKey.trim() === '' ||
        apiKey === '••••') {
      return {
        ...provider,
        apiKey: '', // Send empty string instead of masked value
      };
    }
    return provider;
  });
}

console.log('🧪 Testing frontend data filtering logic...\n');

// Test cases
const testProviders = [
  {
    id: 'test-1',
    name: 'openai',
    apiKey: '', // Empty
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'test-2',
    name: 'deepseek',
    apiKey: '••••abcd', // Masked with bullets
    baseUrl: 'https://api.deepseek.com/v1',
  },
  {
    id: 'test-3',
    name: 'openrouter',
    apiKey: '****efgh', // Masked with asterisks
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  {
    id: 'test-4',
    name: 'openai',
    apiKey: '••••', // Just bullets
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'test-5',
    name: 'openai',
    apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz', // Valid key
    baseUrl: 'https://api.openai.com/v1',
  },
];

console.log('📥 Input providers:');
testProviders.forEach((provider, index) => {
  console.log(`  ${index + 1}. ${provider.name}: "${provider.apiKey}"`);
});

const filtered = filterProvidersForBackend(testProviders);

console.log('\n📤 Filtered providers (for backend):');
filtered.forEach((provider, index) => {
  console.log(`  ${index + 1}. ${provider.name}: "${provider.apiKey}"`);
});

console.log('\n✅ Frontend filtering test completed');

// Verify the results
const expectedResults = [
  '', // Empty -> empty
  '', // Masked -> empty
  '', // Masked -> empty
  '', // Bullets -> empty
  'sk-1234567890abcdefghijklmnopqrstuvwxyz', // Valid -> unchanged
];

let allCorrect = true;
filtered.forEach((provider, index) => {
  if (provider.apiKey !== expectedResults[index]) {
    console.log(`❌ Test ${index + 1} failed: expected "${expectedResults[index]}", got "${provider.apiKey}"`);
    allCorrect = false;
  }
});

if (allCorrect) {
  console.log('✅ All filtering tests passed!');
} else {
  console.log('❌ Some filtering tests failed!');
}