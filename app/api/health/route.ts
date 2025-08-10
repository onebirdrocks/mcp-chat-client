import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    filesystem: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      errors: string[];
    };
    api: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      errors: string[];
    };
    config: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      errors: string[];
    };
  };
  warnings: string[];
  recommendations: string[];
}

/**
 * Simplified health check endpoint that verifies basic system components
 */
export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now();
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Initialize health check result
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        filesystem: {
          status: 'healthy',
          errors: []
        },
        api: {
          status: 'healthy',
          errors: []
        },
        config: {
          status: 'healthy',
          errors: []
        }
      },
      warnings,
      recommendations
    };

    // Check filesystem access
    try {
      const configPath = path.join(process.cwd(), 'config');
      const dataPath = path.join(process.cwd(), 'data');
      
      // Check if config directory exists and is accessible
      if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
      }
      
      // Check if data directory exists and is accessible
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      
      // Test write access
      const testFile = path.join(dataPath, '.health-check');
      fs.writeFileSync(testFile, new Date().toISOString());
      fs.unlinkSync(testFile);
      
      healthCheck.services.filesystem.status = 'healthy';
    } catch (error) {
      healthCheck.services.filesystem.status = 'unhealthy';
      healthCheck.services.filesystem.errors.push(
        error instanceof Error ? error.message : 'Filesystem access failed'
      );
    }

    // Check API functionality
    try {
      // Basic API functionality test
      const testData = { test: true, timestamp: Date.now() };
      const serialized = JSON.stringify(testData);
      const parsed = JSON.parse(serialized);
      
      if (parsed.test !== true) {
        throw new Error('JSON serialization test failed');
      }
      
      healthCheck.services.api.status = 'healthy';
    } catch (error) {
      healthCheck.services.api.status = 'unhealthy';
      healthCheck.services.api.errors.push(
        error instanceof Error ? error.message : 'API functionality test failed'
      );
    }

    // Check configuration files
    try {
      const mcpConfigPath = path.join(process.cwd(), 'config', 'mcp.config.json');
      
      if (fs.existsSync(mcpConfigPath)) {
        const configContent = fs.readFileSync(mcpConfigPath, 'utf-8');
        JSON.parse(configContent); // Validate JSON
        recommendations.push('MCP configuration file found and valid');
      } else {
        warnings.push('MCP configuration file not found');
        recommendations.push('Create config/mcp.config.json to configure MCP servers');
      }
      
      healthCheck.services.config.status = 'healthy';
    } catch (error) {
      healthCheck.services.config.status = 'degraded';
      healthCheck.services.config.errors.push(
        error instanceof Error ? error.message : 'Configuration validation failed'
      );
      warnings.push('Configuration file validation failed');
    }

    // Determine overall status
    const serviceStatuses = Object.values(healthCheck.services).map(s => s.status);
    if (serviceStatuses.some(s => s === 'unhealthy')) {
      healthCheck.status = 'unhealthy';
    } else if (serviceStatuses.some(s => s === 'degraded')) {
      healthCheck.status = 'degraded';
    }

    // Add performance warning if health check took too long
    const duration = Date.now() - startTime;
    if (duration > 2000) {
      warnings.push('Health check took longer than expected');
      recommendations.push('System may be under load');
    }

    // Return appropriate HTTP status based on health
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: httpStatus });

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        filesystem: { status: 'unhealthy', errors: ['Health check failed'] },
        api: { status: 'unhealthy', errors: ['Health check failed'] },
        config: { status: 'unhealthy', errors: ['Health check failed'] }
      },
      warnings: ['System health check failed'],
      recommendations: ['Check system logs and restart the application if necessary']
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

/**
 * Simple ping endpoint for basic connectivity testing
 */
export async function HEAD(_request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}