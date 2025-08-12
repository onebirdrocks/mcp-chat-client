import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateModelData, PRESET_MODELS, getPresetModelIds } from '@/lib/validation/model-validation';
import { aiSDKModelManager } from '@/lib/ai-sdk-model-manager';

const ENV_FILE_PATH = join(process.cwd(), '.env.local');

function readEnvFile(): Record<string, string> {
  if (!existsSync(ENV_FILE_PATH)) {
    return {};
  }
  
  const content = readFileSync(ENV_FILE_PATH, 'utf-8');
  const env: Record<string, string> = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=');
      }
    }
  });
  
  return env;
}

function getProviderEnvKey(providerId: string): string {
  return `${providerId.toUpperCase()}_API_KEY`;
}

const MODELS_FILE_PATH = join(process.cwd(), '.custom-models.json');

interface CustomModel {
  id: string;
  name: string;
  description: string;
  providerId: string;
  isCustom: boolean;
  isEnabled: boolean;
  createdAt: string;
  source: 'preset' | 'api' | 'custom';
}

interface ModelGroup {
  providerId: string;
  providerName: string;
  models: CustomModel[];
  presetCount: number;
  apiCount: number;
  customCount: number;
  totalCount: number;
}

function readCustomModels(): CustomModel[] {
  if (!existsSync(MODELS_FILE_PATH)) {
    return [];
  }
  
  try {
    const content = readFileSync(MODELS_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeCustomModels(models: CustomModel[]) {
  writeFileSync(MODELS_FILE_PATH, JSON.stringify(models, null, 2));
}

// Check if model already exists
function isModelExists(providerId: string, modelId: string): boolean {
  const customModels = readCustomModels();
  return customModels.some(m => m.providerId === providerId && m.id === modelId);
}

// Get all models grouped by provider
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider');
    
    const customModels = readCustomModels();
    
    // Get providers with API keys from .env.local
    const env = readEnvFile();
    const providersWithApiKeys = Object.keys(PRESET_MODELS).filter(provider => {
      const envKey = getProviderEnvKey(provider);
      return env[envKey] && env[envKey].trim() !== '';
    });
    
    if (providerId) {
      // Check if provider has API key
      const envKey = getProviderEnvKey(providerId);
      const hasApiKey = env[envKey] && env[envKey].trim() !== '';
      
      if (!hasApiKey) {
        return NextResponse.json(
          { error: 'Provider not configured with API key' },
          { status: 400 }
        );
      }
      
      // Get models for specific provider
      const presetModels = PRESET_MODELS[providerId as keyof typeof PRESET_MODELS] || [];
      const providerCustomModels = customModels.filter(m => m.providerId === providerId);
      
      // Combine and deduplicate models
      const allModels: CustomModel[] = [
        ...presetModels.map(model => ({
          ...model,
          providerId,
          isCustom: false,
          isEnabled: true,
          createdAt: new Date().toISOString(),
          source: 'preset' as const
        })),
        ...providerCustomModels
      ];
      
      // Remove duplicates (custom models take precedence)
      const uniqueModels = allModels.filter((model, index, self) => 
        index === self.findIndex(m => m.id === model.id)
      );
      
      const presetCount = presetModels.length;
      const apiCount = providerCustomModels.filter(m => m.source === 'api').length;
      const customCount = providerCustomModels.filter(m => m.source === 'custom').length;
      
      return NextResponse.json({
        provider: providerId,
        models: uniqueModels,
        count: uniqueModels.length,
        presetCount,
        apiCount,
        customCount
      });
    } else {
      // Get all models grouped by provider (only those with API keys)
      const modelGroups: ModelGroup[] = [];
      
      for (const provider of providersWithApiKeys) {
        const presetModels = PRESET_MODELS[provider as keyof typeof PRESET_MODELS] || [];
        const providerCustomModels = customModels.filter(m => m.providerId === provider);
        
        // Combine and deduplicate models
        const allModels: CustomModel[] = [
          ...presetModels.map(model => ({
            ...model,
            providerId: provider,
            isCustom: false,
            isEnabled: true,
            createdAt: new Date().toISOString(),
            source: 'preset' as const
          })),
          ...providerCustomModels
        ];
        
        // Remove duplicates
        const uniqueModels = allModels.filter((model, index, self) => 
          index === self.findIndex(m => m.id === model.id)
        );
        
        const presetCount = presetModels.length;
        const apiCount = providerCustomModels.filter(m => m.source === 'api').length;
        const customCount = providerCustomModels.filter(m => m.source === 'custom').length;
        
        modelGroups.push({
          providerId: provider,
          providerName: getProviderDisplayName(provider),
          models: uniqueModels,
          presetCount,
          apiCount,
          customCount,
          totalCount: uniqueModels.length
        });
      }
      
      return NextResponse.json({
        groups: modelGroups,
        totalModels: modelGroups.reduce((sum, group) => sum + group.totalCount, 0),
        totalProviders: modelGroups.length,
        configuredProviders: providersWithApiKeys
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get models', message: error.message },
      { status: 500 }
    );
  }
}

// Add custom model
export async function POST(request: NextRequest) {
  try {
    const { providerId, modelId, name, description, source = 'custom' } = await request.json();
    
    // 1. Basic validation
    if (!providerId || !modelId || !name) {
      return NextResponse.json(
        { error: 'Provider ID, Model ID, and Name are required' },
        { status: 400 }
      );
    }
    
    // 2. Data validation
    const validationResult = validateModelData({
      id: modelId,
      name,
      description: description || '',
      providerId
    });
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          validationErrors: validationResult.errors,
          warnings: validationResult.warnings
        },
        { status: 400 }
      );
    }
    
    // 3. Duplicate check
    if (isModelExists(providerId, modelId)) {
      return NextResponse.json(
        { error: 'Model already exists for this provider' },
        { status: 409 }
      );
    }
    
    // 4. Check for conflicts with preset models
    const presetModelIds = getPresetModelIds(providerId);
    if (presetModelIds.includes(modelId)) {
      return NextResponse.json(
        { error: 'Model ID conflicts with a preset model' },
        { status: 409 }
      );
    }
    
    const customModels = readCustomModels();
    
    const newModel: CustomModel = {
      id: modelId,
      name,
      description: description || '',
      providerId,
      isCustom: true,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      source: source as 'preset' | 'api' | 'custom'
    };
    
    customModels.push(newModel);
    writeCustomModels(customModels);
    
    return NextResponse.json({
      success: true,
      model: newModel,
      message: 'Model added successfully',
      warnings: validationResult.warnings
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to add model', message: error.message },
      { status: 500 }
    );
  }
}

// Update model
export async function PUT(request: NextRequest) {
  try {
    const { providerId, modelId, name, description, isEnabled } = await request.json();
    
    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: 'Provider ID and Model ID are required' },
        { status: 400 }
      );
    }
    
    const customModels = readCustomModels();
    const modelIndex = customModels.findIndex(m => 
      m.providerId === providerId && m.id === modelId
    );
    
    if (modelIndex === -1) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    // Validate update data
    if (name || description !== undefined) {
      const validationResult = validateModelData({
        id: modelId,
        name: name || customModels[modelIndex].name,
        description: description !== undefined ? description : customModels[modelIndex].description,
        providerId
      });
      
      if (!validationResult.isValid) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            validationErrors: validationResult.errors,
            warnings: validationResult.warnings
          },
          { status: 400 }
        );
      }
    }
    
    // Update model
    customModels[modelIndex] = {
      ...customModels[modelIndex],
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(isEnabled !== undefined && { isEnabled })
    };
    
    writeCustomModels(customModels);
    
    return NextResponse.json({
      success: true,
      model: customModels[modelIndex],
      message: 'Model updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update model', message: error.message },
      { status: 500 }
    );
  }
}

// Delete custom model
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider');
    const modelId = searchParams.get('model');
    
    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: 'Provider ID and Model ID are required' },
        { status: 400 }
      );
    }
    
    const customModels = readCustomModels();
    const filteredModels = customModels.filter(m => 
      !(m.providerId === providerId && m.id === modelId)
    );
    
    if (filteredModels.length === customModels.length) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    writeCustomModels(filteredModels);
    
    return NextResponse.json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete model', message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get provider display name
function getProviderDisplayName(providerId: string): string {
  const providerNames: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google AI',
    mistral: 'Mistral AI',
    cohere: 'Cohere',
    perplexity: 'Perplexity',
    fireworks: 'Fireworks AI',
    groq: 'Groq',
    deepseek: 'DeepSeek',
    openrouter: 'OpenRouter',
    huggingface: 'Hugging Face',
    ollama: 'Ollama',
    together: 'Together AI',
    zhipu: 'Zhipu AI',
    moonshot: 'Moonshot',
  };
  
  return providerNames[providerId] || providerId;
}
