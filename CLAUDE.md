# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a Turborepo monorepo using pnpm as the package manager.

### Build and Development
- `pnpm dev` - Start development servers for all apps
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Run linting across all workspaces
- `pnpm format` - Format code using Prettier
- `pnpm check-types` - Run TypeScript type checking

### Testing
- `pnpm test` - Run tests across all packages
- `pnpm jest` - Run Jest tests (from README cheatsheet)
- `pnpm --filter @repo/events-core test` - Run tests for events-core package specifically

### Package-specific commands
For individual apps/packages, navigate to their directory or use workspace filtering:
- `pnpm --filter my-app-trpc-2 dev` - Start main tRPC app
- `pnpm --filter @repo/events-core test` - Test events-core package
- `pnpm --filter @repo/events-core dev` - Watch TypeScript compilation for events-core

### Utility Commands
- `pnpm dlx repomix -ignore "node_modules,.log,tmp/"` - Generate codebase summary
- `pnpm dlx syncpack list-mismatches` - Check package version mismatches
- `pnpm dlx syncpack fix-mismatches --types '!local'` - Fix version mismatches
- `pnpm tsx packages/events-core/examples/trpc-server-example.ts` - Start tRPC server example

## Architecture Overview

This is an event-driven AI chat application built as a monorepo with the following structure:

### Workspaces
- **apps/**: Contains Next.js applications
  - `my-app-trpc-2`: Main application with three-panel layout (Explorer, Chat, Preview) using event-driven architecture
- **packages/**: Shared packages
  - `@repo/events-core`: Core event system with tRPC server, WebSocket support, and business logic
  - `@repo/ui`: Shared React components
  - `@repo/eslint-config`: ESLint configurations
  - `@repo/typescript-config`: TypeScript configurations

### Key Technologies
- **Event-driven architecture**: Uses custom event bus system (`event-bus.ts`, `event-types.ts`)
- **tRPC**: Type-safe API layer with routers for chat, files, tasks, project folders, and user settings
- **WebSocket**: Real-time communication for events
- **Next.js 15**: React framework with App Router and Turbopack
- **TypeScript**: Full type safety across the codebase
- **Zustand**: State management in frontend
- **TanStack Query**: Data fetching and caching with tRPC integration
- **Radix UI**: Headless UI components (Dialog, Toast, Select, Dropdown)
- **React Bootstrap Icons**: Icon library
- **Jest**: Testing framework with comprehensive test coverage
- **Tailwind CSS v4**: Styling with PostCSS integration
- **Chokidar**: File system watching

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
- Three-panel layout: Explorer, Chat, Preview
- Component-based architecture with shared UI components
- State management using Zustand stores
- Event-driven UI updates via WebSocket connections

## Package Management
- Uses pnpm workspaces with Turborepo for build orchestration
- Workspace dependencies use `workspace:*` protocol
- Syncpack maintains version consistency across workspaces

## Development Notes
- Event-driven design inspired by CQRS patterns with clear separation between client and server events
- File operations are abstracted through services layer with comprehensive error handling
- WebSocket server can be started independently for testing via `pnpm tsx packages/events-core/examples/trpc-server-example.ts`
- Comprehensive Jest test suite covers services and integration scenarios with snapshot testing
- Uses ES modules (`"type": "module"`) throughout the codebase
- All packages use workspace protocol (`workspace:*`) for internal dependencies

## File Structure Patterns
- Tests are co-located with source code in dedicated `tests/` directories
- Examples and demos are provided in `examples/` directories for learning and testing
- Services follow repository pattern with separate repository classes for data persistence
- tRPC routers are organized by domain (chat, files, tasks, project folders, user settings)