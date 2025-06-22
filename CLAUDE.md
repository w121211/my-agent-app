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

### Package-specific commands
For individual apps/packages, navigate to their directory or use workspace filtering:
- `pnpm --filter my-app dev` - Start specific app
- `pnpm --filter @repo/events-core test` - Test specific package

### Utility Commands
- `pnpm dlx repomix -ignore "node_modules,.log,tmp/"` - Generate codebase summary
- `pnpm dlx syncpack list-mismatches` - Check package version mismatches
- `pnpm dlx syncpack fix-mismatches --types '!local'` - Fix version mismatches
- `pnpm tsx packages/events-core/examples/trpc-server-example.ts` - Start tRPC server example

## Architecture Overview

This is an event-driven AI chat application built as a monorepo with the following structure:

### Workspaces
- **apps/**: Contains Next.js applications
  - `my-app`: Main application with React components, event-driven architecture
  - `my-app-trpc`: tRPC-based implementation
  - `my-app-trpc-2`: Alternative tRPC implementation
- **packages/**: Shared packages
  - `@repo/events-core`: Core event system with tRPC server, WebSocket support, and business logic
  - `@repo/ui`: Shared React components
  - `@repo/eslint-config`: ESLint configurations
  - `@repo/typescript-config`: TypeScript configurations

### Key Technologies
- **Event-driven architecture**: Uses custom event bus system (`event-bus.ts`, `event-types.ts`)
- **tRPC**: Type-safe API layer with routers for chat, files, tasks, and project folders
- **WebSocket**: Real-time communication for events
- **Next.js 15**: React framework with App Router
- **TypeScript**: Full type safety across the codebase
- **Zustand**: State management in frontend
- **Dependency Injection**: Uses tsyringe for service management
- **Jest**: Testing framework
- **Tailwind CSS**: Styling

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
- `file-watcher-service.ts`: File change monitoring
- `project-folder-service.ts`: Workspace/project management
- Repository pattern for data persistence

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
- Event-driven design inspired by CQRS patterns
- File operations are abstracted through services layer
- WebSocket server can be started independently for testing
- Comprehensive Jest test suite covers services and integration scenarios