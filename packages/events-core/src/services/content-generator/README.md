# Content Generator Architecture

This implements a modern content generator architecture based on AI SDK v5 patterns as described in `content_generator_設計.md`.

## Key Design Principles

1. **Leverage AI SDK v5 Fully** - Uses `createProviderRegistry` and `streamText` patterns directly instead of reinventing the wheel
2. **Configuration-Driven** - Model settings are saved in chat metadata for session reproducibility
3. **Delayed Binding** - Provider registry is built on-demand when loading sessions
4. **Natural Error Handling** - Lets AI SDK v5's error mechanisms work naturally

## Architecture Overview

```
EnhancedChatClient
├── ProviderRegistryBuilder (builds AI SDK v5 registry from user settings)
├── EnhancedChatSession (uses streamText for content generation)
├── ChatModelConfig (session-persistent model configuration)
└── UserSettings.providers (secure provider configuration)
```

## Core Components

### `ChatModelConfig`
Stores model configuration in chat metadata for reproducibility:
```typescript
interface ChatModelConfig {
  provider: string;        // e.g., "openai", "anthropic"
  modelId: string;         // e.g., "gpt-4", "claude-3-sonnet"
  temperature?: number;    // Generation parameters
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
}
```

### `ProviderRegistryBuilder`
Creates AI SDK v5 provider registry from user settings:
```typescript
// Builds registry with enabled providers only
const registry = await ProviderRegistryBuilder.build(userSettings);

// Use with standard AI SDK v5 pattern
const model = registry.languageModel("openai:gpt-4");
```

### `EnhancedChatSession`
Session management with AI SDK v5 integration:
```typescript
// Direct streamText usage following AI SDK v5 patterns
const result = streamText({
  model: this.registry.languageModel(`${provider}:${modelId}`),
  messages: this.buildMessages(input),
  temperature: this.modelConfig.temperature,
  abortSignal: options?.signal,
});

// Process AI SDK v5 stream naturally
for await (const part of result.fullStream) {
  await this.handleStreamPart(part);
}
```

### `EnhancedChatClient`
Lifecycle management with model validation:
```typescript
// Create session with explicit model config
const sessionId = await client.createSession(
  targetDirectory,
  {
    provider: "openai",
    modelId: "gpt-4",
    temperature: 0.7,
    systemPrompt: "You are a helpful assistant.",
  },
  "Initial prompt"
);

// Natural validation using AI SDK v5
const isValid = await client.validateModelConfig(modelConfig);
```

## User Settings Integration

Provider configuration is stored securely in user settings:
```typescript
interface UserSettings {
  providers: {
    openai?: { enabled: boolean; apiKey?: string };
    anthropic?: { enabled: boolean; apiKey?: string };
    google?: { enabled: boolean; apiKey?: string };
  };
}
```

**Security Note**: API keys are stored in user settings but never in chat files or session metadata.

## Migration Path

This architecture is designed to coexist with the existing chat engine:

1. **Legacy Support**: Existing chats with `model: string` continue to work
2. **New Sessions**: Use `ChatModelConfig` objects for enhanced functionality
3. **Gradual Migration**: Services can be updated incrementally

## Usage Examples

### Basic Usage
```typescript
const client = new EnhancedChatClient(eventBus, chatRepo, userSettingsService);

// Create session with model config
const sessionId = await client.createSession("/path/to/project", {
  provider: "anthropic",
  modelId: "claude-3-sonnet",
  temperature: 0.8,
});

// Send messages
const result = await client.sendMessage(sessionId, "Hello!");
```

### Advanced Configuration
```typescript
const modelConfig: ChatModelConfig = {
  provider: "openai",
  modelId: "gpt-4-turbo",
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.95,
  systemPrompt: "You are an expert code reviewer.",
};

const sessionId = await client.createSession("/code/project", modelConfig);
```

### Model Management
```typescript
// Get available models based on user's provider configuration
const models = await client.getAvailableModels();

// Validate model configuration
const isValid = await client.validateModelConfig({
  provider: "anthropic",
  modelId: "claude-3-opus",
});
```

## Running the Demo

```bash
# Run the demo
pnpm content-generator-demo

# Or directly
npx tsx src/services/content-generator/demo.ts
```

## Future Enhancements

When AI SDK v5 is added to the project:

1. Replace mock `ProviderRegistryBuilder` with real AI SDK v5 imports
2. Replace mock `streamText` with actual AI SDK v5 function
3. Add real provider configurations (createOpenAI, createAnthropic, etc.)
4. Implement tool calling and structured output features

## Benefits Over Previous Architecture

1. **No Wheel Reinvention**: Leverages mature AI SDK v5 functionality
2. **Better Error Handling**: Natural AI SDK v5 error mechanisms
3. **Session Reproducibility**: Complete model config stored in metadata
4. **Provider Flexibility**: Easy to add new providers following AI SDK v5 patterns
5. **Type Safety**: Full TypeScript support with proper interfaces
6. **Future Proof**: Designed for AI SDK v5 patterns and capabilities