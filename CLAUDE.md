# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
# First start the tRPC server
cd ../packages/events-core && pnpm run trpc-server
# Then in another terminal, start the frontend
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
pnpm tool-call-demo            # Demo tool call system
pnpm tool-registry-example     # Demo tool registry with AI SDK
pnpm file-references-demo      # Demo file reference system
```

## Architecture Overview

### Core Design Patterns

**Event-Driven Architecture**: All system communication flows through a central EventBus using pub/sub patterns with strongly typed events for both client and server sides.

**tRPC API Layer**: Type-safe end-to-end API with modular routers (chatClient, task, file, projectFolder, event, userSettings) and real-time capabilities via subscriptions.

**Repository Pattern**: Consistent data access layer with file-based persistence using human-readable JSON files for chats, tasks, and settings.

### Key Services

- **ChatSessionRepository**: Manages chat session lifecycle and message persistence
- **TaskService**: Handles task creation, status tracking, and directory management with repository pattern
- **FileService**: Manages file operations and artifact creation with watch capabilities
- **ProjectFolderService**: Workspace management and project registration with real-time folder watching
- **FileWatcherService**: Real-time file system monitoring using chokidar
- **ToolRegistry**: Manages tool registration and execution with AI SDK v5 integration
- **UserSettingsService**: Handles user configuration and preferences

### Chat Engine Architecture

The system uses AI SDK v5 for chat functionality:

- **ChatClient Router**: Handles chat session management, message processing, and tool call coordination
- **AI SDK Integration**: Native support for multiple providers (Anthropic, OpenAI, Google) with tool calling
- **Content Generator**: Enhanced chat features with streaming and tool execution in `services/content-generator/`
- **Tool Call System**: Integrated tool execution with approval workflows and real-time progress tracking

### Frontend Integration

**Svelte App**: Uses direct tRPC client with Svelte 5 runes-based reactive stores (`*.svelte.ts`) for state management. Includes comprehensive UI components:

- **Chat Interface**: Message display with tool call execution and approval workflows
- **File Explorer**: Tree-based file browser with context menu and search capabilities
- **Tool Call UI**: Real-time progress tracking, permission confirmations, and result display
- **Project Management**: Workspace folder management and file watching

The frontend consumes TypeScript types from events-core package via workspace protocol.

## Development Guidelines

### Package Management

Uses pnpm workspaces with `packageManager: "pnpm@9.0.0"` and Node.js >=18 requirement.

### Type Safety

All inter-service communication is strongly typed through tRPC with SuperJSON for complex data serialization. Event system uses discriminated unions for type-safe event handling with correlation IDs for request tracing.

### File System Integration

Services interact directly with the file system for persistence, with structured JSON formats and real-time file watching capabilities.

### Event System Usage

Central EventBus with strongly-typed events (`ClientEventUnion` | `ServerEventUnion`) including:

- Task lifecycle events (creation, updates, completion)
- File system events (watching, changes, artifacts)
- Tool call events (registration, execution, approval)
- Real-time subscriptions via tRPC with async iterators and proper cleanup

## Development Guidelines

### General

- **No backward compatibility required** - Always write the best, most modern code without considering legacy support
- **MVP approach:**
  - Keep development lean and simple, avoid over-engineering
  - **Don't reinvent the wheel** - Use installed libraries and packages when available
  - If a library provides a ready-made class, use it directly instead of creating wrapper classes
  - Leverage existing solutions rather than building custom implementations
- **Core principles:**
  - **Explicit is better than implicit** - Always favor explicit declarations, clear function signatures, and obvious code intent over clever shortcuts
- **TypeScript best practices:**
  - Ensure full type safety
  - Avoid using `as` type assertions
  - Follow strict TypeScript conventions
  - Explicitly type function parameters and return values
  - Use explicit imports/exports instead of wildcards
  - **Prefer native library types** - When using external libraries, import and use their native types instead of creating custom definitions
- **Native types principle:**
  - **Always use library's native types when available** - Avoid creating custom types that duplicate or wrap existing library types
  - **Import types directly from the source** - Use the exact types that library functions expect and return
  - **Examples:**
    - ✅ **Good**: Using AI SDK's native `ModelMessage` type for chat messages

      ```typescript
      import { streamText, type ModelMessage } from "ai";

      const messages: ModelMessage[] = [{ role: "user", content: "Hello" }];

      const result = await streamText({
        model: openai("gpt-4"),
        messages, // Native ModelMessage[] type
      });
      ```

    - ❌ **Bad**: Creating custom message type that duplicates library functionality

      ```typescript
      // Don't do this
      interface CustomMessage {
        role: string;
        content: string;
      }

      const messages: CustomMessage[] = [...];
      // Then converting to library format later
      ```

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

### Backend

- **Technology stack:**
  - Node.js with TypeScript
  - tRPC for API layer
  - Logger: tslog

### Frontend

- **Technology stack:**
  - Svelte v5 with TypeScript
  - Vanilla tRPC (client-side)
  - Logger: tslog
- **UI Framework:**
  - Tailwind CSS v4
  - Shadcn-svelte (for Svelte v5 & Tailwind v4)
  - Bootstrap icons (svelte-bootstrap-icons)
- **Frontend Architecture:**
  - The frontend employs a decoupled architecture to separate logic, state, and presentation.
  - **Service Layer (`/services`):** This layer contains all business logic. Services are responsible for orchestrating API calls, handling complex operations, and acting as the primary interface for any action that modifies the application.
  - **State Layer (`/stores`):** All application state is managed here using reactive Svelte stores. Stores are the single source of truth for UI data and should ideally only be mutated by the service layer to ensure predictable state management.
  - **Component Layer (`/components`):** Svelte components are dedicated to presentation. Their role is to subscribe to stores for data and render the UI accordingly. User interactions within components trigger calls to the service layer to perform actions, rather than directly manipulating state.
- **Svelte v5 best practices:**
  - **Use runes for reactivity** - Prefer `$state()`, `$derived()`, `$effect()`, and `$props()` over legacy syntax
  - **Event handlers as properties** - Use `onclick={handler}` instead of `on:click={handler}`
  - **Snippets over slots** - Use `{#snippet name()}{/snippet}` and `{@render name()}` instead of `<slot>`
  - **Component instantiation** - Use `mount(Component, options)` instead of `new Component(options)`
  - **Modern component types** - Use `Component<Props>` type instead of `SvelteComponent<Props>`
  - **Explicit bindable props** - Mark bindable props with `$bindable()` in runes mode
  - **Component callbacks** - Use callback props instead of `createEventDispatcher()`
  - **Strict HTML structure** - Ensure valid HTML structure (browser won't auto-repair in SSR)
  - **Scoped CSS awareness** - CSS now uses `:where(.svelte-hash)` for scoping
