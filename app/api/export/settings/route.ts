import { NextRequest, NextResponse } from 'next/server';
import { getSecureSettingsManager } from '../../../../backend/src/services/SecureSettingsManager';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

interface SettingsExportRequest {
  includeApiKeys?: boolean; // WARNING: Only for secure backup purposes
  format: 'json' | 'yaml';
  sections?: ('llmProviders' | 'mcpServers' | 'preferences')[];
}

interface SettingsExportResponse {
  data: string;
  filename: string;
  contentType: string;
  exportInfo: {
    version: string;
    exportDate: string;
    includesApiKeys: boolean;
    sections: string[];
  };
}

interface SettingsImportRequest {
  data: string;
  format: 'json' | 'yaml';
  overwrite?: boolean;
  sections?: ('llmProviders' | 'mcpServers' | 'preferences')[];
}

/**
 * POST /api/export/settings - Export settings for backup
 */
export async function POST(request: NextRequest) {
  try {
    const body: SettingsExportRequest = await request.json();
    
    // Validate request
    if (!body.format || !['json', 'yaml'].includes(body.format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be "json" or "yaml"' },
        { status: 400 }
      );
    }

    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();

    // Get settings export (excludes sensitive data by default)
    const settingsExport = await settingsManager.exportSettings();
    
    // If API keys are explicitly requested (dangerous!)
    let exportData: Record<string, unknown> = settingsExport;
    if (body.includeApiKeys) {
      console.warn('WARNING: Exporting settings with API keys - ensure secure handling!');
      // This would require additional authentication/authorization
      // For now, we'll still exclude API keys for security
      exportData = {
        ...settingsExport,
        warning: 'API keys excluded for security. Re-enter keys after import.'
      };
    }

    // Filter sections if specified
    if (body.sections && body.sections.length > 0) {
      const filteredSettings: Record<string, unknown> = {
        version: exportData.version,
        exportDate: exportData.exportDate,
        settings: {}
      };

      for (const section of body.sections) {
        if (exportData.settings[section]) {
          filteredSettings.settings[section] = exportData.settings[section];
        }
      }
      
      exportData = filteredSettings;
    }

    // Add MCP configuration if available
    try {
      const mcpConfigPath = join(process.cwd(), 'config', 'mcp.config.json');
      await access(mcpConfigPath);
      const mcpConfigContent = await readFile(mcpConfigPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpConfigContent);
      
      exportData.mcpConfiguration = mcpConfig;
    } catch {
      // MCP config not available
    }

    // Generate export string
    const timestamp = new Date().toISOString().split('T')[0];
    let exportString: string;
    let filename: string;
    let contentType: string;

    if (body.format === 'json') {
      exportString = JSON.stringify(exportData, null, 2);
      filename = `mcp-chat-settings-${timestamp}.json`;
      contentType = 'application/json';
    } else {
      // YAML format
      exportString = convertToYaml(exportData);
      filename = `mcp-chat-settings-${timestamp}.yaml`;
      contentType = 'text/yaml';
    }

    const response: SettingsExportResponse = {
      data: exportString,
      filename,
      contentType,
      exportInfo: {
        version: exportData.version || '1.0.0',
        exportDate: exportData.exportDate || new Date().toISOString(),
        includesApiKeys: body.includeApiKeys || false,
        sections: body.sections || ['llmProviders', 'mcpServers', 'preferences']
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Failed to export settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/export/settings - Import settings from backup
 */
export async function PUT(request: NextRequest) {
  try {
    const body: SettingsImportRequest = await request.json();
    
    // Validate request
    if (!body.data || !body.format) {
      return NextResponse.json(
        { success: false, error: 'Missing data or format' },
        { status: 400 }
      );
    }

    if (!['json', 'yaml'].includes(body.format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be "json" or "yaml"' },
        { status: 400 }
      );
    }

    // Parse import data
    let importData: Record<string, unknown>;
    try {
      if (body.format === 'json') {
        importData = JSON.parse(body.data);
      } else {
        importData = parseYaml(body.data);
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid data format or corrupted data' },
        { status: 400 }
      );
    }

    // Validate import data structure
    if (!importData.version || !importData.settings) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings export format' },
        { status: 400 }
      );
    }

    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();

    // Import settings
    await settingsManager.importSettings(importData);

    // Get statistics about what was imported
    const stats = settingsManager.getStatistics();

    return NextResponse.json({
      success: true,
      message: 'Settings imported successfully',
      data: {
        importedSections: Object.keys(importData.settings),
        statistics: stats,
        warnings: [
          'API keys must be re-entered for security reasons',
          'Please test all provider connections after import'
        ]
      }
    });

  } catch (error) {
    console.error('Failed to import settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import settings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/settings - Get export information and options
 */
export async function GET() {
  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    const stats = settingsManager.getStatistics();
    
    // Check if MCP config exists
    let mcpConfigAvailable = false;
    try {
      const mcpConfigPath = join(process.cwd(), 'config', 'mcp.config.json');
      await access(mcpConfigPath);
      mcpConfigAvailable = true;
    } catch {
      // MCP config not available
    }

    return NextResponse.json({
      success: true,
      data: {
        availableFormats: ['json', 'yaml'],
        availableSections: ['llmProviders', 'mcpServers', 'preferences'],
        statistics: stats,
        mcpConfigAvailable,
        securityNote: 'API keys are never included in exports for security reasons'
      }
    });

  } catch (error) {
    console.error('Failed to get export info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get export information' },
      { status: 500 }
    );
  }
}

// Helper functions

function convertToYaml(data: Record<string, unknown>): string {
  // Simple YAML conversion - in a real implementation, you'd use a proper YAML library
  // This is a basic implementation for demonstration
  function toYaml(obj: unknown, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}- \n${toYaml(item, indent + 1)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
        } else if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      }
    }
    
    return yaml;
  }
  
  return `# MCP Chat UI Settings Export\n# Generated: ${new Date().toISOString()}\n\n${toYaml(data)}`;
}

function parseYaml(yamlString: string): Record<string, unknown> {
  // Simple YAML parser - in a real implementation, you'd use a proper YAML library
  // This is a basic implementation for demonstration
  const lines = yamlString.split('\n').filter(line => !line.trim().startsWith('#') && line.trim());
  const result: Record<string, unknown> = {};
  const stack: Record<string, unknown>[] = [result];
  let currentIndent = 0;
  
  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    const content = line.trim();
    
    if (content.includes(':')) {
      const [key, ...valueParts] = content.split(':');
      const value = valueParts.join(':').trim();
      
      // Adjust stack based on indentation
      while (stack.length > 1 && indent <= currentIndent) {
        stack.pop();
        currentIndent -= 2;
      }
      
      const current = stack[stack.length - 1];
      
      if (value) {
        // Try to parse as JSON if it looks like a number or boolean
        try {
          current[key.trim()] = JSON.parse(value);
        } catch {
          current[key.trim()] = value;
        }
      } else {
        // Object or array follows
        current[key.trim()] = {};
        stack.push(current[key.trim()]);
        currentIndent = indent;
      }
    }
  }
  
  return result;
}