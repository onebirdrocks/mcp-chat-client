/**
 * Utility functions for handling API keys
 */

/**
 * Check if an API key is empty, masked, or placeholder
 */
export function isEmptyOrMaskedApiKey(apiKey: string | undefined): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return true;
  }
  
  const trimmed = apiKey.trim();
  
  // Check for empty string
  if (trimmed === '') {
    return true;
  }
  
  // Check for masked keys (contains bullets or asterisks)
  if (trimmed.includes('•') || trimmed.includes('*')) {
    return true;
  }
  
  // Check for placeholder patterns
  const placeholderPatterns = [
    /^sk-\.\.\.\./,  // sk-....
    /^sk-or-\.\.\.\./,  // sk-or-....
    /^\*+$/,  // all asterisks
    /^•+$/,   // all bullets
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Mask an API key for display purposes
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) {
    return '••••';
  }
  
  const visibleChars = 4;
  const maskedPart = '•'.repeat(Math.max(0, apiKey.length - visibleChars));
  const visiblePart = apiKey.slice(-visibleChars);
  
  return maskedPart + visiblePart;
}

/**
 * Validate API key format for different providers
 */
export function validateApiKeyFormat(apiKey: string, provider: string): { valid: boolean; error?: string } {
  if (isEmptyOrMaskedApiKey(apiKey)) {
    return { valid: false, error: 'API key is empty or masked' };
  }
  
  if (apiKey.length < 10) {
    return { valid: false, error: 'API key is too short' };
  }
  
  if (apiKey.length > 200) {
    return { valid: false, error: 'API key is too long' };
  }
  
  // Provider-specific validation
  switch (provider) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI API key must start with "sk-"' };
      }
      break;
    case 'deepseek':
      if (!apiKey.startsWith('sk-')) {
        return { valid: false, error: 'DeepSeek API key must start with "sk-"' };
      }
      break;
    case 'openrouter':
      if (!apiKey.startsWith('sk-or-')) {
        return { valid: false, error: 'OpenRouter API key must start with "sk-or-"' };
      }
      break;
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\s/,  // No whitespace allowed
    /[<>]/,  // No angle brackets
    /javascript:/i,  // No javascript protocol
    /data:/i,  // No data URLs
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(apiKey)) {
      return { valid: false, error: 'API key contains invalid characters' };
    }
  }
  
  return { valid: true };
}

/**
 * Clean API key for storage (remove whitespace, etc.)
 */
export function cleanApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    return '';
  }
  
  return apiKey.trim();
}

/**
 * Format API key for display (alias for maskApiKey for backward compatibility)
 */
export function formatApiKeyForDisplay(apiKey: string): string {
  return maskApiKey(apiKey);
}

/**
 * Get API key status information
 */
export function getApiKeyStatus(apiKey: string | undefined): { 
  configured: boolean; 
  masked: boolean; 
  valid: boolean; 
  error?: string; 
} {
  if (!apiKey || typeof apiKey !== 'string') {
    return { configured: false, masked: false, valid: false };
  }
  
  const trimmed = apiKey.trim();
  
  if (trimmed === '') {
    return { configured: false, masked: false, valid: false };
  }
  
  const isMasked = isEmptyOrMaskedApiKey(apiKey);
  
  if (isMasked) {
    return { configured: true, masked: true, valid: true };
  }
  
  // For non-masked keys, we can't determine the provider here, so we'll do basic validation
  if (trimmed.length < 10) {
    return { configured: true, masked: false, valid: false, error: 'API key is too short' };
  }
  
  if (trimmed.length > 200) {
    return { configured: true, masked: false, valid: false, error: 'API key is too long' };
  }
  
  return { configured: true, masked: false, valid: true };
}

/**
 * Truncate URL for display purposes
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  if (url.length <= maxLength) {
    return url;
  }
  
  // Try to keep the protocol and domain visible
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const search = urlObj.search;
    
    const baseUrl = `${protocol}//${hostname}`;
    
    if (baseUrl.length >= maxLength - 3) {
      // If even the base URL is too long, truncate it
      return baseUrl.substring(0, maxLength - 3) + '...';
    }
    
    const remainingLength = maxLength - baseUrl.length - 3; // 3 for "..."
    const pathAndSearch = pathname + search;
    
    if (pathAndSearch.length <= remainingLength) {
      return url;
    }
    
    return baseUrl + pathAndSearch.substring(0, remainingLength) + '...';
  } catch {
    // If URL parsing fails, just truncate the string
    return url.substring(0, maxLength - 3) + '...';
  }
}