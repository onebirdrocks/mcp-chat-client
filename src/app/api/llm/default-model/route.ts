import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_MODEL_FILE_PATH = join(process.cwd(), '.default-model.json');

interface DefaultModelConfig {
  enabled: boolean;
  providerId: string;
  modelId: string;
  modelName: string;
  lastUpdated: string;
}

function readDefaultModelConfig(): DefaultModelConfig {
  if (!existsSync(DEFAULT_MODEL_FILE_PATH)) {
    return {
      enabled: false,
      providerId: '',
      modelId: '',
      modelName: '',
      lastUpdated: ''
    };
  }
  
  try {
    const content = readFileSync(DEFAULT_MODEL_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read default model config:', error);
    return {
      enabled: false,
      providerId: '',
      modelId: '',
      modelName: '',
      lastUpdated: ''
    };
  }
}

function writeDefaultModelConfig(config: DefaultModelConfig) {
  try {
    writeFileSync(DEFAULT_MODEL_FILE_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to write default model config:', error);
    throw error;
  }
}

// GET - Get current default model configuration
export async function GET() {
  try {
    const config = readDefaultModelConfig();
    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get default model configuration',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Set default model
export async function POST(request: NextRequest) {
  try {
    const { enabled, providerId, modelId, modelName } = await request.json();
    
    if (enabled && (!providerId || !modelId || !modelName)) {
      return NextResponse.json(
        { error: 'Provider ID, Model ID, and Model Name are required when enabling default model' },
        { status: 400 }
      );
    }

    const config: DefaultModelConfig = {
      enabled: enabled || false,
      providerId: providerId || '',
      modelId: modelId || '',
      modelName: modelName || '',
      lastUpdated: new Date().toISOString()
    };

    writeDefaultModelConfig(config);

    return NextResponse.json({
      success: true,
      config,
      message: config.enabled 
        ? `Default model set to ${modelName} (${providerId}:${modelId})`
        : 'Default model disabled'
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to set default model',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear default model
export async function DELETE() {
  try {
    const config: DefaultModelConfig = {
      enabled: false,
      providerId: '',
      modelId: '',
      modelName: '',
      lastUpdated: new Date().toISOString()
    };

    writeDefaultModelConfig(config);

    return NextResponse.json({
      success: true,
      config,
      message: 'Default model cleared'
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear default model',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
