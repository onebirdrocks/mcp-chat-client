import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { validateRunToolRequest } from '@/lib/validation';
import { getToolExecutionService } from '@/services/ToolExecutionService';
import { RunToolResponse } from '@/types';

async function runToolHandler(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { 
        result: '', 
        reply: '', 
        error: 'Method not allowed - Only POST method is allowed' 
      },
      { status: 405 }
    );
  }

  const body = await request.json();
  const toolRequest = validateRunToolRequest(body);

  try {
    console.log(`Processing tool execution request for: ${toolRequest.toolCall.function.name} (session: ${toolRequest.sessionId})`);
    
    // Get the tool execution service
    const toolExecutionService = getToolExecutionService();
    
    // Process the tool execution with full workflow
    const response = await toolExecutionService.processToolExecution(toolRequest);
    
    console.log(`Tool execution completed successfully for: ${toolRequest.toolCall.function.name}`);
    
    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Tool execution failed for ${toolRequest.toolCall.function.name}:`, errorMessage);

    const errorResponse: RunToolResponse = {
      result: '',
      reply: 'I encountered an error while executing the tool. Please try again.',
      error: errorMessage,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export const POST = withSecurity(runToolHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));