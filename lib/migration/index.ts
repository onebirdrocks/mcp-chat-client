// Migration utilities main export

export * from './types';
export * from './validation';
export * from './backup';
export * from './data-transformer';
export * from './migration-steps';
export * from './migration-runner';
export * from './user-data-preservation';
export * from './complete-migration';

// Re-export commonly used functions
export {
  runMigration,
  validateMigration,
  createMigrationPlan,
  backupUtils,
  MigrationRunner,
} from './migration-runner';

export {
  runCompleteMigration,
  validateCompleteMigrationReadiness,
  createMigrationReport,
} from './complete-migration';

export {
  createUserDataInventory,
  preserveChatSessions,
  preserveUserSettings,
  migrateApiKeyStorage,
  preserveMCPServerConfigurations,
  validateDataPreservation,
} from './user-data-preservation';

export {
  validateLegacySessionsData,
  validateLegacySettings,
  validateMigrationEnvironment,
} from './validation';

export {
  createBackup,
  restoreFromBackup,
  listBackups,
  cleanupOldBackups,
} from './backup';

export {
  transformChatSession,
  transformSettings,
  transformChatSessions,
} from './data-transformer';