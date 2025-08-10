# MCP Chat UI Migration Utilities

This directory contains comprehensive migration utilities for transforming data from the legacy Vite frontend + Next.js backend architecture to the unified Next.js architecture.

## Overview

The migration system provides:

- **Data Validation**: Validates legacy data formats and ensures integrity
- **Data Transformation**: Converts legacy data structures to new formats
- **User Data Preservation**: Ensures all user data is preserved with integrity protection
- **Backup & Rollback**: Creates backups and provides rollback mechanisms
- **Progress Tracking**: Real-time progress updates during migration
- **Comprehensive Reporting**: Detailed migration reports and analysis

## Key Features

### 🛡️ Data Preservation
- Preserves all existing chat sessions with message history
- Maintains user preferences and settings
- Converts API key configurations to new encrypted storage
- Preserves MCP server configurations in new format
- Adds preservation metadata for audit trails

### 🔒 Security & Integrity
- Validates data integrity with checksums
- Preserves encryption for API keys
- Secure backup creation with integrity checks
- Rollback mechanisms for failed migrations

### 📊 Analysis & Reporting
- Creates inventory of existing user data
- Migration readiness assessment
- Detailed migration reports
- Progress tracking with real-time updates

## Usage

### Command Line Interface

```bash
# Complete migration (recommended)
npm run migrate complete

# Check migration readiness
npm run migrate data readiness

# Create data inventory
npm run migrate data inventory

# Validate migration without executing
npm run migrate validate

# Basic migration (legacy)
npm run migrate run
```

### Programmatic Usage

```typescript
import { 
  runCompleteMigration, 
  validateCompleteMigrationReadiness,
  createUserDataInventory 
} from './lib/migration';

// Run complete migration
const result = await runCompleteMigration({
  dryRun: false,
  createBackup: true,
  force: false,
}, (progress) => {
  console.log(`${progress.progress}% - ${progress.stepName}`);
});

// Check readiness
const readiness = await validateCompleteMigrationReadiness();
if (!readiness.ready) {
  console.log('Issues:', readiness.issues);
}

// Create inventory
const { inventory } = await createUserDataInventory();
console.log(`Found ${inventory.chatSessions.count} sessions`);
```

## Migration Process

### Phase 1: Analysis & Preparation
1. **Data Inventory**: Analyzes existing data and creates comprehensive inventory
2. **Readiness Check**: Validates migration prerequisites and identifies potential issues
3. **Backup Creation**: Creates comprehensive backup of all existing data

### Phase 2: Data Preservation
1. **Chat Sessions**: Preserves all chat history with integrity protection
2. **User Settings**: Migrates LLM provider configurations and user preferences
3. **API Keys**: Converts API key storage to new encrypted format
4. **MCP Configuration**: Preserves MCP server configurations

### Phase 3: Core Migration
1. **Environment Validation**: Ensures target environment is ready
2. **Data Transformation**: Converts data structures to new format
3. **Validation**: Verifies transformed data integrity
4. **Finalization**: Completes migration and cleanup

### Phase 4: Verification
1. **Data Validation**: Ensures all data is accessible in new format
2. **Integrity Checks**: Validates data integrity and completeness
3. **Report Generation**: Creates detailed migration report

## Data Structures

### Legacy Format (Source)
```typescript
// Legacy sessions format
{
  sessions: {
    [sessionId]: {
      id: string;
      title: string;
      messages: LegacyMessage[];
      createdAt: string;
      updatedAt: string;
      provider: string;
      model: string;
    }
  },
  metadata: {
    totalSessions: number;
    version: string;
  }
}

// Legacy settings format
{
  llmProviders: LegacyLLMProviderConfig[];
  mcpServers: LegacyMCPServerConfig[];
  preferences: LegacyUserPreferences;
}
```

### New Format (Target)
```typescript
// New sessions format
{
  sessions: {
    [sessionId]: ChatSession; // Enhanced with metadata
  },
  metadata: {
    version: "2.0.0";
    preservationInfo: PreservationMetadata;
  }
}

// New settings format
{
  llmProviders: LLMProviderConfig[];
  mcpServers: MCPServerConfig[];
  preferences: UserPreferences;
  metadata: {
    version: "2.0.0";
    preservationInfo: PreservationMetadata;
  }
}
```

