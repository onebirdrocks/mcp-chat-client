import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute } from '@/lib/errors';
import { ValidationError } from '@/lib/errors';
import { getToolExecutionService } from '@/services/ToolExecutionService';

interface CancelToolRequest {
  toolCallId: string;
  sessionId: string;
}

interface CancelToolResponse {
  success: boolean;
  message: string;
  error?: string;
}

function validateCancelToolRequest(data: any): CancelToolRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const { toolCallId, sessionId } = data;

  if (!toolCallId || typeof toolCallId !== 'string') {
    throw new ValidationError('Tool call ID must be a valid string');
  }

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID must be a valid string');
  }

  return { toolCallId, sessionId };
}

async function cancelToolHandler(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { 
        success: false,
        message: '',
        error: 'Method not allowed - Only POST method is allowed' 
      },
      { status: 405 }
    );
  }

  const body = await request.json();
  const cancelRequest = validateCancelToolRequest(body);

  try {
    console.log(`Processing tool cancellation request for: ${cancelRequest.toolCallId} (session: ${cancelRequest.sessionId})`);
    
    const toolExecutionService = getToolExecutionService();
    
    // Cancel the tool execution using the service
    const result = await toolExecutionService.cancelToolExecution(
      cancelRequest.toolCallId,
      cancelRequest.sessionId
    );

    console.log(`Tool cancellation processed successfully for: ${cancelRequest.toolCallId}`);

    const response: CancelToolResponse = {
      success: result.success,
      message: result.message,
      error: result.success ? undefined : result.message,
    };

    return NextResponse.json(response, { status: result.success ? 200 : 500 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Tool cancellation failed for ${cancelRequest.toolCallId}:`, errorMessage);

    const errorResponse: CancelToolResponse = {
      success: false,
      message: '',
      error: `Failed to cancel tool execution: ${errorMessage}`,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export const POST = withCors(handleAsyncRoute(cancelToolHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));