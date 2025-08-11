import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { cohere } from '@ai-sdk/cohere';
import { perplexity } from '@ai-sdk/perplexity';
import { fireworks } from '@ai-sdk/fireworks';
import { groq } from '@ai-sdk/groq';
import { deepseek } from '@ai-sdk/deepseek';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    let success = false;
    let message = '';

    try {
      switch (provider) {
        case 'openai':
          // Test OpenAI connection
          const openaiResult = await generateText({
            model: openai('gpt-3.5-turbo'),
            prompt: 'Hello',
          });
          success = true;
          message = 'OpenAI connection successful!';
          break;

        case 'anthropic':
          // Test Anthropic connection
          const anthropicResult = await generateText({
            model: anthropic('claude-3-haiku-20240307'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Anthropic connection successful!';
          break;

        case 'google':
          // Test Google AI connection
          const googleResult = await generateText({
            model: google('gemini-pro'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Google AI connection successful!';
          break;

        case 'mistral':
          // Test Mistral connection
          const mistralResult = await generateText({
            model: mistral('mistral-small-latest'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Mistral connection successful!';
          break;

        case 'cohere':
          // Test Cohere connection
          const cohereResult = await generateText({
            model: cohere('command'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Cohere connection successful!';
          break;

        case 'perplexity':
          // Test Perplexity connection
          const perplexityResult = await generateText({
            model: perplexity('llama-3.1-8b-instruct'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Perplexity connection successful!';
          break;

        case 'fireworks':
          // Test Fireworks connection
          const fireworksResult = await generateText({
            model: fireworks('accounts/fireworks/models/llama-v2-7b-chat'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Fireworks connection successful!';
          break;

        case 'groq':
          // Test Groq connection
          const groqResult = await generateText({
            model: groq('llama3-8b-8192'),
            prompt: 'Hello',
          });
          success = true;
          message = 'Groq connection successful!';
          break;

        case 'deepseek':
          // Test DeepSeek connection
          const deepseekResult = await generateText({
            model: deepseek('deepseek-chat'),
            prompt: 'Hello',
          });
          success = true;
          message = 'DeepSeek connection successful!';
          break;

        case 'openrouter':
          // Test OpenRouter connection
          const openrouterResult = await generateText({
            model: openrouter('openai/gpt-3.5-turbo'),
            prompt: 'Hello',
          });
          success = true;
          message = 'OpenRouter connection successful!';
          break;

        default:
          success = false;
          message = `Provider ${provider} is not supported for testing`;
      }
    } catch (error: any) {
      success = false;
      message = `Connection failed: ${error.message || 'Unknown error'}`;
    }

    return NextResponse.json({
      success,
      message,
      provider,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
