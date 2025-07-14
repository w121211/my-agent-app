// packages/events-core/src/chat-engine/config/config.ts

import type {
  SystemConfig,
  ChatConfig,
  SessionConfig
} from './types.js';
import type { ContentGenerator } from '../core/content-generator.js';
import { GoogleAIContentGenerator, MockContentGenerator } from '../core/content-generator.js';

export class ChatEngineConfig {
  private contentGenerator?: ContentGenerator;

  constructor(
    private systemConfig: SystemConfig,
    private chatConfig: ChatConfig
  ) {}

  async initialize(): Promise<void> {
    if (this.systemConfig.apiKey && 
        this.systemConfig.apiKey !== 'mock-api-key' && 
        this.systemConfig.authType === 'api-key') {
      try {
        this.contentGenerator = new GoogleAIContentGenerator(this.systemConfig.apiKey);
      } catch (error) {
        console.warn('Failed to initialize Google AI, falling back to mock:', error);
        this.contentGenerator = new MockContentGenerator();
      }
    } else {
      this.contentGenerator = new MockContentGenerator();
    }
  }

  getContentGenerator(): ContentGenerator {
    if (!this.contentGenerator) {
      throw new Error('ChatEngineConfig not initialized. Call initialize() first.');
    }
    return this.contentGenerator;
  }

  getSystemConfig(): SystemConfig {
    return { ...this.systemConfig };
  }

  getChatConfig(): ChatConfig {
    return { ...this.chatConfig };
  }

  createSessionConfig(correlationId: string, abortSignal: AbortSignal): SessionConfig {
    return {
      correlationId,
      abortSignal
    };
  }
}