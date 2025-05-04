import { AIService, GenerateResponseOptions } from "../src/ai-service.js"
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import {
  AIMessage,
  ServerAIResponseGeneratedEvent,
} from "../src/event-types.js"
import { IEventBus } from "../src/event-bus.js"

// Mock dependencies
jest.mock("ai", () => ({
  generateText: jest.fn(),
}))

jest.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: jest.fn().mockImplementation(() => {
    return () => "mocked-openrouter-model"
  }),
}))

describe("AIService", () => {
  // Test configuration
  const mockConfig = {
    openRouterApiKey: "test-api-key",
  }

  // Mock event bus
  const mockEventBus: jest.Mocked<IEventBus> = {
    emit: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue(() => {}),
    subscribeToAllClientEvents: jest.fn().mockReturnValue(() => {}),
    subscribeToAllServerEvents: jest.fn().mockReturnValue(() => {}),
    unsubscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
    hasHandlers: jest.fn().mockReturnValue(false),
    getHandlerCount: jest.fn().mockReturnValue(0),
    clear: jest.fn(),
  }

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
    ;(generateText as jest.Mock).mockResolvedValue({
      text: "Generated response",
    })
  })

  describe("constructor", () => {
    it("should initialize with default model when valid config provided", () => {
      const service = new AIService(mockConfig, mockEventBus)

      // Verify OpenRouter was initialized with correct API key
      expect(createOpenRouter).toHaveBeenCalledWith({
        apiKey: "test-api-key",
      })

      // Verify models were set up correctly
      const models = service.getAvailableModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.some((model) => model.id === "deepseek-v3")).toBeTruthy()
    })

    it("should throw error when no enabled models available", () => {
      // Mock the case where no models are enabled
      jest.spyOn(Array.prototype, "filter").mockReturnValueOnce([])

      expect(() => new AIService(mockConfig, mockEventBus)).toThrow(
        "No enabled models available"
      )
    })
  })

  describe("generateResponse", () => {
    let service: AIService
    const testChatId = "test-chat-id"

    // Default mock implementation that will be used for most tests
    const defaultMockImplementation = () => {
      return () => "mocked-openrouter-model"
    }

    beforeEach(() => {
      // Reset to default mock implementation before each test
      ;(createOpenRouter as jest.Mock).mockImplementation(
        defaultMockImplementation
      )
      service = new AIService(mockConfig, mockEventBus)
    })

    it("should generate text with default model when no model specified", async () => {
      const result = await service.generateResponse("Hello", {
        chatId: testChatId,
      })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mocked-openrouter-model",
          messages: [{ role: "user", content: "Hello" }],
        })
      )
      expect(result).toBe("Generated response")
    })

    it("should generate text with specified model when model is provided", async () => {
      // Create a mapping between model identifiers and their mock results
      const modelIdentifierMap: Record<string, string> = {
        "deepseek/deepseek-chat:free": "mocked-deepseek-model",
        "anthropic/claude-3-5-sonnet": "mocked-claude-model",
        "openai/gpt-4o": "mocked-gpt4o-model",
      }

      // Create a mock that returns different values based on the model identifier
      ;(createOpenRouter as jest.Mock).mockImplementation(() => {
        return (modelIdentifier: string) => {
          return modelIdentifierMap[modelIdentifier] || "unknown-model"
        }
      })

      // Reinitialize service with our enhanced mock
      service = new AIService(mockConfig, mockEventBus)

      // Test with deepseek-v3 model (non-default for this test)
      await service.generateResponse("Hello", {
        chatId: testChatId,
        modelId: "deepseek-v3",
      })

      // Verify the correct mock model was passed to generateText
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mocked-deepseek-model", // Should match our mapping
          messages: [{ role: "user", content: "Hello" }],
        })
      )
    })

    it("should include message history when provided", async () => {
      const messageHistory: AIMessage[] = [
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant message" },
      ]

      await service.generateResponse("Hello", {
        chatId: testChatId,
        messageHistory,
      })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: "User message" },
            { role: "assistant", content: "Assistant message" },
            { role: "user", content: "Hello" },
          ],
        })
      )
    })

    it("should handle system role in message history", async () => {
      const messageHistory: AIMessage[] = [
        { role: "system", content: "System instruction" },
        { role: "user", content: "User message" },
      ]

      await service.generateResponse("Hello", {
        chatId: testChatId,
        messageHistory,
      })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: "User message" },
            { role: "user", content: "Hello" },
          ],
        })
      )
    })

    it("should prepend system prompt to message history when provided", async () => {
      await service.generateResponse("Hello", {
        chatId: testChatId,
        systemPrompt: "You are a helpful assistant",
      })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: "You are a helpful assistant" },
            { role: "user", content: "Hello" },
          ],
        })
      )
    })

    it("should throw error when invalid model ID is provided", async () => {
      await expect(
        service.generateResponse("Hello", {
          chatId: testChatId,
          modelId: "non-existent-model",
        })
      ).rejects.toThrow("Model with ID 'non-existent-model' not found")
    })

    it("should pass generation parameters when provided", async () => {
      const options: GenerateResponseOptions = {
        chatId: testChatId,
        maxTokens: 100,
        temperature: 0.7,
        topP: 0.9,
      }

      await service.generateResponse("Hello", options)

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 100,
          temperature: 0.7,
          topP: 0.9,
          messages: [{ role: "user", content: "Hello" }],
        })
      )
    })

    it("should emit ServerAIResponseGenerated event after generating response", async () => {
      await service.generateResponse("Hello", { chatId: testChatId })

      expect(mockEventBus.emit).toHaveBeenCalledTimes(1)
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ServerAIResponseGeneratedEvent>>({
          kind: "ServerAIResponseGenerated",
          chatId: testChatId,
          response: "Generated response",
          timestamp: expect.any(Date),
        })
      )
    })

    it("should throw error when chatId parameter is missing", async () => {
      // @ts-expect-error - Testing missing required parameter
      await expect(service.generateResponse("Hello", {})).rejects.toThrow(
        "chatId is required for generating responses"
      )

      // Verify that no event was emitted
      expect(mockEventBus.emit).not.toHaveBeenCalled()
    })

    it("should handle API errors properly using try/catch", async () => {
      // Mock generateText to throw an error
      ;(generateText as jest.Mock).mockRejectedValueOnce(
        new Error("API connection error")
      )

      // Get available models and ensure we have at least one
      const models = service.getAvailableModels()
      expect(models.length).toBeGreaterThan(0) // This should always pass based on our test setup

      // Set up a variable to capture the model name for verification
      const modelName = models[0]?.displayName || "Unknown Model"

      // Attempt to generate a response
      await expect(
        service.generateResponse("Hello", { chatId: testChatId })
      ).rejects.toThrow(
        `Error generating text with model ${modelName}: Error: API connection error`
      )

      // Verify that no event was emitted since the API call failed
      expect(mockEventBus.emit).not.toHaveBeenCalled()
    })
  })

  describe("getAvailableModels", () => {
    it("should return only enabled models with id and displayName", () => {
      const service = new AIService(mockConfig, mockEventBus)
      const models = service.getAvailableModels()

      // Check if returned models have the expected properties
      expect(
        models.every((model) => "id" in model && "displayName" in model)
      ).toBeTruthy()

      // Since the code only enables the Deepseek model by default
      expect(models.length).toBe(1)
      expect(models[0]!.id).toBe("deepseek-v3")
      expect(models[0]!.displayName).toBe("Deepseek v3")
    })
  })
})
