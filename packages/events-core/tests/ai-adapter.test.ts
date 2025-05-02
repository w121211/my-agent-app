import { AIService, GenerateResponseOptions } from "../src/ai-adapter.js"
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { AIMessage } from "../src/event-types.js"

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

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
    ;(generateText as jest.Mock).mockResolvedValue({
      text: "Generated response",
    })
  })

  describe("constructor", () => {
    it("should initialize with default model when valid config provided", () => {
      const adapter = new AIService(mockConfig)

      // Verify OpenRouter was initialized with correct API key
      expect(createOpenRouter).toHaveBeenCalledWith({
        apiKey: "test-api-key",
      })

      // Verify models were set up correctly
      const models = adapter.getAvailableModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.some((model) => model.id === "deepseek-v3")).toBeTruthy()
    })

    it("should throw error when no enabled models available", () => {
      // Mock the case where no models are enabled
      jest.spyOn(Array.prototype, "filter").mockReturnValueOnce([])

      expect(() => new AIService(mockConfig)).toThrow(
        "No enabled models available"
      )
    })
  })

  describe("generateResponse", () => {
    let adapter: AIService

    beforeEach(() => {
      adapter = new AIService(mockConfig)
    })

    it("should generate text with default model when no model specified", async () => {
      const result = await adapter.generateResponse("Hello")

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mocked-openrouter-model",
          messages: [{ role: "user", content: "Hello" }],
        })
      )
      expect(result).toBe("Generated response")
    })

    it("should generate text with specified model when model is provided", async () => {
      await adapter.generateResponse("Hello", { modelId: "deepseek-v3" })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mocked-openrouter-model",
          messages: [{ role: "user", content: "Hello" }],
        })
      )
    })

    it("should include message history when provided", async () => {
      const messageHistory: AIMessage[] = [
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant message" },
      ]

      await adapter.generateResponse("Hello", { messageHistory })

      // In the updated adapter, the messageHistory is used directly without conversion
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

      await adapter.generateResponse("Hello", { messageHistory })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: "System instruction" },
            { role: "user", content: "User message" },
            { role: "user", content: "Hello" },
          ],
        })
      )
    })

    it("should prepend system prompt to message history when provided", async () => {
      await adapter.generateResponse("Hello", {
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
        adapter.generateResponse("Hello", { modelId: "non-existent-model" })
      ).rejects.toThrow("Model with ID 'non-existent-model' not found")
    })

    it("should pass generation parameters when provided", async () => {
      const options: GenerateResponseOptions = {
        maxTokens: 100,
        temperature: 0.7,
        topP: 0.9,
      }

      await adapter.generateResponse("Hello", options)

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 100,
          temperature: 0.7,
          topP: 0.9,
          messages: [{ role: "user", content: "Hello" }],
        })
      )
    })
  })

  describe("getAvailableModels", () => {
    it("should return only enabled models with id and displayName", () => {
      const adapter = new AIService(mockConfig)
      const models = adapter.getAvailableModels()

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
