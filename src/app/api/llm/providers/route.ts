import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_FILE_PATH = join(process.cwd(), '.env.local');
const DISABLED_PROVIDERS_FILE_PATH = join(process.cwd(), '.disabled-providers.json');

interface LLMProvider {
  id: string;
  name: string;
  displayName: string;
  description: string;
  apiKey: string;
  isEnabled: boolean;
  isTested: boolean;
  lastTested?: Date;
}

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

function writeEnvFile(env: Record<string, string>) {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  writeFileSync(ENV_FILE_PATH, content + '\n');
}

function readDisabledProviders(): string[] {
  if (!existsSync(DISABLED_PROVIDERS_FILE_PATH)) {
    return [];
  }
  
  try {
    const content = readFileSync(DISABLED_PROVIDERS_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeDisabledProviders(disabledProviders: string[]) {
  writeFileSync(DISABLED_PROVIDERS_FILE_PATH, JSON.stringify(disabledProviders, null, 2));
}

function getProviderEnvKey(providerId: string): string {
  return `${providerId.toUpperCase()}_API_KEY`;
}

export async function GET() {
  try {
    const env = readEnvFile();
    const disabledProviders = readDisabledProviders();
    const providers: LLMProvider[] = [];
    
    const supportedProviders = [
      { id: 'openai', name: 'OpenAI', displayName: 'OpenAI', description: 'GPT-4, GPT-3.5 Turbo, and other OpenAI models' },
      { id: 'anthropic', name: 'Anthropic', displayName: 'Claude', description: 'Claude 3, Claude 2, and other Anthropic models' },
      { id: 'google', name: 'Google', displayName: 'Google AI', description: 'Gemini Pro, Gemini Flash, and other Google models' },
      { id: 'mistral', name: 'Mistral AI', displayName: 'Mistral', description: 'Mistral 7B, Mixtral 8x7B, and other Mistral models' },
      { id: 'cohere', name: 'Cohere', displayName: 'Cohere', description: 'Command, Command Light, and other Cohere models' },
      { id: 'perplexity', name: 'Perplexity', displayName: 'Perplexity', description: 'Perplexity models for search and chat' },
      { id: 'fireworks', name: 'Fireworks AI', displayName: 'Fireworks', description: 'Fast and efficient AI models' },
      { id: 'groq', name: 'Groq', displayName: 'Groq', description: 'Ultra-fast LLM inference' },
      { id: 'deepseek', name: 'DeepSeek', displayName: 'DeepSeek', description: 'DeepSeek AI models' },
      { id: 'openrouter', name: 'OpenRouter', displayName: 'OpenRouter', description: 'Access to 300+ models from various providers' }
    ];
    
    supportedProviders.forEach(provider => {
      const envKey = getProviderEnvKey(provider.id);
      const apiKey = env[envKey];
      
      if (apiKey) {
        providers.push({
          id: provider.id,
          name: provider.name,
          displayName: provider.displayName,
          description: provider.description,
          apiKey: apiKey,
          isEnabled: !disabledProviders.includes(provider.id),
          isTested: false
        });
      }
    });
    
    return NextResponse.json({ providers });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to read providers', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { providerId, apiKey, isEnabled = true } = await request.json();
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }
    
    const env = readEnvFile();
    const envKey = getProviderEnvKey(providerId);
    const disabledProviders = readDisabledProviders();
    
    // 如果是添加或更新 Provider
    if (apiKey) {
      env[envKey] = apiKey;
      writeEnvFile(env);
      
      // 如果启用，从禁用列表中移除
      if (isEnabled) {
        const updatedDisabledProviders = disabledProviders.filter(id => id !== providerId);
        writeDisabledProviders(updatedDisabledProviders);
      } else {
        // 如果禁用，添加到禁用列表
        if (!disabledProviders.includes(providerId)) {
          disabledProviders.push(providerId);
          writeDisabledProviders(disabledProviders);
        }
      }
    } else {
      // 如果只是切换启用/禁用状态
      if (isEnabled) {
        // 启用：从禁用列表中移除
        const updatedDisabledProviders = disabledProviders.filter(id => id !== providerId);
        writeDisabledProviders(updatedDisabledProviders);
      } else {
        // 禁用：添加到禁用列表
        if (!disabledProviders.includes(providerId)) {
          disabledProviders.push(providerId);
          writeDisabledProviders(disabledProviders);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Provider ${providerId} ${isEnabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save provider', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }
    
    const env = readEnvFile();
    const envKey = getProviderEnvKey(providerId);
    const disabledProviders = readDisabledProviders();
    
    // 删除 API key
    if (env[envKey]) {
      delete env[envKey];
      writeEnvFile(env);
    }
    
    // 从禁用列表中移除
    const updatedDisabledProviders = disabledProviders.filter(id => id !== providerId);
    writeDisabledProviders(updatedDisabledProviders);
    
    return NextResponse.json({ 
      success: true, 
      message: `Provider ${providerId} removed successfully` 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to remove provider', message: error.message },
      { status: 500 }
    );
  }
}
