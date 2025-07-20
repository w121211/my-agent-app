// packages/events-core/src/services/content-generator/provider-registry-builder.ts
import type { UserSettings } from "../user-settings-repository.js";

export interface ProviderRegistry {
  languageModel(modelId: string): any;
  textEmbeddingModel(modelId: string): any;
  imageModel(modelId: string): any;
}

export class ProviderRegistryBuilder {
  static async build(userSettings: UserSettings): Promise<ProviderRegistry> {
    const providers: Record<string, any> = {};

    // Note: For now creating a mock registry since AI SDK v5 isn't installed yet
    // In a real implementation, this would use createProviderRegistry from 'ai'
    // and provider-specific imports like createOpenAI, createAnthropic, etc.

    const mockProvider = {
      languageModel: (modelId: string) => ({
        modelId,
        provider: 'mock',
        generate: async () => ({ text: 'Mock response' }),
        stream: async function* () { yield { text: 'Mock stream' }; },
      }),
      textEmbeddingModel: (modelId: string) => ({
        modelId,
        embed: async () => [0.1, 0.2, 0.3],
      }),
      imageModel: (modelId: string) => ({
        modelId,
        generate: async () => ({ url: 'mock-image.jpg' }),
      }),
    };

    // Add providers based on user settings
    if (userSettings.providers.openai?.enabled && userSettings.providers.openai.apiKey) {
      providers.openai = mockProvider;
    }

    if (userSettings.providers.anthropic?.enabled && userSettings.providers.anthropic.apiKey) {
      providers.anthropic = mockProvider;
    }

    if (userSettings.providers.google?.enabled && userSettings.providers.google.apiKey) {
      providers.google = mockProvider;
    }

    return {
      languageModel: (modelId: string) => {
        const [provider, model] = modelId.split(':');
        if (!providers[provider]) {
          throw new Error(`Provider '${provider}' not available or not configured`);
        }
        return providers[provider].languageModel(model);
      },
      textEmbeddingModel: (modelId: string) => {
        const [provider, model] = modelId.split(':');
        if (!providers[provider]) {
          throw new Error(`Provider '${provider}' not available or not configured`);
        }
        return providers[provider].textEmbeddingModel(model);
      },
      imageModel: (modelId: string) => {
        const [provider, model] = modelId.split(':');
        if (!providers[provider]) {
          throw new Error(`Provider '${provider}' not available or not configured`);
        }
        return providers[provider].imageModel(model);
      },
    };
  }
}