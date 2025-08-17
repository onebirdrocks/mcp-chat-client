import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();
    
    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    let models = [];

    try {
      switch (provider) {
        case 'openai':
          // Use OpenAI API to get model list
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            models = data.data
              .filter((model: any) => model.id.startsWith('gpt-'))
              .map((model: any) => ({
                id: model.id,
                name: model.id,
                description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`,
                created: model.created
              }));
          } else {
            throw new Error(`OpenAI API error: ${response.status}`);
          }
          break;

        case 'anthropic':
          // Anthropic currently doesn't provide a public models API
          throw new Error('Anthropic does not provide a public models API');

        case 'google':
          // Google AI currently doesn't provide a public models API
          throw new Error('Google AI does not provide a public models API');

        case 'mistral':
          // Mistral API for models
          const mistralResponse = await fetch('https://api.mistral.ai/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (mistralResponse.ok) {
            const data = await mistralResponse.json();
            models = data.data
              .filter((model: any) => model.id.startsWith('mistral-'))
              .map((model: any) => ({
                id: model.id,
                name: model.id,
                description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`,
                created: model.created
              }));
          } else {
            throw new Error(`Mistral API error: ${mistralResponse.status}`);
          }
          break;

        case 'cohere':
          // Cohere API for models
          const cohereResponse = await fetch('https://api.cohere.ai/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (cohereResponse.ok) {
            const data = await cohereResponse.json();
            models = data.models
              .filter((model: any) => model.name.startsWith('command'))
              .map((model: any) => ({
                id: model.name,
                name: model.name,
                description: model.description || 'Cohere model',
                created: Date.now()
              }));
          } else {
            throw new Error(`Cohere API error: ${cohereResponse.status}`);
          }
          break;

        case 'groq':
          // Groq API for models
          const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (groqResponse.ok) {
            const data = await groqResponse.json();
            models = data.data
              .filter((model: any) => model.id.includes('llama') || model.id.includes('mixtral') || model.id.includes('gemma'))
              .map((model: any) => ({
                id: model.id,
                name: model.id,
                description: `Groq model: ${model.id}`,
                created: Date.now()
              }));
          } else {
            throw new Error(`Groq API error: ${groqResponse.status}`);
          }
          break;

        case 'deepseek':
          // DeepSeek API for models
          const deepseekResponse = await fetch('https://api.deepseek.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (deepseekResponse.ok) {
            const data = await deepseekResponse.json();
            models = data.data
              .filter((model: any) => model.id.startsWith('deepseek-'))
              .map((model: any) => ({
                id: model.id,
                name: model.id,
                description: `DeepSeek model: ${model.id}`,
                created: Date.now()
              }));
          } else {
            throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
          }
          break;

        default:
          throw new Error(`Provider ${provider} does not support automatic model fetching`);
      }
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
        models: []
      });
    }

    return NextResponse.json({
      success: true,
      provider,
      models,
      count: models.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch models',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
