import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), '.mcp-servers.json');
    
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      // Return empty configuration if file doesn't exist
      return NextResponse.json({
        mcpServers: {}
      });
    }
    
    // Read the file content
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // Parse and return the JSON
    const config = JSON.parse(fileContent);
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to read MCP configuration file:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read configuration file'
    }, { status: 500 });
  }
}
