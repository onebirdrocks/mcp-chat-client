import { EventEmitter } from 'events';
import type {
  ToolCall,
  ToolExecutionStatus,
  ToolExecutionProgress,
  ToolExecutionHistoryEntry,
  ToolExecutionUpdate,
  ToolExecutionTimeoutConfig,
  MCPServerConfig,
} from '../types';

export interface ToolExecutionManagerConfig {
  timeouts: ToolExecutionTimeoutConfig;
  maxConcurrentExecutions: number;
  enableProgressTracking: boolean;
  enableHistoryLogging: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export interface ToolExecutionContext {
  toolCall: ToolCall;
  sessionId: string;
  startTime: Date;
  timeout: number;
  abortController: AbortController;
  progressCallback?: (progress: ToolExecutionProgress) => void;
  statusCallback?: (status: ToolExecutionStatus) => void;
}

export class ToolExecutionManager extends EventEmitter {
  private activeExecutions = new Map<string, ToolExecutionContext>();
  private executionHistory: ToolExecutionHistoryEntry[] = [];
  private config: ToolExecutionManagerConfig;

  constructor(config: Partial<ToolExecutionManagerConfig> = {}) {
    super();
    
    this.config = {
      timeouts: {
        default: 30000, // 30 seconds
        perTool: {
          'file-system.read_file': 10000,
          'file-system.write_file': 15000,
          'web-search.search': 20000,
          'code-execution.run': 60000,
        },
        maxTimeout: 300000, // 5 minutes
        warningThreshold: 10000, // 10 seconds
      },
      maxConcurrentExecutions: 5,
      enableProgressTracking: true,
      enableHistoryLogging: true,
      retryAttempts: 2,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Start tool execution with real-time feedback
   */
  async executeToolWithFeedback(
    toolCall: ToolCall,
    sessionId: string,
    serverConfig: MCPServerConfig,
    progressCallback?: (progress: ToolExecutionProgress) => void,
    statusCallback?: (status: ToolExecutionStatus) => void
  ): Promise<{
    result: string;
    executionTime: number;
    historyEntry: ToolExecutionHistoryEntry;
    error?: string;
  }> {
    const executionId = `${toolCall.id}-${Date.now()}`;
    const startTime = new Date();
    
    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error(`Maximum concurrent executions (${this.config.maxConcurrentExecutions}) reached`);
    }

    // Determine timeout for this tool
    const toolTimeout = this.getToolTimeout(toolCall.function.name);
    const abortController = new AbortController();

    // Create execution context
    const context: ToolExecutionContext = {
      toolCall,
      sessionId,
      startTime,
      timeout: toolTimeout,
      abortController,
      progressCallback,
      statusCallback,
    };

    this.activeExecutions.set(executionId, context);

    // Create history entry
    const historyEntry: ToolExecutionHistoryEntry = {
      id: executionId,
      toolCallId: toolCall.id,
      sessionId,
      toolName: toolCall.function.name,
      serverId: toolCall.serverId,
      status: 'success', // Will be updated
      startTime,
      parameters: this.parseToolArguments(toolCall.function.arguments),
      progress: [],
      metadata: {
        retryCount: 0,
        timeoutDuration: toolTimeout,
      },
    };

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`Tool execution timeout after ${toolTimeout}ms`));
        }, toolTimeout);
      });

      // Set up warning timeout
      if (toolTimeout > this.config.timeouts.warningThreshold) {
        setTimeout(() => {
          if (this.activeExecutions.has(executionId)) {
            this.updateStatus(executionId, {
              stage: 'executing',
              message: `Tool is taking longer than expected (${this.config.timeouts.warningThreshold}ms)`,
              timestamp: new Date(),
            });
          }
        }, this.config.timeouts.warningThreshold);
      }

      // Start execution with progress tracking
      const executionPromise = this.executeToolWithProgress(
        executionId,
        toolCall,
        serverConfig,
        historyEntry
      );

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Update history entry on success
      historyEntry.status = 'success';
      historyEntry.endTime = new Date();
      historyEntry.executionTime = historyEntry.endTime.getTime() - startTime.getTime();
      historyEntry.result = result.result;

      this.finalizeExecution(executionId, historyEntry);

      return {
        result: result.result,
        executionTime: historyEntry.executionTime,
        historyEntry,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout');
      
      // Update history entry on error
      historyEntry.status = isTimeout ? 'timeout' : 'error';
      historyEntry.endTime = new Date();
      historyEntry.executionTime = historyEntry.endTime.getTime() - startTime.getTime();
      historyEntry.error = errorMessage;

      this.finalizeExecution(executionId, historyEntry);

      // Emit error event
      this.emit('executionError', {
        type: isTimeout ? 'timeout' : 'error',
        toolCallId: toolCall.id,
        sessionId,
        error: errorMessage,
        timestamp: new Date(),
      } as ToolExecutionUpdate);

      return {
        result: '',
        executionTime: historyEntry.executionTime || 0,
        historyEntry,
        error: errorMessage,
      };
    }
  }

  /**
   * Cancel tool execution
   */
  cancelExecution(toolCallId: string): boolean {
    const context = Array.from(this.activeExecutions.values())
      .find(ctx => ctx.toolCall.id === toolCallId);

    if (!context) {
      return false;
    }

    context.abortController.abort();
    
    // Update status
    this.updateStatus(toolCallId, {
      stage: 'cancelled',
      message: 'Tool execution cancelled by user',
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ToolExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory(sessionId?: string, limit?: number): ToolExecutionHistoryEntry[] {
    let history = this.executionHistory;
    
    if (sessionId) {
      history = history.filter(entry => entry.sessionId === sessionId);
    }
    
    // Sort by start time descending
    history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    if (limit) {
      history = history.slice(0, limit);
    }
    
    return history;
  }

  /**
   * Clear execution history
   */
  clearHistory(sessionId?: string): void {
    if (sessionId) {
      this.executionHistory = this.executionHistory.filter(
        entry => entry.sessionId !== sessionId
      );
    } else {
      this.executionHistory = [];
    }
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(sessionId?: string): {
    total: number;
    successful: number;
    failed: number;
    timeout: number;
    cancelled: number;
    averageExecutionTime: number;
    toolBreakdown: Record<string, number>;
  } {
    let history = this.executionHistory;
    
    if (sessionId) {
      history = history.filter(entry => entry.sessionId === sessionId);
    }

    const stats = {
      total: history.length,
      successful: 0,
      failed: 0,
      timeout: 0,
      cancelled: 0,
      averageExecutionTime: 0,
      toolBreakdown: {} as Record<string, number>,
    };

    let totalExecutionTime = 0;
    let executionCount = 0;

    history.forEach(entry => {
      // Count by status
      switch (entry.status) {
        case 'success':
          stats.successful++;
          break;
        case 'error':
          stats.failed++;
          break;
        case 'timeout':
          stats.timeout++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }

      // Tool breakdown
      stats.toolBreakdown[entry.toolName] = (stats.toolBreakdown[entry.toolName] || 0) + 1;

      // Average execution time (only for completed executions)
      if (entry.executionTime && entry.status !== 'cancelled') {
        totalExecutionTime += entry.executionTime;
        executionCount++;
      }
    });

    if (executionCount > 0) {
      stats.averageExecutionTime = Math.round(totalExecutionTime / executionCount);
    }

    return stats;
  }

  private async executeToolWithProgress(
    executionId: string,
    toolCall: ToolCall,
    serverConfig: MCPServerConfig,
    historyEntry: ToolExecutionHistoryEntry
  ): Promise<{ result: string }> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error('Execution context not found');
    }

    // Stage 1: Validation
    this.updateProgress(executionId, {
      stage: 'validating',
      message: 'Validating tool parameters...',
      progress: 10,
      timestamp: new Date(),
    });

    await this.sleep(100); // Simulate validation time
    
    // Parse and validate arguments
    const args = this.parseToolArguments(toolCall.function.arguments);
    this.validateToolArguments(toolCall.function.name, args);

    // Stage 2: Connecting
    this.updateProgress(executionId, {
      stage: 'connecting',
      message: `Connecting to MCP server: ${serverConfig.name}`,
      progress: 30,
      timestamp: new Date(),
    });

    await this.sleep(200); // Simulate connection time

    // Stage 3: Executing
    this.updateProgress(executionId, {
      stage: 'executing',
      message: `Executing tool: ${toolCall.function.name}`,
      progress: 50,
      timestamp: new Date(),
    });

    // Mock tool execution - in real implementation, this would call the MCP server
    const result = await this.mockToolExecution(toolCall, context.abortController.signal);

    // Stage 4: Processing
    this.updateProgress(executionId, {
      stage: 'processing',
      message: 'Processing tool results...',
      progress: 90,
      timestamp: new Date(),
    });

    await this.sleep(100); // Simulate processing time

    // Stage 5: Completed
    this.updateProgress(executionId, {
      stage: 'completed',
      message: 'Tool execution completed successfully',
      progress: 100,
      timestamp: new Date(),
    });

    return { result };
  }

  private async mockToolExecution(toolCall: ToolCall, signal: AbortSignal): Promise<string> {
    // Simulate different execution times based on tool type
    const executionTime = this.getSimulatedExecutionTime(toolCall.function.name);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (toolCall.function.name.includes('error')) {
          reject(new Error('Mock tool execution error'));
        } else {
          resolve(JSON.stringify({
            message: `Tool ${toolCall.function.name} executed successfully`,
            arguments: JSON.parse(toolCall.function.arguments),
            timestamp: new Date().toISOString(),
            executionTime,
          }));
        }
      }, executionTime);

      // Handle cancellation
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Tool execution was cancelled'));
      });
    });
  }

  private getSimulatedExecutionTime(toolName: string): number {
    // Simulate different execution times for different tools
    if (toolName.includes('file')) return 500;
    if (toolName.includes('search')) return 2000;
    if (toolName.includes('code')) return 3000;
    return 1000;
  }

  private getToolTimeout(toolName: string): number {
    return this.config.timeouts.perTool[toolName] || this.config.timeouts.default;
  }

  private parseToolArguments(argumentsJson: string): Record<string, any> {
    try {
      return JSON.parse(argumentsJson);
    } catch (error) {
      throw new Error(`Invalid tool arguments JSON: ${error}`);
    }
  }

  private validateToolArguments(toolName: string, args: Record<string, any>): void {
    // Basic validation - in real implementation, this would use the tool's schema
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be a valid object');
    }

    // Tool-specific validation
    if (toolName.includes('file') && !args.path) {
      throw new Error('File operations require a "path" parameter');
    }

    if (toolName.includes('search') && !args.query) {
      throw new Error('Search operations require a "query" parameter');
    }
  }

  private updateProgress(executionId: string, progress: ToolExecutionProgress): void {
    const context = this.activeExecutions.get(executionId);
    if (!context) return;

    // Add to history entry
    const historyEntry = this.executionHistory.find(entry => entry.id === executionId);
    if (historyEntry) {
      historyEntry.progress = historyEntry.progress || [];
      historyEntry.progress.push(progress);
    }

    // Call progress callback
    if (context.progressCallback) {
      context.progressCallback(progress);
    }

    // Emit progress event
    this.emit('executionProgress', {
      type: 'progress',
      toolCallId: context.toolCall.id,
      sessionId: context.sessionId,
      progress,
      timestamp: new Date(),
    } as ToolExecutionUpdate);
  }

  private updateStatus(executionId: string, status: ToolExecutionStatus): void {
    const context = this.activeExecutions.get(executionId);
    if (!context) return;

    // Call status callback
    if (context.statusCallback) {
      context.statusCallback(status);
    }

    // Emit status event
    this.emit('executionStatus', {
      type: 'status',
      toolCallId: context.toolCall.id,
      sessionId: context.sessionId,
      status,
      timestamp: new Date(),
    } as ToolExecutionUpdate);
  }

  private finalizeExecution(executionId: string, historyEntry: ToolExecutionHistoryEntry): void {
    // Remove from active executions
    this.activeExecutions.delete(executionId);

    // Add to history if logging is enabled
    if (this.config.enableHistoryLogging) {
      this.executionHistory.push(historyEntry);
      
      // Limit history size (keep last 1000 entries)
      if (this.executionHistory.length > 1000) {
        this.executionHistory = this.executionHistory.slice(-1000);
      }
    }

    // Emit completion event
    this.emit('executionCompleted', {
      type: 'completed',
      toolCallId: historyEntry.toolCallId,
      sessionId: historyEntry.sessionId,
      result: historyEntry.result,
      timestamp: new Date(),
    } as ToolExecutionUpdate);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const toolExecutionManager = new ToolExecutionManager();

export default ToolExecutionManager;