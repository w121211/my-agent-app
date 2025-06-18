import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { Logger, ILogObj } from "tslog"
import { AIMessage, ServerAIResponseGeneratedEvent } from "./event-types.js"
import { IEventBus } from "./event-bus.js"

/**
 * Model configuration interface
 */
export interface ModelConfig {
  id: string
  displayName: string
  apiIdentifier: string
  isEnabled: boolean
  isDefault?: boolean
}

/**
 * Full list of potential models
 */
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "deepseek-v3",
    displayName: "Deepseek v3",
    apiIdentifier: "deepseek/deepseek-chat:free",
    isEnabled: true,
    isDefault: true,
  },
  {
    id: "claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    apiIdentifier: "anthropic/claude-3-5-sonnet",
    isEnabled: false,
  },
  {
    id: "claude-3-opus",
    displayName: "Claude 3 Opus",
    apiIdentifier: "anthropic/claude-3-opus",
    isEnabled: false,
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    apiIdentifier: "openai/gpt-4o",
    isEnabled: false,
  },
  {
    id: "mistral-large",
    displayName: "Mistral Large",
    apiIdentifier: "mistral/mistral-large-latest",
    isEnabled: false,
  },
]

export interface AIServiceConfig {
  openRouterApiKey: string
}

export interface GenerateResponseOptions {
  chatId: string
  modelId?: string
  systemPrompt?: string
  messageHistory?: AIMessage[]
  maxTokens?: number
  temperature?: number
  topP?: number
}

/**
 * Service for generating text using AI models via OpenRouter
 */
export class AIService {
  private readonly logger: Logger<ILogObj>
  private readonly openRouter
  private readonly enabledModels: ModelConfig[]
  private readonly defaultModelId: string
  private readonly eventBus: IEventBus

  constructor(config: AIServiceConfig, eventBus: IEventBus) {
    this.logger = new Logger({ name: "AIService" })
    this.eventBus = eventBus

    // Initialize OpenRouter with provided API key
    this.openRouter = createOpenRouter({
      apiKey: config.openRouterApiKey,
    })

    // Filter to only use enabled models
    this.enabledModels = AVAILABLE_MODELS.filter((model) => model.isEnabled)

    // Find default model or use first available
    const defaultModel =
      this.enabledModels.find((model) => model.isDefault) ||
      this.enabledModels[0]

    if (!defaultModel) {
      throw new Error("No enabled models available")
    }

    this.defaultModelId = defaultModel.id

    this.logger.info(
      `AIService initialized with default model: ${defaultModel.displayName}`
    )
  }

  /**
   * Finds a model configuration by ID
   */
  private findModel(modelId: string): ModelConfig | undefined {
    return this.enabledModels.find((model) => model.id === modelId)
  }

  /**
   * Generates a text response using the specified or default model
   */
  public async generateResponse(
    userPrompt: string,
    options: GenerateResponseOptions
  ): Promise<string> {
    // Use provided model ID or fall back to default
    const modelId = options.modelId || this.defaultModelId
    const chatId = options.chatId

    // Get model info - defaulting to the default model if the requested one doesn't exist
    const model = this.findModel(modelId)

    if (!model) {
      throw new Error(
        `Model with ID '${modelId}' not found. This is an abnormal error.`
      )
    }

    if (!options.chatId) {
      throw new Error("chatId is required for generating responses")
    }

    this.logger.debug(`Generating response with model: ${model.displayName}`)

    const openRouterModel = this.openRouter(model.apiIdentifier)
    const messageHistory = options.messageHistory
      ? options.messageHistory.filter((msg) => msg.role !== "system")
      : []

    // Add system prompt if provided
    if (options.systemPrompt) {
      messageHistory.unshift({
        role: "system",
        content: options.systemPrompt,
      })
    }

    // Add the current user prompt
    messageHistory.push({
      role: "user",
      content: userPrompt,
    })

    // Generate text using Vercel AI SDK and handle errors
    try {
      const { text } = await generateText({
        model: openRouterModel,
        messages: messageHistory,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        topP: options.topP,
      })
      // Emit ServerAIResponseGenerated event

      await this.eventBus.emit<ServerAIResponseGeneratedEvent>({
        kind: "ServerAIResponseGenerated",
        timestamp: new Date(),
        chatId,
        response: text,
      })

      return text
    } catch (error) {
      this.logger.error(
        `Error generating text with model ${model.displayName}: ${error}`
      )
      throw new Error(
        `Error generating text with model ${model.displayName}: ${error}`
      )
    }
  }
  /**
   * Gets available models for UI display
   */
  public getAvailableModels(): Array<{ id: string; displayName: string }> {
    return this.enabledModels.map((model) => ({
      id: model.id,
      displayName: model.displayName,
    }))
  }
}
