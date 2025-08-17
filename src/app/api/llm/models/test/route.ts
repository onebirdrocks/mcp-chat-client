import { NextRequest, NextResponse } from 'next/server';
import { aiSDKModelManager } from '@/lib/ai-sdk-model-manager';

export async function POST(request: NextRequest) {
  try {
    const { providerId, modelId, testPrompt } = await request.json();
    
    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: 'Provider ID and Model ID are required' },
        { status: 400 }
      );
    }

    const result = await aiSDKModelManager.testModel(
      providerId, 
      modelId, 
      testPrompt || 'Who are you? Can you introduce yourself?'
    );

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test model',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Batch test multiple models
export async function PUT(request: NextRequest) {
  try {
    const { models, testPrompt } = await request.json();
    
    if (!models || !Array.isArray(models)) {
      return NextResponse.json(
        { error: 'Models array is required' },
        { status: 400 }
      );
    }

    const results = await aiSDKModelManager.batchTestModels(models);
    
    // Convert Map to object for JSON serialization
    const resultsObject: any = {};
    results.forEach((result, key) => {
      resultsObject[key] = result;
    });

    return NextResponse.json({
      success: true,
      results: resultsObject,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to batch test models',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
