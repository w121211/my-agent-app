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
