# MCP Chat UI Architecture Migration

## Overview

This document describes the gradual migration from the current dual-architecture (Vite frontend + Next.js backend) to a unified Next.js 15 App Router architecture.

## Current State

### Existing Architecture (Preserved)
- **Frontend**: Vite + React in `src/` directory
- **Backend**: Next.js API routes in `backend/` directory
- **Development**: `npm run dev:legacy` (Vite) + separate backend server
- **Build**: `npm run build:legacy`

### New Architecture (In Development)
- **Unified**: Next.js 15 App Router in `app/` directory
- **Development**: `npm run dev` (Next.js with Turbopack)
- **Build**: `npm run build`

## Migration Strategy

### Phase 1: Setup ✅
- [x] Create backup of existing implementation
- [x] Set up Next.js 15 App Router structure alongside existing code
- [x] Install additional dependencies for unified architecture
- [x] Create basic page structure and API routes
- [x] Update configuration files
- [x] Verify new architecture builds and runs successfully

### Phase 2: Implementation (Upcoming)
- [ ] Implement core services and components
- [ ] Migrate functionality from existing codebase
- [ ] Test new architecture thoroughly

### Phase 3: Migration (Future)
- [ ] Create data migration utilities
- [ ] Switch to new architecture
- [ ] Remove legacy code

## Directory Structure

```
/
├── app/                    # New Next.js App Router
│   ├── api/               # API Route Handlers
│   ├── chat/              # Chat pages
│   ├── settings/          # Settings pages
│   └── layout.tsx         # Root layout
├── src/                   # Legacy Vite frontend (preserved)
├── backend/               # Legacy Next.js backend (preserved)
├── components/            # New shared components
├── lib/                   # New utilities and types
├── services/              # New service layer
└── config/                # Configuration files
```

## Development Commands

### New Architecture
- `npm run dev` - Start Next.js development server with Turbopack
- `npm run build` - Build unified Next.js application
- `npm run start` - Start production server

### Legacy Architecture (Fallback)
- `npm run dev:legacy` - Start Vite development server
- `npm run build:legacy` - Build Vite application

## Notes

- Both architectures coexist during migration
- Legacy code is preserved until new implementation is complete
- Configuration updated to support both development modes
- Dependencies added for unified architecture without breaking existing code
## Verification

### Build Status ✅
- New Next.js architecture builds successfully
- All TypeScript types compile without errors
- ESLint configuration updated for Next.js
- Development server starts with Turbopack
- Legacy src directory properly excluded from Next.js compilation
- No conflicts between App Router and Pages Router

### API Endpoints Created
- `/api/health` - Health check endpoint
- `/api/chat` - Chat API (placeholder)
- `/api/settings` - Settings API (placeholder)

### Pages Created
- `/` - Home page with navigation
- `/chat` - Chat interface (placeholder)
- `/settings` - Settings page (placeholder)
- `/history` - Chat history page (placeholder)

### Configuration Files
- `next.config.js` - Next.js configuration with CORS headers and webpack exclusions
- `tsconfig.json` - TypeScript configuration for Next.js with proper excludes
- `tailwind.config.js` - Updated for new directory structure
- `eslint.config.js` - Updated ESLint rules for Next.js with src directory exclusion
- `config/mcp.config.json` - MCP server configuration template
- `pages/.gitkeep` - Temporary directory to prevent App Router conflicts
- `.nextignore` - Next.js ignore file for legacy directories

### Dependencies Added
- `next@^15.4.6` - Next.js framework
- `@modelcontextprotocol/sdk@^1.17.1` - MCP protocol SDK
- `openai@^4.73.1` - OpenAI SDK for LLM integration
- `zod@^3.24.1` - Schema validation
- `cors@^2.8.5` - CORS middleware
- `crypto-js@^4.2.0` - Encryption utilities
- `dotenv@^17.2.1` - Environment variable management

## Troubleshooting

### App Router vs Pages Router Conflicts
- **Issue**: Next.js detected conflicting `src/pages/index.ts` with `app/page.tsx`
- **Solution**: Created empty `pages/` directory at root level to override src/pages detection
- **Alternative**: Temporarily rename conflicting files during build process

### ESLint Configuration
- **Issue**: ESLint was trying to lint the legacy src directory
- **Solution**: Updated `eslint.config.js` to explicitly ignore `src/**` directory
- **Result**: Only new Next.js files in `app/`, `components/`, `lib/`, `services/` are linted

### Webpack Configuration
- **Issue**: Next.js was trying to compile legacy Vite frontend files
- **Solution**: Added webpack watchOptions to ignore src and backend directories
- **Result**: Clean separation between legacy and new architectures

## Next Steps

The new Next.js architecture is now ready for implementation. The next task should focus on implementing the core configuration and data management systems as outlined in the implementation plan.