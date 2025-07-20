# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

- **No backward compatibility required** - Always write the best, most modern code without considering legacy support
- **MVP approach:**
  - Keep development lean and simple, avoid over-engineering
  - **Don't reinvent the wheel** - Use installed libraries and packages when available
  - If a library provides a ready-made class, use it directly instead of creating wrapper classes
  - Leverage existing solutions rather than building custom implementations
- **Technology stack:**
  - Backend: Node.js with TypeScript, tRPC
  - Frontend: Svelte v5, TypeScript, vanilla tRPC
  - Logger: tslog (for both backend & frontend)
  - UI: Tailwind CSS v4, Shadcn-svelte (for svelte v5 & tailwind v4), bootstrap icons (svelte-bootstrap-icons)
- **Core principles:**
  - **Explicit is better than implicit** - Always favor explicit declarations, clear function signatures, and obvious code intent over clever shortcuts
- **TypeScript best practices:**
  - Ensure full type safety
  - Avoid using `as` type assertions
  - Follow strict TypeScript conventions
  - Explicitly type function parameters and return values
  - Use explicit imports/exports instead of wildcards
- **Svelte v5 best practices**
- **Code organization:**
  - No centralized type/schema/event definition files
  - Define types, schemas, and events directly in their responsible files (services, repositories, routes)
  - **No index.ts files** - Use direct imports instead of barrel exports
- **Error handling:**
  - Minimal error handling approach
  - Avoid try/catch blocks - let errors bubble up naturally
  - Throw errors directly when needed
- **Documentation:**
  - Add comments only when necessary
  - Keep comments clear, concise, and lean
  - Include file relative path as comment on first line: `// path/to/file.ts`
- **Output language:** English only

## Project Structure

This is a monorepo with one active frontend application and a shared core package:

- **packages/events-core**: Central business logic package with tRPC server, services, and event system
- **apps/my-app-svelte**: Svelte 5 frontend with Vite and TailwindCSS (active)
- **apps/my-app-trpc-2**: Next.js 15 frontend (deprecated)

## Essential Commands

### Development

```bash
# Root level formatting
pnpm format

# Svelte app (my-app-svelte)
cd apps/my-app-svelte
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm test       # Run tests
pnpm check      # Type checking

# Next.js app (my-app-trpc-2) - DEPRECATED
# cd apps/my-app-trpc-2

# Events core package
cd packages/events-core
pnpm dev        # TypeScript watch mode
pnpm build      # Build TypeScript
pnpm test       # Jest tests
pnpm lint       # ESLint with zero warnings
pnpm check-types # TypeScript checking
```

### Demo Scripts

```bash
cd packages/events-core
pnpm example                    # Run basic example
pnpm chat-engine-demo          # Demo chat engine
pnpm content-generator-demo    # Demo content generator
pnpm test-with-api            # Test with actual API
```

## Architecture Overview

### Core Design Patterns

**Event-Driven Architecture**: All system communication flows through a central EventBus using pub/sub patterns with strongly typed events for both client and server sides.

**tRPC API Layer**: Type-safe end-to-end API with modular routers (chat, task, file, project, event, user-settings) and real-time capabilities via subscriptions.

**Repository Pattern**: Consistent data access layer with file-based persistence using human-readable JSON files for chats, tasks, and settings.

### Key Services

- **ChatService**: Manages chat lifecycle, message handling, and AI interactions
- **TaskService**: Handles task creation, status tracking, and directory management
- **FileService**: Manages file operations and artifact creation with watch capabilities
- **ProjectFolderService**: Workspace management and project registration
- **FileWatcherService**: Real-time file system monitoring using chokidar

### Chat Engine Architecture

The system includes dual chat implementations:

- **Basic Chat Engine**: Traditional chat with message management
- **Enhanced Chat Engine**: AI SDK v5 integration with advanced features in `services/content-generator/`

### Frontend Integration

**Svelte App**: Uses direct tRPC client with reactive stores for state management, Vitest for testing, and Svelte 5 with runes. This is the active frontend application.

The frontend consumes TypeScript types from events-core package and connects via workspace protocol.

## Development Guidelines

### Package Management

Uses pnpm workspaces with `packageManager: "pnpm@9.0.0"` and Node.js >=18 requirement.

### Type Safety

All inter-service communication is strongly typed through tRPC with SuperJSON for complex data serialization.

### File System Integration

Services interact directly with the file system for persistence, with structured JSON formats and real-time file watching capabilities.

### Event System Usage

Use correlation IDs for request tracing and leverage async iterators for real-time event streaming with proper cleanup and cancellation.
