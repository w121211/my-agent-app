// packages/events-core/src/chat-engine/core/content-generator.ts

import type {
  Content,
  GenerateContentResponse,
  GenerateContentConfig,
  GenerateContentParameters,
  SchemaUnion,
} from "../config/types.js";
import { GoogleGenAI } from "@google/genai";

export interface ContentGenerator {
  generateContentStream(
    model: string,
    contents: Content[],
    config: GenerateContentConfig,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  generateJson(
    contents: Content[],
    schema: SchemaUnion,
    signal: AbortSignal,
    config?: GenerateContentConfig,
  ): Promise<Record<string, unknown>>;
}

export class GoogleAIContentGenerator implements ContentGenerator {
  private models: any;

  constructor(apiKey: string) {
    const genAI = new GoogleGenAI({ apiKey });
    this.models = genAI.models;
  }

  async generateContentStream(
    model: string,
    contents: Content[],
    config: GenerateContentConfig,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const genRequest: GenerateContentParameters = {
      model,
      contents,
      config: {
        temperature: config.temperature,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
        systemInstruction: config.systemInstruction,
      },
    };

    return this.models.generateContentStream(genRequest);
  }

  async generateJson(
    contents: Content[],
    schema: SchemaUnion,
    signal: AbortSignal,
    config?: GenerateContentConfig,
  ): Promise<Record<string, unknown>> {
    const genRequest: GenerateContentParameters = {
      model: "gemini-2.0-flash",
      contents,
      config: {
        temperature: config?.temperature || 0,
        topP: config?.topP,
        maxOutputTokens: config?.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: config?.systemInstruction,
      },
    };

    const result = await this.models.generateContent(genRequest);
    const text = result.response.text();
    return JSON.parse(text);
  }
}

export class MockContentGenerator implements ContentGenerator {
  async generateContentStream(
    model: string,
    contents: Content[],
    config: GenerateContentConfig,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const self = this;
    return (async function* () {
      // Simulate streaming response with multiple chunks
      const responses = self.getMockResponses(contents);

      for (const text of responses) {
        // Create a properly structured GenerateContentResponse
        const mockResponseData = {
          text: () => text,
          data: {
            candidates: [
              {
                content: {
                  role: "model",
                  parts: [{ text }],
                },
                finishReason: "STOP",
              },
            ],
          },
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text }],
              },
              finishReason: "STOP",
            },
          ],
          functionCalls: [],
          executableCode: [],
          codeExecutionResult: undefined,
        };
        
        const response = mockResponseData as unknown as GenerateContentResponse;

        yield response;

        // Add small delay to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    })();
  }

  async generateJson(
    contents: Content[],
    schema: SchemaUnion,
    signal: AbortSignal,
    config?: GenerateContentConfig,
  ): Promise<Record<string, unknown>> {
    // Generate mock JSON that matches the schema structure
    return {
      name: "Alex Johnson",
      age: 28,
      skills: ["TypeScript", "React", "Node.js", "Python"],
      experience_years: 5,
    };
  }

  private getMockResponses(contents: Content[]): string[] {
    const lastMessage = contents[contents.length - 1];
    const userText = lastMessage?.parts?.[0]?.text?.toLowerCase() || "";

    if (userText.includes("typescript")) {
      return [
        "TypeScript is a programming language developed by Microsoft. ",
        "It builds on JavaScript by adding static type definitions. ",
        "This helps catch errors early and makes code more maintainable. ",
        "TypeScript compiles to plain JavaScript and runs anywhere JavaScript runs.",
      ];
    }

    if (userText.includes("example")) {
      return [
        "Here's a simple TypeScript example:\n\n",
        "```typescript\n",
        "interface User {\n",
        "  name: string;\n",
        "  age: number;\n",
        "}\n\n",
        "const user: User = {\n",
        '  name: "Alice",\n',
        "  age: 30\n",
        "};\n",
        "```\n\n",
        "This shows how TypeScript provides type safety!",
      ];
    }

    if (userText.includes("web application")) {
      return [
        "Building a web application involves several key steps. ",
        "First, I'll outline the main components you need. ",
        "Then I'll explain the development process. ",
        "Let me break this down systematically:\n\n",
        "1. **Frontend**: User interface (React, Vue, or Angular)\n",
        "2. **Backend**: Server logic (Node.js, Python, or Java)\n",
        "3. **Database**: Data storage (PostgreSQL, MongoDB)\n",
        "4. **Deployment**: Hosting and CI/CD\n\n",
        "Next, I'll detail each component and how they work together.",
      ];
    }

    return [
      "I understand your question. ",
      "Let me provide a helpful response. ",
      "This is a mock response for demonstration purposes.",
    ];
  }
}
