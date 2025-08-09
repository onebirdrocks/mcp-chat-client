// Simple test script to verify API structure
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing MCP Chat UI Backend API Structure...\n');

// Check if all required API routes exist
const apiRoutes = [
  'src/app/api/chat/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/chat-history/route.ts',
  'src/app/api/run-tool/route.ts',
  'src/app/api/cancel-tool/route.ts',
  'src/app/api/health/route.ts'
];

console.log('✅ API Routes:');
apiRoutes.forEach(route => {
  const exists = fs.existsSync(path.join(__dirname, route));
  console.log(`  ${exists ? '✓' : '✗'} ${route}`);
});

// Check if core library files exist
const libFiles = [
  'src/lib/cors.ts',
  'src/lib/errors.ts',
  'src/lib/validation.ts'
];

console.log('\n✅ Library Files:');
libFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

// Check if type definitions exist
const typeFiles = [
  'src/types/index.ts'
];

console.log('\n✅ Type Definitions:');
typeFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

// Check configuration files
const configFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.js'
];

console.log('\n✅ Configuration Files:');
configFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

console.log('\n🎉 Backend structure verification complete!');
console.log('\n📝 Next steps:');
console.log('  1. Run "npm run dev" to start the development server');
console.log('  2. Test API endpoints at http://localhost:3001/api/*');
console.log('  3. Integrate with frontend running on port 5173');