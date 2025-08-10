// packages/events-core/src/services/chat-engine/types.ts

import type { Provider } from "ai";

// Model registry for available AI models
export interface ModelRegistry {
  provider: Provider;
  availableModels: string[];
  metadata?: {
    displayName: string;
    capabilities: string[];
    defaultModel?: string;
  };
}
