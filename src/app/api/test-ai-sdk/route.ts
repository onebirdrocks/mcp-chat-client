import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing AI SDK imports...');
    
    // Test importing AI SDK modules
    const { openai } = require('@ai-sdk/openai');
    const { anthropic } = require('@ai-sdk/anthropic');
    const { streamText } = require('ai');
    
    console.log('🔧 AI SDK modules imported successfully');
    
    // Test creating a simple model (without API key, just to test the module)
    try {
      const model = openai('gpt-3.5-turbo');
      console.log('🔧 OpenAI model created successfully:', typeof model);
    } catch (error) {
      console.log('🔧 OpenAI model creation failed (expected without API key):', error.message);
    }
    
    // Check environment variables
    const envVars = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set',
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'Set' : 'Not set',
    };
    
    console.log('🔧 Environment variables:', envVars);
    
    return NextResponse.json({
      success: true,
      message: 'AI SDK test completed',
      envVars,
      nodeVersion: process.version,
      platform: process.platform
    });
    
  } catch (error) {
    console.error('🔧 AI SDK test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}