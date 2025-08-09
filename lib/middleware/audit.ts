import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Audit log levels
export enum AuditLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security',
}

// Audit log entry interface
export interface AuditLogEntry {
  timestamp: string;
  level: AuditLevel;
  event: string;
  details: Record<string, any>;
  request?: {
    method: string;
    url: string;
    userAgent?: string;
    ip?: string;
    headers?: Record<string, string>;
  };
  response?: {
    status: number;
    duration: number;
  };
  user?: {
    sessionId?: string;
    identifier?: string;
  };
}

// Audit logger class
export class AuditLogger {
  private static instance: AuditLogger;
  private logDir: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 10;

  private constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'audit');
    this.ensureLogDirectory();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `audit-${date}.log`);
  }

  private sanitizeForLog(data: any): any {
    if (typeof data === 'string') {
      // Remove potential sensitive information
      return data
        .replace(/apikey[=:]\s*[^\s&]+/gi, 'apikey=***')
        .replace(/password[=:]\s*[^\s&]+/gi, 'password=***')
        .replace(/token[=:]\s*[^\s&]+/gi, 'token=***')
        .replace(/authorization:\s*[^\s&]+/gi, 'authorization: ***');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLog(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('key') || lowerKey.includes('password') || lowerKey.includes('token')) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = this.sanitizeForLog(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  public async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        details: this.sanitizeForLog(entry.details),
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      const logFile = this.getLogFileName();

      await writeFile(logFile, logLine, { flag: 'a' });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  public async logRequest(
    request: NextRequest,
    level: AuditLevel = AuditLevel.INFO,
    event: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';

    await this.log({
      level,
      event,
      details,
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip,
        headers: Object.fromEntries(
          Array.from(request.headers.entries()).filter(([key]) => 
            !key.toLowerCase().includes('authorization') && 
            !key.toLowerCase().includes('cookie')
          )
        ),
      },
    });
  }

  public async logResponse(
    request: NextRequest,
    status: number,
    duration: number,
    level: AuditLevel = AuditLevel.INFO,
    event: string = 'api_response',
    details: Record<string, any> = {}
  ): Promise<void> {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';

    await this.log({
      level,
      event,
      details,
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip,
      },
      response: {
        status,
        duration,
      },
    });
  }

  public async logSecurity(
    event: string,
    details: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    let requestInfo;
    if (request) {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
      
      requestInfo = {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip,
      };
    }

    await this.log({
      level: AuditLevel.SECURITY,
      event,
      details,
      request: requestInfo,
    });
  }

  public async logToolExecution(
    toolName: string,
    serverId: string,
    success: boolean,
    duration: number,
    request?: NextRequest,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: success ? AuditLevel.INFO : AuditLevel.WARN,
      event: 'tool_execution',
      details: {
        toolName,
        serverId,
        success,
        duration,
        ...details,
      },
      request: request ? {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown',
      } : undefined,
    });
  }

  public async logRateLimit(
    identifier: string,
    endpoint: string,
    request?: NextRequest
  ): Promise<void> {
    await this.logSecurity('rate_limit_exceeded', {
      identifier,
      endpoint,
    }, request);
  }

  public async logValidationError(
    error: string,
    field?: string,
    request?: NextRequest
  ): Promise<void> {
    await this.logSecurity('validation_error', {
      error,
      field,
    }, request);
  }

  public async logAuthenticationFailure(
    reason: string,
    request?: NextRequest
  ): Promise<void> {
    await this.logSecurity('authentication_failure', {
      reason,
    }, request);
  }
}

// Convenience functions for common audit events
export const auditLogger = AuditLogger.getInstance();

export const logApiCall = (request: NextRequest, endpoint: string, details?: Record<string, any>) =>
  auditLogger.logRequest(request, AuditLevel.INFO, 'api_call', { endpoint, ...details });

export const logApiResponse = (request: NextRequest, status: number, duration: number, details?: Record<string, any>) =>
  auditLogger.logResponse(request, status, duration, AuditLevel.INFO, 'api_response', details);

export const logSecurityEvent = (event: string, details: Record<string, any>, request?: NextRequest) =>
  auditLogger.logSecurity(event, details, request);

export const logToolExecution = (toolName: string, serverId: string, success: boolean, duration: number, request?: NextRequest, details?: Record<string, any>) =>
  auditLogger.logToolExecution(toolName, serverId, success, duration, request, details);

export const logRateLimit = (identifier: string, endpoint: string, request?: NextRequest) =>
  auditLogger.logRateLimit(identifier, endpoint, request);

export const logValidationError = (error: string, field?: string, request?: NextRequest) =>
  auditLogger.logValidationError(error, field, request);

export const logAuthenticationFailure = (reason: string, request?: NextRequest) =>
  auditLogger.logAuthenticationFailure(reason, request);