## Configuration Options

### Migration Options
```typescript
interface CompleteMigrationOptions {
  dryRun?: boolean;              // Perform dry run without changes
  createBackup?: boolean;        // Create backup before migration
  force?: boolean;               // Continue despite validation errors
  rollbackOnError?: boolean;     // Auto-rollback on failure
  skipDataPreservation?: boolean; // Skip preservation steps
  generateInventory?: boolean;   // Create data inventory
  preservationOptions?: {
    preserveEncryption: boolean;   // Keep API keys encrypted
    validateIntegrity: boolean;    // Validate data integrity
    createChecksums: boolean;      // Create data checksums
    preserveTimestamps: boolean;   // Keep original timestamps
    preserveMetadata: boolean;     // Add preservation metadata
  };
}
```

## Error Handling

The migration system includes comprehensive error handling:

- **Validation Errors**: Pre-migration validation catches issues early
- **File System Errors**: Graceful handling of permission and disk space issues
- **Data Corruption**: Integrity checks detect and report corrupted data
- **Partial Failures**: Continues migration where possible, reports failures
- **Rollback Support**: Automatic rollback on critical failures

## Backup & Recovery

### Backup Features
- **Comprehensive Backups**: Includes all user data and configurations
- **Integrity Protection**: Checksums ensure backup integrity
- **Metadata Preservation**: Includes migration metadata and timestamps
- **Multiple Formats**: Supports different backup formats and compression

### Recovery Options
- **Automatic Rollback**: Triggered on critical migration failures
- **Manual Restore**: CLI commands for manual backup restoration
- **Selective Recovery**: Restore specific components (sessions, settings, etc.)
- **Validation**: Verify backup integrity before restoration

## Testing

The migration utilities include comprehensive tests:

```bash
# Run migration tests
npm test lib/migration

# Run specific test suites
npm test lib/migration/__tests__/migration.test.ts
npm test lib/migration/__tests__/user-data-preservation.test.ts
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure write permissions to `data/` directory
   - Check disk space availability

2. **Data Validation Failures**
   - Review validation errors in migration report
   - Use `--force` flag to continue despite warnings

3. **Backup Creation Failures**
   - Check available disk space
   - Verify directory permissions

4. **API Key Migration Issues**
   - Ensure encryption service is available
   - Check for corrupted encrypted keys

### Debug Mode

Enable debug logging:
```bash
DEBUG=migration:* npm run migrate complete
```

### Recovery Procedures

If migration fails:
1. Check migration report for specific errors
2. Use backup restoration: `npm run migrate backup restore <path>`
3. Fix identified issues and retry migration
4. Contact support if issues persist

## File Structure

```
lib/migration/
├── types.ts                    # Type definitions
├── validation.ts               # Data validation utilities
├── backup.ts                   # Backup and restore utilities
├── data-transformer.ts         # Data transformation logic
├── migration-steps.ts          # Individual migration steps
├── migration-runner.ts         # Migration orchestration
├── user-data-preservation.ts   # User data preservation
├── complete-migration.ts       # Complete migration workflow
├── index.ts                    # Main exports
├── README.md                   # This file
└── __tests__/                  # Test files
    ├── migration.test.ts
    └── user-data-preservation.test.ts
```

## Requirements Compliance

This migration system addresses the following requirements:

- **9.1, 9.2, 9.3, 9.4**: Session management and history preservation
- **2.2**: LLM provider configuration migration
- **7.2, 7.3**: Security and encryption preservation
- **11.5**: API key management and encryption

## Contributing

When adding new migration features:

1. Add appropriate type definitions in `types.ts`
2. Include comprehensive validation in `validation.ts`
3. Add migration steps to `migration-steps.ts`
4. Include thorough tests in `__tests__/`
5. Update this README with new features

## License

This migration system is part of the MCP Chat UI project and follows the same license terms.