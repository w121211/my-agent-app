import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { Logger, ILogObj } from "tslog"
import { AIMessage } from "./event-types.js"

/**
 * Model configuration interface
 */
export interface ModelConfig {
  id: string // Internal ID used for selection
  displayName: string // Name shown to users
  apiIdentifier: string // Model name used with OpenRouter
  isEnabled: boolean // Whether this model is available for selection
  isDefault?: boolean // Whether this is the default model
}

/**
 * Full list of potential models - for MVP, only the first one is enabled
 * To add more models in the future, just mark them as enabled (isEnabled: true)
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
  // Add more models here in the future as needed
]

export interface AIAdapterConfig {
  openRouterApiKey: string
  //   customHeaders?: Record<string, string>
}

export interface GenerateResponseOptions {
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
export class AIAdapter {
  private readonly logger: Logger<ILogObj>
  private readonly openRouter
  private readonly enabledModels: ModelConfig[]
  private readonly defaultModelId: string

  constructor(config: AIAdapterConfig) {
    this.logger = new Logger({ name: "AIAdapter" })

    // Initialize OpenRouter with provided API key and optional custom headers
    this.openRouter = createOpenRouter({
      apiKey: config.openRouterApiKey,
      //   headers: config.customHeaders,
    })

    // For MVP: Filter to only use enabled models
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
      `AIAdapter initialized with default model: ${defaultModel.displayName}`
    )
  }

  /**
   * Converts ChatMessage objects to the format expected by Vercel AI SDK
   */
  // prettier-ignore
  //   private convertMessagesToAIFormat(messages: AIMessage[]) {
  //     return messages.map((message) => {
  //       const role: "user" | "assistant" | "system" =
  //         message.role === "USER" ? "user" : message.role === "ASSISTANT" ? "assistant" : "system"

  //       return {
  //         role,
  //         content: message.content,
  //       }
  //     })
  //   }

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
    options: GenerateResponseOptions = {}
  ): Promise<string> {
    // Use provided model ID or fall back to default
    const modelId = options.modelId || this.defaultModelId

    // Get model info - defaulting to the default model if the requested one doesn't exist
    const model = this.findModel(modelId)

    if (!model) {
      throw new Error(
        `Model with ID '${modelId}' not found. This is an abnormal error.`
      )
    }

    this.logger.debug(`Generating response with model: ${model.displayName}`)

    const openRouterModel = this.openRouter(model.apiIdentifier)
    const messageHistory = options.messageHistory || []
    // const formattedMessages = this.convertMessagesToAIFormat(messages)

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

    // Generate text using Vercel AI SDK
    const { text } = await generateText({
      model: openRouterModel,
      messages: messageHistory,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    })

    return text
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
