import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ModelData {
  id: string;
  name: string;
  description: string;
  providerId: string;
  capabilities?: {
    isInferenceModel?: boolean;      // 是否为推理模型
    supportsMultimodal?: boolean;    // 是否支持多模态
    supportsTools?: boolean;         // 是否支持工具调用
    supportsFunctionCalling?: boolean; // 是否支持函数调用
    maxTokens?: number;              // 最大token数
    contextLength?: number;          // 上下文长度
    visionCapabilities?: string[];   // 视觉能力（如：image, video, audio）
    toolTypes?: string[];            // 支持的工具类型
  };
}

// Read preset models from configuration file
const OOBT_MODELS_FILE_PATH = join(process.cwd(), 'oobt-models.json');

function readPresetModels(): Record<string, Array<{ id: string; name: string; description: string; capabilities?: ModelData['capabilities'] }>> {
  if (!existsSync(OOBT_MODELS_FILE_PATH)) {
    console.warn('oobt-models.json not found, using empty preset models');
    return {};
  }
  
  try {
    const content = readFileSync(OOBT_MODELS_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read oobt-models.json:', error);
    return {};
  }
}

// Preset model lists for each provider (loaded from file)
export const PRESET_MODELS = readPresetModels();

// Model ID format validation patterns
const MODEL_ID_PATTERNS = {
  openai: /^gpt-[a-zA-Z0-9-]+$/,
  anthropic: /^claude-[a-zA-Z0-9-]+$/,
  google: /^gemini-[a-zA-Z0-9-]+$/,
  mistral: /^mistral-[a-zA-Z0-9-]+$/,
  cohere: /^command[a-zA-Z0-9-]*$/,
  perplexity: /^[a-zA-Z0-9-]+$/,
  fireworks: /^accounts\/fireworks\/models\/[a-zA-Z0-9-]+$/,
  groq: /^[a-zA-Z0-9-]+$/,
  deepseek: /^deepseek-[a-zA-Z0-9-]+$/,
  openrouter: /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/,
  huggingface: /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/,
  ollama: /^[a-zA-Z0-9-]+$/,
  together: /^[a-zA-Z0-9-]+$/,
  zhipu: /^[a-zA-Z0-9-]+$/,
  moonshot: /^[a-zA-Z0-9-]+$/,
};

// Reserved model IDs (cannot be used by users)
const RESERVED_MODEL_IDS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-32k',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-pro',
  'gemini-pro-vision',
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
  'command',
  'command-light',
  'command-nightly',
];

