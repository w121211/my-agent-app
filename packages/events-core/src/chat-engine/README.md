# Chat Engine Implementation

This is a complete implementation of the independent chat engine according to the `獨立Chat引擎重構方案v2_1.md` specification.

## ✅ Completed Features

### Core Architecture
- **`ChatClient`** - Main execution engine with recursive conversation flow (exactly as per gemini-cli)
- **`ChatSession`** - Session management with history, compression, and API handling
- **`Turn`** - Single turn processing with event conversion and tool call handling
- **`ContentGenerator`** - AI content generation abstraction (Google AI + Mock implementations)
- **`ChatEngineConfig`** - Unified configuration management

### Key Capabilities

#### 🔄 Recursive Conversation Logic
- Implements the exact recursive pattern from gemini-cli
- `ChatClient.sendMessageStream` calls itself recursively based on `checkNextSpeaker` results
- Supports both Chat mode (traditional Q&A) and Agent mode (autonomous conversations)

#### 🎯 Mode-Based Control
- **Chat Mode**: `checkNextSpeaker` always returns 'user' → one response then waits
- **Agent Mode**: Uses heuristic analysis to determine if model should continue → autonomous multi-turn conversations

#### 📡 Event Streaming
- Complete event system with types: `content`, `thought`, `tool_call_request`, `error`, `user_cancelled`, `max_session_turns_reached`, `chat_compressed`
- Real-time streaming of AI responses
- Proper error handling with retry indicators

#### 🛠️ Production Ready
- Full TypeScript type safety using `@google/genai` types
- Google Generative AI integration with fallback to intelligent mock responses
- Session management with turn limits and compression
- tRPC router for web integration

## 🚀 Usage

### Basic Usage
```typescript
import { ChatClient } from './core/chat-client.js';
import { ChatEngineConfig } from './config/config.js';
import type { SystemConfig, ChatConfig } from './config/types.js';
import type { ChatStreamEvent } from './events/types.js';

const config = new ChatEngineConfig(systemConfig, chatConfig);
await config.initialize();

const client = new ChatClient(config);
const sessionConfig = config.createSessionConfig('session-id', signal);

// Streaming conversation
for await (const event of client.sendMessageStream(
  'Hello!',
  chatConfig,
  sessionConfig
)) {
  if (event.type === 'content') {
    console.log(event.value);
  }
}
```

### Demo Scripts
- `pnpm chat-engine-demo` - Complete demo with mock responses
- `pnpm test-with-api` - Test with real Google Gemini API (requires GEMINI_API_KEY)

### Configuration
- Set `GEMINI_API_KEY` environment variable to use real Google AI
- Without API key, falls back to intelligent mock responses

## 📁 File Structure
```
src/chat-engine/
├── config/
│   ├── config.ts              # ChatEngineConfig class
│   └── types.ts               # Type definitions (uses @google/genai types)
├── core/
│   ├── chat-client.ts         # Main ChatClient with recursive logic
│   ├── chat-session.ts        # Session management
│   ├── turn.ts                # Single turn processing
│   ├── content-generator.ts   # AI abstraction layer
│   └── next-speaker-checker.ts # AI-driven continuation logic
├── events/
│   └── types.ts               # Stream event definitions
├── index.ts                   # Main exports
├── demo.ts                    # Demo script
└── README.md                  # This file
```

## 🔧 Integration

### tRPC Router
Located at `src/server/routers/chat-engine-router.ts`, provides:
- `sendMessageStream` - Streaming conversation endpoint
- `generateJson` - Structured output generation
- `resetChat` - Session reset

### Type Safety
All types are properly exported and use official Google Generative AI types for maximum compatibility.

## ✨ Key Innovation

The recursive conversation pattern enables seamless mode switching:

**Chat Mode Flow:**
```
User: "What is TypeScript?"
Model: "TypeScript is..."
checkNextSpeaker() → 'user' (stops, waits for user)
```

**Agent Mode Flow:**
```
User: "Help me build a web app"
Model: "I'll break this down. First..."
checkNextSpeaker() → 'model' (continues)
Fake User: "Please continue."
Model: "Now for the backend..."
checkNextSpeaker() → 'model' (continues)
...continues until stop condition or limit...
```

This provides natural autonomous behavior while maintaining full control over conversation flow.