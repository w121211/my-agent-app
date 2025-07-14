// packages/events-core/src/chat-engine/core/chat-session.ts

import type {
  Content,
  GenerateContentResponse,
  GenerateContentConfig,
  ChatConfig,
  SystemConfig,
  SchemaUnion
} from '../config/types.js';
import type { ContentGenerator } from './content-generator.js';
import type { ChatCompressionInfo } from '../events/types.js';

export class ChatSession {
  private sendPromise: Promise<void> = Promise.resolve();
  private history: Content[] = [];
  private debugResponses: GenerateContentResponse[] = [];

  constructor(
    private contentGenerator: ContentGenerator,
    private config: ChatConfig,
    private systemConfig: SystemConfig,
    initialHistory?: Content[]
  ) {
    if (initialHistory) {
      this.history = [...initialHistory];
    }
  }

  async *sendMessageStream(
    message: string,
    signal: AbortSignal
  ): AsyncGenerator<GenerateContentResponse> {
    await this.sendPromise;

    const userContent = this.createUserContent(message);
    const requestContents = this.prepareRequestContents(userContent);

    if (this.systemConfig.debugMode) {
      await this.logApiRequest(requestContents);
    }

    const startTime = Date.now();

    try {
      const stream = await this.executeGenerationWithRetry(
        requestContents,
        signal
      );

      yield* this.processResponseStream(stream, userContent, startTime, signal);

    } catch (error) {
      if (this.systemConfig.debugMode) {
        this.logApiError(Date.now() - startTime, error);
      }

      this.sendPromise = Promise.resolve();
      throw error;
    }
  }

  async generateJson(
    message: string,
    schema: SchemaUnion,
    signal: AbortSignal
  ): Promise<Record<string, unknown>> {
    await this.sendPromise;

    const userContent = this.createUserContent(message);
    const requestContents = this.prepareRequestContents(userContent);

    const result = await this.contentGenerator.generateJson(
      requestContents,
      schema,
      signal,
      this.buildGenerationConfig()
    );

    this.addToHistory(userContent);
    this.addToHistory({
      role: 'model',
      parts: [{ text: JSON.stringify(result, null, 2) }]
    });

    return result;
  }

  getHistory(curated: boolean = false): Content[] {
    if (curated) {
      return this.extractCuratedHistory([...this.history]);
    }
    return [...this.history];
  }

  addToHistory(content: Content): void {
    this.history.push(content);
  }

  setHistory(history: Content[]): void {
    this.history = [...history];
  }

  clearHistory(): void {
    this.history = [];
  }

  async compressHistory(
    force: boolean = false
  ): Promise<ChatCompressionInfo | null> {
    const curatedHistory = this.getHistory(true);

    if (curatedHistory.length === 0) {
      return null;
    }

    return null;
  }

  getDebugResponses(): GenerateContentResponse[] {
    return [...this.debugResponses];
  }

  private createUserContent(message: string): Content {
    return {
      role: 'user',
      parts: [{ text: message }]
    };
  }

  private prepareRequestContents(userContent: Content): Content[] {
    return [...this.history, userContent];
  }

  private buildGenerationConfig(): GenerateContentConfig {
    return {
      temperature: this.config.temperature,
      topP: this.config.topP,
      maxOutputTokens: this.config.maxTokens,
      systemInstruction: this.config.systemPrompt ? 
        { text: this.config.systemPrompt } : undefined,
    };
  }

  private async executeGenerationWithRetry(
    contents: Content[],
    signal: AbortSignal
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.contentGenerator.generateContentStream(
      this.config.model,
      contents,
      {
        ...this.buildGenerationConfig(),
        abortSignal: signal,
      }
    );
  }

  private async *processResponseStream(
    stream: AsyncGenerator<GenerateContentResponse>,
    inputContent: Content,
    startTime: number,
    signal: AbortSignal
  ): AsyncGenerator<GenerateContentResponse> {
    const outputContent: Content[] = [];
    let errorOccurred = false;

    try {
      for await (const chunk of stream) {
        if (signal.aborted) break;

        this.debugResponses.push(chunk);

        if (this.isValidResponse(chunk)) {
          const content = chunk.candidates?.[0]?.content;
          if (content && !this.isThoughtContent(content)) {
            outputContent.push(content);
          }
        }

        yield chunk;
      }
    } catch (error) {
      errorOccurred = true;
      if (this.systemConfig.debugMode) {
        this.logApiError(Date.now() - startTime, error);
      }
      throw error;
    }

    if (!errorOccurred) {
      this.recordHistory(inputContent, outputContent);

      if (this.systemConfig.debugMode) {
        await this.logApiResponse(Date.now() - startTime);
      }
    }
  }

  private recordHistory(userInput: Content, modelOutput: Content[]): void {
    this.history.push(userInput);

    if (modelOutput.length > 0) {
      const consolidatedOutput = this.consolidateModelOutput(modelOutput);
      this.history.push(...consolidatedOutput);
    }
  }

  private consolidateModelOutput(outputs: Content[]): Content[] {
    if (outputs.length === 0) return [];
    if (outputs.length === 1) return outputs;

    const allParts: any[] = [];
    for (const output of outputs) {
      if (output.parts) {
        allParts.push(...output.parts);
      }
    }

    return [{
      role: 'model',
      parts: allParts
    }];
  }

  private extractCuratedHistory(history: Content[]): Content[] {
    return history.filter(content => 
      content.parts && 
      content.parts.length > 0 &&
      content.parts.some(part => part.text || part.functionCall || part.functionResponse)
    );
  }

  private isValidResponse(response: GenerateContentResponse): boolean {
    return !!(
      response.candidates?.length &&
      response.candidates[0]?.content?.parts?.length
    );
  }

  private isThoughtContent(content: Content): boolean {
    return !!(
      content.parts?.length &&
      content.parts[0]?.thought === true
    );
  }

  private async logApiRequest(contents: Content[]): Promise<void> {
    // TODO: Implement API request logging
  }

  private async logApiResponse(durationMs: number): Promise<void> {
    // TODO: Implement API response logging
  }

  private logApiError(durationMs: number, error: unknown): void {
    // TODO: Implement API error logging
  }
}