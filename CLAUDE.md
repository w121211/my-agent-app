# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

- **No backward compatibility required** - Always write the best, most modern code without considering legacy support
- **MVP approach:**
  - Keep development lean and simple, avoid over-engineering
  - Don't reinvent the wheel
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
- **Svelte v5 best practices:**
- **Code organization:**
  - No centralized type/schema/event definition files
  - Define types, schemas, and events directly in their responsible files (services, repositories, routes)
- **Error handling:**
  - Minimal error handling approach
  - Avoid try/catch blocks - let errors bubble up naturally
  - Throw errors directly when needed
- **Documentation:**
  - Add comments only when necessary
  - Keep comments clear, concise, and lean
  - Include file relative path as comment on first line: `// path/to/file.ts`
- **Output language:** English only

## Development Commands

This is a Turborepo monorepo using pnpm as the package manager.

### Build and Development
- `pnpm dev` - Start development servers for all apps (uses Next.js with Turbopack)
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Run linting across all workspaces
- `pnpm format` - Format code using Prettier
- `pnpm check-types` - Run TypeScript type checking

### Testing
- `pnpm jest` - Run Jest tests (from README cheatsheet)
- `cd packages/events-core && pnpm test` - Run Jest tests for events-core package
- `cd apps/my-app-svelte && pnpm test` - Run Vitest tests for Svelte app

### Package-specific commands
Navigate to individual directories to run package-specific commands:
- `cd apps/my-app-trpc-2 && pnpm dev` - Start Next.js tRPC app
- `cd apps/my-app-svelte && pnpm dev` - Start Svelte app with Vite
- `cd packages/events-core && pnpm dev` - Watch TypeScript compilation for events-core

### Utility Commands
- `pnpm dlx repomix -ignore "node_modules,.log,tmp/"` - Generate codebase summary
- `pnpm dlx syncpack list-mismatches` - Check package version mismatches
- `pnpm dlx syncpack fix-mismatches --types '!local'` - Fix version mismatches
- `pnpm tsx packages/events-core/examples/trpc-server-example.ts` - Start tRPC server example
- `git ls-files | sort | tree --fromfile` - Display directory tree using .gitignore

## Architecture Overview

This is an event-driven AI chat application built as a monorepo with the following structure:

### Workspaces
- **apps/**: Contains frontend applications
  - `my-app-trpc-2`: Next.js application with three-panel layout (Explorer, Chat, Preview) using React, tRPC, and Zustand
  - `my-app-svelte`: Svelte application with Vite, implementing similar chat interface using Svelte 5
- **packages/**: Shared packages
  - `@repo/events-core`: Core event system with tRPC server, WebSocket support, and business logic
  - `@repo/ui`: Shared React components
  - `@repo/eslint-config`: ESLint configurations
  - `@repo/typescript-config`: TypeScript configurations

### Key Technologies
- **Event-driven architecture**: CQRS-inspired event naming with custom event bus system (`event-bus.ts`, `event-types.ts`)
- **tRPC**: Type-safe API layer with routers for chat, files, tasks, project folders, and user settings
- **WebSocket**: Real-time communication for events
- **Next.js 15**: React 19 framework with App Router and Turbopack (my-app-trpc-2)
- **Svelte 5**: Modern reactive framework with Vite (my-app-svelte)
- **TypeScript**: Full type safety across the codebase with ES modules (`"type": "module"`)
- **Zustand**: State management in Next.js frontend
- **TanStack Query**: Data fetching and caching with tRPC integration (Next.js app)
- **Radix UI**: Headless UI components (Dialog, Toast, Select, Dropdown) for React app
- **React Bootstrap Icons**: Icon library (Next.js app)
- **Svelte Bootstrap Icons**: Icon library (Svelte app)
- **Jest**: Testing framework for events-core package with snapshot testing
- **Vitest**: Testing framework for Svelte app with Playwright browser testing
- **Tailwind CSS v4**: Styling with PostCSS integration across both apps
- **Chokidar**: File system watching
- **tslog**: Logging for both backend & frontend

### Core Event System
The application is built around an event-driven architecture:
- Events are defined in `packages/events-core/src/event-types.ts`
- Event bus implementation in `packages/events-core/src/event-bus.ts`
- Client and server events for chat, tasks, file operations, and workspace management
- WebSocket-based real-time event relay

### Services Architecture
Located in `packages/events-core/src/services/`:
- `chat-service.ts`: Chat message handling and AI integration
- `task-service.ts`: Task management and workflow
- `file-service.ts`: File system operations
- `file-watcher-service.ts`: File change monitoring with Chokidar
- `project-folder-service.ts`: Workspace/project management
- `user-settings-service.ts`: User preferences and configuration
- Repository pattern for data persistence (chat, task, user-settings repositories)

### Frontend Architecture
- **Next.js App (my-app-trpc-2)**: Three-panel layout (Explorer, Chat, Preview) with React 19 components, Zustand state management, and TanStack Query for data fetching
- **Svelte App (my-app-svelte)**: Similar three-panel layout implemented with Svelte 5 components and custom stores
- Both apps use tRPC client for type-safe API communication
- Event-driven UI updates via WebSocket subscriptions to events-core
- Shared component patterns and styling with Tailwind CSS v4
- Both frontends implement identical functionality using different frameworks

## Package Management
- Uses pnpm workspaces with Turborepo for build orchestration
- Workspace dependencies use `workspace:*` protocol
- Syncpack maintains version consistency across workspaces

## Development Notes
- Event-driven design inspired by CQRS patterns with clear separation between client and server events
- File operations are abstracted through services layer with minimal error handling approach (let errors bubble up)
- WebSocket server can be started independently for testing via `pnpm tsx packages/events-core/examples/trpc-server-example.ts`
- Jest test suite covers events-core services and integration scenarios with snapshot testing
- Vitest with Playwright browser testing used for Svelte app components
- Uses ES modules (`"type": "module"`) throughout the codebase
- All packages use workspace protocol (`workspace:*`) for internal dependencies
- Both frontend apps implement identical functionality using different frameworks (React vs Svelte)
- Chat engine located in `packages/events-core/src/chat-engine/` with session management and turn tracking

## File Structure Patterns
- Tests are co-located with source code in dedicated `tests/` directories
- Examples and demos are provided in `examples/` directories for learning and testing
- Services follow repository pattern with separate repository classes for data persistence
- tRPC routers are organized by domain (chat, files, tasks, project folders, user settings)