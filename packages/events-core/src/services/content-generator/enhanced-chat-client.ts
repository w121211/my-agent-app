// packages/events-core/src/services/content-generator/enhanced-chat-client.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../../event-bus.js";
import type { ChatRepository } from "../chat-repository.js";
import type { UserSettingsService } from "../user-settings-service.js";
import { ProviderRegistryBuilder } from "./provider-registry-builder.js";
import { EnhancedChatSession } from "./enhanced-chat-session.js";
import type { ChatModelConfig, AvailableModel, TurnInput, ConversationResult } from "./types.js";
import type { SerializableChat, ChatMode } from "../chat-engine/chat-session.js";

export class EnhancedChatClient {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatRepository: ChatRepository;
  private readonly userSettingsService: UserSettingsService;
  private currentChatSession: EnhancedChatSession | null = null;

  constructor(
    eventBus: IEventBus,
    chatRepository: ChatRepository,
    userSettingsService: UserSettingsService,
  ) {
    this.logger = new Logger({ name: "EnhancedChatClient" });
    this.eventBus = eventBus;
    this.chatRepository = chatRepository;
    this.userSettingsService = userSettingsService;
  }

  async createSession(
    targetDirectory: string,
    modelConfig: ChatModelConfig,
    prompt?: string,
  ): Promise<string> {
    const userSettings = await this.userSettingsService.getUserSettings();
    const registry = await ProviderRegistryBuilder.build(userSettings);

    const chatData = {
      id: uuidv4(),
      absoluteFilePath: '',
      messages: [],
      status: 'idle' as const,
      fileStatus: 'ACTIVE' as const,
      currentTurn: 0,
      maxTurns: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        model: modelConfig,
        title: "New Enhanced Chat",
        mode: "chat" as ChatMode,
        knowledge: [],
      },
    };

    // Create chat object using repository
    const persistedChat = await this.chatRepository.createChat(
      {
        ...chatData,
        status: "ACTIVE",
      },
      targetDirectory,
    );

    // Create EnhancedChatSession instance
    this.currentChatSession = new EnhancedChatSession(
      {
        ...chatData,
        absoluteFilePath: persistedChat.absoluteFilePath,
      },
      this.eventBus,
      registry,
    );

    // If initial prompt is provided, send it
    if (prompt) {
      await this.sendMessage(this.currentChatSession.id, prompt);
    }

    return this.currentChatSession.id;
  }

  async loadSession(chatId: string): Promise<void> {
    const persistedChat = await this.chatRepository.findById(chatId);
    if (!persistedChat) {
      throw new Error(`Chat not found with ID: ${chatId}`);
    }

    const userSettings = await this.userSettingsService.getUserSettings();
    const registry = await ProviderRegistryBuilder.build(userSettings);

    this.currentChatSession = EnhancedChatSession.fromJSON(
      {
        id: persistedChat.id,
        absoluteFilePath: persistedChat.absoluteFilePath,
        messages: persistedChat.messages,
        status: "idle",
        fileStatus: persistedChat.status,
        currentTurn: 0,
        maxTurns: 20,
        createdAt: persistedChat.createdAt,
        updatedAt: persistedChat.updatedAt,
        metadata: persistedChat.metadata,
      },
      this.eventBus,
      registry,
    );
  }

  async sendMessage(
    chatId: string,
    message: string,
    attachments?: Array<{ fileName: string; content: string }>,
  ): Promise<ConversationResult> {
    const chatSession = await this.getSession(chatId);

    if (chatSession.status !== "idle") {
      throw new Error(
        `Chat session is currently ${chatSession.status}. Cannot send message.`,
      );
    }

    const userInput: TurnInput = {
      type: "user_message",
      content: message,
      attachments,
    };

    const result = await chatSession.runTurn(userInput);

    // Save session after turn
    await this.saveSession();

    return result;
  }

  async getSession(chatId: string): Promise<EnhancedChatSession> {
    if (!this.currentChatSession || this.currentChatSession.id !== chatId) {
      await this.loadSession(chatId);
    }
    return this.currentChatSession!;
  }

  async saveSession(): Promise<void> {
    if (!this.currentChatSession) throw new Error("No active session");

    const chatData = this.currentChatSession.toJSON();
    await this.chatRepository.updateMetadata(
      chatData.absoluteFilePath,
      chatData.metadata || {},
    );
  }

  async getAvailableModels(): Promise<AvailableModel[]> {
    const userSettings = await this.userSettingsService.getUserSettings();
    const registry = await ProviderRegistryBuilder.build(userSettings);

    return this.buildAvailableModelsList(userSettings);
  }

  async validateModelConfig(modelConfig: ChatModelConfig): Promise<boolean> {
    try {
      const userSettings = await this.userSettingsService.getUserSettings();
      const registry = await ProviderRegistryBuilder.build(userSettings);

      // Attempt to create model, AI SDK v5 will naturally validate
      const model = registry.languageModel(
        `${modelConfig.provider}:${modelConfig.modelId}`,
      );

      return true;
    } catch {
      return false;
    }
  }

  private buildAvailableModelsList(userSettings: any): AvailableModel[] {
    const models: AvailableModel[] = [];

    if (userSettings.providers.openai?.enabled) {
      models.push(
        {
          id: 'openai:gpt-4',
          provider: 'openai',
          modelId: 'gpt-4',
          displayName: 'GPT-4',
          capabilities: ['text', 'tools'],
        },
        {
          id: 'openai:gpt-4-turbo',
          provider: 'openai',
          modelId: 'gpt-4-turbo',
          displayName: 'GPT-4 Turbo',
          capabilities: ['text', 'tools', 'vision'],
        },
      );
    }

    if (userSettings.providers.anthropic?.enabled) {
      models.push(
        {
          id: 'anthropic:claude-3-sonnet',
          provider: 'anthropic',
          modelId: 'claude-3-sonnet',
          displayName: 'Claude 3 Sonnet',
          capabilities: ['text', 'tools', 'vision'],
        },
        {
          id: 'anthropic:claude-3-opus',
          provider: 'anthropic',
          modelId: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
          capabilities: ['text', 'tools', 'vision'],
        },
      );
    }

    if (userSettings.providers.google?.enabled) {
      models.push(
        {
          id: 'google:gemini-pro',
          provider: 'google',
          modelId: 'gemini-pro',
          displayName: 'Gemini Pro',
          capabilities: ['text', 'tools'],
        },
      );
    }

    return models;
  }
}