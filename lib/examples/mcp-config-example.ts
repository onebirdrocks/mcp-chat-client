#!/usr/bin/env tsx

/**
 * Example usage of the MCP Configuration System
 * 
 * This script demonstrates how to:
 * - Initialize the MCP configuration system
 * - Load and validate configuration
 * - Access server configurations
 * - Watch for configuration changes
 */

import { 
  initializeMCPConfig, 
  getAllMCPServers, 
  getEnabledMCPServers, 
  getMCPServerConfig,
  isMCPServerEnabled,
  onMCPConfigChange,
  getMCPServerCommand,
  reloadMCPConfig
} from '../mcp-utils';

async function demonstrateMCPConfig() {
  console.log('🚀 MCP Configuration System Demo\n');

  try {
    // Initialize the configuration system
    console.log('1. Initializing MCP configuration...');
    await initializeMCPConfig();
    console.log('✅ Configuration initialized successfully\n');

    // Show all servers
    console.log('2. All configured MCP servers:');
    const allServers = await getAllMCPServers();
    for (const [serverId, serverConfig] of Object.entries(allServers)) {
      console.log(`   📦 ${serverId}:`);
      console.log(`      Command: ${serverConfig.command}`);
      console.log(`      Args: ${JSON.stringify(serverConfig.args)}`);
      console.log(`      Disabled: ${serverConfig.disabled}`);
      console.log(`      Timeout: ${serverConfig.timeout}ms`);
      console.log('');
    }

    // Show only enabled servers
    console.log('3. Enabled MCP servers:');
    const enabledServers = await getEnabledMCPServers();
    for (const serverId of Object.keys(enabledServers)) {
      console.log(`   ✅ ${serverId}`);
    }
    console.log('');

    // Check specific server
    console.log('4. Checking specific servers:');
    const serverIds = Object.keys(allServers);
    for (const serverId of serverIds.slice(0, 2)) { // Check first 2 servers
      const isEnabled = await isMCPServerEnabled(serverId);
      const serverConfig = await getMCPServerConfig(serverId);
      const command = await getMCPServerCommand(serverId);
      
      console.log(`   Server: ${serverId}`);
      console.log(`   Enabled: ${isEnabled}`);
      console.log(`   Config: ${serverConfig ? 'Found' : 'Not found'}`);
      console.log(`   Command: ${command ? `${command.command} ${command.args.join(' ')}` : 'N/A'}`);
      console.log('');
    }

    // Set up configuration change watcher
    console.log('5. Setting up configuration change watcher...');
    const changeHandler = () => {
      console.log('🔄 Configuration changed! Reloading...');
    };
    
    onMCPConfigChange(changeHandler);
    console.log('✅ Watcher set up. Try modifying config/mcp.config.json to see changes.\n');

    // Demonstrate manual reload
    console.log('6. Manual configuration reload:');
    const reloadedConfig = await reloadMCPConfig();
    console.log(`✅ Configuration reloaded. Found ${Object.keys(reloadedConfig.mcpServers).length} servers.\n`);

    console.log('🎉 Demo completed successfully!');
    console.log('\nTo test configuration changes:');
    console.log('1. Edit config/mcp.config.json');
    console.log('2. Add, remove, or modify server configurations');
    console.log('3. Watch the console for change notifications');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  demonstrateMCPConfig().catch(console.error);
}

export { demonstrateMCPConfig };