// Validate model data
export function validateModelData(data: ModelData): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Basic field validation
  if (!data.id || data.id.trim() === '') {
    errors.push('Model ID is required');
  }

  if (!data.name || data.name.trim() === '') {
    errors.push('Model name is required');
  }

  if (!data.providerId || data.providerId.trim() === '') {
    errors.push('Provider ID is required');
  }

  // 2. Field length validation
  if (data.id && data.id.length > 100) {
    errors.push('Model ID must be less than 100 characters');
  }

  if (data.name && data.name.length > 200) {
    errors.push('Model name must be less than 200 characters');
  }

  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // 3. Model ID format validation
  if (data.id && data.providerId) {
    const pattern = MODEL_ID_PATTERNS[data.providerId as keyof typeof MODEL_ID_PATTERNS];
    if (pattern && !pattern.test(data.id)) {
      errors.push(`Model ID format is invalid for ${data.providerId}. Expected format: ${getExpectedFormat(data.providerId)}`);
    }
  }

  // 4. Reserved ID check
  if (data.id && RESERVED_MODEL_IDS.includes(data.id.toLowerCase())) {
    errors.push('This model ID is reserved and cannot be used');
  }

  // 5. Special character check
  if (data.id && /[<>:"\\|?*]/.test(data.id)) {
    errors.push('Model ID contains invalid characters');
  }

  if (data.name && /[<>:"\\|?*]/.test(data.name)) {
    errors.push('Model name contains invalid characters');
  }

  // 6. Warning checks
  if (data.id && data.id.length < 3) {
    warnings.push('Model ID is very short, consider using a more descriptive ID');
  }

  if (data.name && data.name.length < 2) {
    warnings.push('Model name is very short, consider using a more descriptive name');
  }

  if (data.description && data.description.length < 10) {
    warnings.push('Description is very short, consider providing more details');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Real-time validation function (for input validation)
export function validateModelIdInRealTime(id: string, providerId: string): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!id) {
    return { isValid: false, errors: ['Model ID is required'], warnings: [] };
  }

  // Length check
  if (id.length > 100) {
    errors.push('Model ID must be less than 100 characters');
  }

  // Special character check
  if (/[<>:"\\|?*]/.test(id)) {
    errors.push('Model ID contains invalid characters');
  }

  // Format check
  const pattern = MODEL_ID_PATTERNS[providerId as keyof typeof MODEL_ID_PATTERNS];
  if (pattern && !pattern.test(id)) {
    errors.push(`Invalid format for ${providerId}`);
  }

  // Reserved ID check
  if (RESERVED_MODEL_IDS.includes(id.toLowerCase())) {
    errors.push('This model ID is reserved');
  }

  // Warning
  if (id.length < 3) {
    warnings.push('Consider using a more descriptive ID');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate model name
export function validateModelName(name: string): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!name) {
    return { isValid: false, errors: ['Model name is required'], warnings: [] };
  }

  if (name.length > 200) {
    errors.push('Model name must be less than 200 characters');
  }

  if (/[<>:"\\|?*]/.test(name)) {
    errors.push('Model name contains invalid characters');
  }

  if (name.length < 2) {
    warnings.push('Consider using a more descriptive name');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Get expected format for a provider
function getExpectedFormat(providerId: string): string {
  const formats = {
    openai: 'gpt-[model-name] (e.g., gpt-4-custom)',
    anthropic: 'claude-[model-name] (e.g., claude-3-custom)',
    google: 'gemini-[model-name] (e.g., gemini-pro-custom)',
    mistral: 'mistral-[model-name] (e.g., mistral-large-custom)',
    cohere: 'command[custom-suffix] (e.g., command-custom)',
    perplexity: '[model-name] (e.g., llama-3-custom)',
    fireworks: 'accounts/fireworks/models/[model-name]',
    groq: '[model-name] (e.g., llama3-custom)',
    deepseek: 'deepseek-[model-name] (e.g., deepseek-chat-custom)',
    openrouter: '[provider]/[model] (e.g., openai/gpt-4-custom)',
    huggingface: '[organization]/[model] (e.g., meta/llama-custom)',
    ollama: '[model-name] (e.g., llama2-custom)',
    together: '[model-name] (e.g., llama2-custom)',
    zhipu: '[model-name] (e.g., glm-custom)',
    moonshot: '[model-name] (e.g., moonshot-custom)',
  };
  
  return formats[providerId as keyof typeof formats] || '[model-name]';
}

// Get all preset models for a provider
export function getPresetModels(providerId: string) {
  return PRESET_MODELS[providerId as keyof typeof PRESET_MODELS] || [];
}

// Get all preset model IDs for a provider
export function getPresetModelIds(providerId: string): string[] {
  const models = getPresetModels(providerId);
  return models.map(model => model.id);
}

// Check if a model ID is reserved
export function isReservedModelId(modelId: string): boolean {
  return RESERVED_MODEL_IDS.includes(modelId.toLowerCase());
}

// Check if a model ID matches the expected format for a provider
export function isValidModelFormat(modelId: string, providerId: string): boolean {
  const pattern = MODEL_ID_PATTERNS[providerId as keyof typeof MODEL_ID_PATTERNS];
  return pattern ? pattern.test(modelId) : true;
}
