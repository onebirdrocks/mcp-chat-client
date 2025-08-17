const { ServerMCPServerManager } = require('./src/lib/mcp-manager-server.ts');

async function testGetAllEnabledTools() {
  const manager = new ServerMCPServerManager();
  
  console.log('Testing getAllEnabledTools...');
  const tools = manager.getAllEnabledTools();
  console.log('Tools by server:', JSON.stringify(tools, null, 2));
  
  // 检查是否有 ebook-mcp 服务器
  if (tools['ebook-mcp']) {
    console.log('ebook-mcp tools:', Object.keys(tools['ebook-mcp']));
    console.log('get_all_pdf_files exists:', 'get_all_pdf_files' in tools['ebook-mcp']);
  } else {
    console.log('No ebook-mcp server found in tools');
  }
}

testGetAllEnabledTools().catch(console.error);
