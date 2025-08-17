import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(request: NextRequest) {
  try {
    const { jsonContent } = await request.json();
    
    if (!jsonContent) {
      return NextResponse.json({
        success: false,
        error: 'JSON content is required'
      }, { status: 400 });
    }

    // Parse and validate JSON
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(jsonContent);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON format'
      }, { status: 400 });
    }

    // Validate the structure
    if (!parsedConfig.mcpServers || typeof parsedConfig.mcpServers !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid configuration structure. Expected "mcpServers" object.'
      }, { status: 400 });
    }

    // Save the configuration
    await serverMCPServerManager.saveConfigFromJson(parsedConfig);
    
    // Note: Configuration is automatically reloaded in saveConfigFromJson

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    console.error('Failed to save configuration:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
