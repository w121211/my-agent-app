# File References Demo Examples

This directory contains demo examples for testing the File References (@syntax) backend implementation.

## Available Demos

### 1. `message-processing-demo` ✅ (No server required)
Tests the core message processing utilities in isolation.

```bash
pnpm message-processing-demo
```

**What it tests:**
- `extractFileReferences()` function
- `processFileReferences()` function  
- `processInputDataPlaceholders()` function
- Edge cases and performance

### 2. `file-references-unit-test` ✅ (No server required)
Tests the File References implementation without requiring a running tRPC server.

```bash
pnpm file-references-unit-test
```

**What it tests:**
- Service initialization
- ProjectFolderService.searchFilesInProject()
- ChatService file reference processing
- Error handling for missing projects/files

### 3. `file-references-demo` (Requires server)
Comprehensive end-to-end testing of the complete File References feature via tRPC API.

```bash
# Terminal 1: Start the server
pnpm trpc-server

# Terminal 2: Run the demo
pnpm file-references-demo
```

**What it tests:**
- File search API (`projectFolder.searchFiles`)
- Chat message processing with file references
- Fuzzy search capabilities
- Edge cases and complex scenarios
- Multiple file references in single message

### 4. `file-search-test` (Requires server)
Simple test focused specifically on file search functionality.

```bash
# Terminal 1: Start the server
pnpm trpc-server

# Terminal 2: Run the test
pnpm file-search-test
```

**What it tests:**
- Basic file search API
- Fuzzy search with different queries
- Search result formatting

## Server-based Demo Usage

For demos that require the tRPC server:

1. **Start the server** (keep running in one terminal):
   ```bash
   pnpm trpc-server
   ```
   Wait for: `Server listening on http://localhost:3333`

2. **Add a project folder** (if none exist):
   The server needs at least one project folder to test file search. You can add the current events-core directory:
   ```bash
   # The server logs will show if project folders exist
   # If none exist, you'll see: "No project folders configured"
   ```

3. **Run the demo** in another terminal:
   ```bash
   pnpm file-references-demo
   ```

## Implementation Status

### ✅ Completed Backend Components

1. **Message Processing Utilities** (`src/services/message-processing-utils.ts`)
   - Pure functions for file reference extraction and processing
   - Handles @filename syntax conversion to structured format
   - Future-ready for {{variable}} syntax

2. **ProjectFolderService Extensions** (`src/services/project-folder-service.ts`)
   - `searchFilesInProject()` with fuzzy search using fuzzysort
   - Efficient file tree traversal and filtering
   - Project-scoped search with security boundaries

3. **ChatService Enhancements** (`src/services/chat-service.ts`)
   - File reference processing in `submitMessage()`
   - Dual message storage (raw + processed)
   - Integration with FileService for content loading

4. **tRPC API Extensions** (`src/server/routers/project-folder-router.ts`)
   - `searchFiles` endpoint with full type safety
   - Input validation and error handling

### 🎯 Ready for Frontend Integration

The backend provides these APIs for frontend use:

```typescript
// File search
await client.projectFolder.searchFiles.query({
  query: "package",
  projectId: "project-id",
  limit: 20
});

// Chat with file references
await client.chat.submitMessage.mutate({
  chatId: "chat-id", 
  message: "Please review @package.json"
});
```

### 🔧 Data Flow

```
Frontend @ Input
    ↓
searchFiles API → ProjectFolderService.searchFilesInProject()
    ↓
User sends message → ChatService.submitMessage()
    ↓
Extract @references → Load file contents → Process to <file>content</file>
    ↓
Store raw message (for editing) + Send processed message (to AI)
```

## Testing Different Scenarios

The demos test various file reference patterns:

- `@package.json` - Single file reference
- `@src/file.ts` - Nested path reference  
- `@file1.txt @file2.js` - Multiple references
- `@missing.txt` - Non-existent file (graceful failure)
- `@@double.txt` - Edge cases
- `email@domain.com` - False positives

## Troubleshooting

**"fetch failed" errors**: Make sure the tRPC server is running on localhost:3333

**"No project folders found"**: Add a project folder through the tRPC API or configure user settings

**TypeScript errors**: Run `pnpm check-types` to verify implementation (note: test files may have legacy errors)

**File not found errors**: Expected behavior - missing files keep @filename syntax instead of processing