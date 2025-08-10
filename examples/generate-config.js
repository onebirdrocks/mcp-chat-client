#!/usr/bin/env node

/**
 * MCP Configuration Generator
 * 
 * This script helps generate MCP server configurations for the MCP Chat UI
 * based on the example configurations provided.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

class MCPConfigGenerator {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.examplesDir = path.join(__dirname, 'mcp-servers');
    this.outputPath = path.join(process.cwd(), 'config', 'mcp.config.json');
    this.selectedServers = new Map();
  }

  async run() {
    try {
      log.title('🚀 MCP Chat UI Configuration Generator');
      console.log('This tool will help you create a configuration file for MCP servers.\n');

      await this.loadExamples();
      await this.selectServers();
      await this.configureServers();
      await this.generateConfig();
      
      log.success('Configuration generation completed!');
    } catch (error) {
      log.error(`Configuration generation failed: ${error.message}`);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async loadExamples() {
    log.info('Loading example configurations...');
    
    this.examples = new Map();
    const files = fs.readdirSync(this.examplesDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.examplesDir, file), 'utf8');
        const config = JSON.parse(content);
        this.examples.set(path.basename(file, '.json'), config);
      } catch (error) {
        log.warning(`Failed to load ${file}: ${error.message}`);
      }
    }
    
    log.success(`Loaded ${this.examples.size} example configurations`);
  }

  async selectServers() {
    log.title('\n📋 Available Server Categories:');
    
    const categories = Array.from(this.examples.entries());
    categories.forEach(([key, config], index) => {
      console.log(`${index + 1}. ${config.name} (${config.category})`);
      console.log(`   ${config.description}`);
      console.log('');
    });

    const answer = await this.question('Select categories (comma-separated numbers, or "all"): ');
    
    if (answer.toLowerCase() === 'all') {
      categories.forEach(([key, config]) => {
        this.selectedServers.set(key, config);
      });
    } else {
      const selections = answer.split(',').map(s => parseInt(s.trim()) - 1);
      selections.forEach(index => {
        if (index >= 0 && index < categories.length) {
          const [key, config] = categories[index];
          this.selectedServers.set(key, config);
        }
      });
    }

    log.success(`Selected ${this.selectedServers.size} server categories`);
  }

  async configureServers() {
    log.title('\n⚙️  Server Configuration:');
    
    for (const [key, config] of this.selectedServers) {
      console.log(`\n${colors.bright}Configuring: ${config.name}${colors.reset}`);
      
      // Show available servers in this category
      const serverNames = Object.keys(config.servers);
      console.log(`Available servers: ${serverNames.join(', ')}`);
      
      const serverSelection = await this.question(`Select servers (comma-separated, or "all"): `);
      
      let selectedServerNames;
      if (serverSelection.toLowerCase() === 'all') {
        selectedServerNames = serverNames;
      } else {
        selectedServerNames = serverSelection.split(',').map(s => s.trim()).filter(s => serverNames.includes(s));
      }

      // Configure each selected server
      config.selectedServers = {};
      for (const serverName of selectedServerNames) {
        const serverConfig = { ...config.servers[serverName] };
        
        console.log(`\n  Configuring ${serverName}:`);
        
        // Handle environment variables
        if (serverConfig.env) {
          console.log('  Environment variables needed:');
          for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
            if (envValue.includes('your-') || envValue.includes('path/to/')) {
              const newValue = await this.question(`    ${envKey} (current: ${envValue}): `);
              if (newValue.trim()) {
                serverConfig.env[envKey] = newValue.trim();
              }
            }
          }
        }
        
        // Handle command arguments that need paths
        if (serverConfig.args) {
          const updatedArgs = [];
          for (const arg of serverConfig.args) {
            if (arg.includes('/path/to/')) {
              const newArg = await this.question(`    Update path "${arg}": `);
              updatedArgs.push(newArg.trim() || arg);
            } else {
              updatedArgs.push(arg);
            }
          }
          serverConfig.args = updatedArgs;
        }
        
        config.selectedServers[serverName] = serverConfig;
      }
    }
  }

  async generateConfig() {
    log.title('\n📝 Generating Configuration...');
    
    const mcpConfig = {
      mcpServers: {}
    };

    // Combine all selected servers
    for (const [categoryKey, config] of this.selectedServers) {
      if (config.selectedServers) {
        Object.assign(mcpConfig.mcpServers, config.selectedServers);
      }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write configuration file
    fs.writeFileSync(this.outputPath, JSON.stringify(mcpConfig, null, 2));
    log.success(`Configuration saved to: ${this.outputPath}`);

    // Generate environment file template
    await this.generateEnvTemplate();
    
    // Show setup instructions
    this.showSetupInstructions();
  }

  async generateEnvTemplate() {
    const envPath = path.join(process.cwd(), '.env.mcp-example');
    const envVars = new Set();

    // Collect all environment variables
    for (const [categoryKey, config] of this.selectedServers) {
      if (config.selectedServers) {
        for (const [serverName, serverConfig] of Object.entries(config.selectedServers)) {
          if (serverConfig.env) {
            for (const envKey of Object.keys(serverConfig.env)) {
              envVars.add(envKey);
            }
          }
        }
      }
    }

    if (envVars.size > 0) {
      const envContent = Array.from(envVars).map(key => `${key}=your-value-here`).join('\n');
      fs.writeFileSync(envPath, `# MCP Server Environment Variables\n# Copy to .env.local and fill in your values\n\n${envContent}\n`);
      log.success(`Environment template saved to: ${envPath}`);
    }
  }

  showSetupInstructions() {
    log.title('\n🎯 Setup Instructions:');
    
    console.log('1. Install required MCP servers:');
    const allDependencies = new Set();
    
    for (const [categoryKey, config] of this.selectedServers) {
      if (config.setup && config.setup.dependencies) {
        config.setup.dependencies.forEach(dep => allDependencies.add(dep));
      }
    }
    
    if (allDependencies.size > 0) {
      console.log(`   npm install -g ${Array.from(allDependencies).join(' ')}`);
    }
    
    console.log('\n2. Configure environment variables:');
    console.log('   - Copy .env.mcp-example to .env.local');
    console.log('   - Fill in your API keys and configuration values');
    
    console.log('\n3. Start the MCP Chat UI:');
    console.log('   npm run dev');
    
    console.log('\n4. In the application:');
    console.log('   - Go to Settings → MCP Servers');
    console.log('   - Verify server connections');
    console.log('   - Enable servers for your chat sessions');

    // Show category-specific instructions
    for (const [categoryKey, config] of this.selectedServers) {
      if (config.setup && config.setup.configuration) {
        console.log(`\n${colors.bright}${config.name} specific setup:${colors.reset}`);
        if (Array.isArray(config.setup.configuration)) {
          config.setup.configuration.forEach(instruction => {
            console.log(`   - ${instruction}`);
          });
        } else {
          for (const [serverName, instructions] of Object.entries(config.setup.configuration)) {
            console.log(`   ${serverName}:`);
            instructions.forEach(instruction => {
              console.log(`     - ${instruction}`);
            });
          }
        }
      }
    }
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Run the generator
if (require.main === module) {
  const generator = new MCPConfigGenerator();
  generator.run().catch(console.error);
}

module.exports = MCPConfigGenerator;