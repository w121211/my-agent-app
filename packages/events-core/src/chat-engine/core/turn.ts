// packages/events-core/src/chat-engine/core/turn.ts

import type { GenerateContentResponse, FunctionCall } from '../config/types.js';
import type { ChatStreamEvent, ToolCallInfo, ThoughtSummary } from '../events/types.js';
import type { ChatSession } from './chat-session.js';

export class Turn {
  public readonly pendingToolCalls: ToolCallInfo[] = [];
  private debugResponses: GenerateContentResponse[] = [];

  constructor(
    private chatSession: ChatSession,
    private correlationId: string
  ) {}

  async *run(
    message: string,
    signal: AbortSignal
  ): AsyncGenerator<ChatStreamEvent> {
    try {
      const responseStream = this.chatSession.sendMessageStream(message, signal);

      for await (const response of responseStream) {
        if (signal.aborted) {
          yield { type: 'user_cancelled' };
          return;
        }

        this.debugResponses.push(response);
        yield* this.convertResponseToEvents(response);
      }

    } catch (error) {
      yield { 
        type: 'error', 
        value: { 
          error: error instanceof Error ? error : new Error(String(error)),
          isRetryable: this.isRetryableError(error),
        } 
      };
    }
  }

  getDebugResponses(): GenerateContentResponse[] {
    return [...this.debugResponses];
  }

  private *convertResponseToEvents(
    response: GenerateContentResponse
  ): Generator<ChatStreamEvent> {
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) return;

    for (const part of candidate.content.parts) {
      if (part.text && !part.thought) {
        yield { type: 'content', value: part.text };
      }

      if (part.thought && part.text) {
        const thoughtSummary = this.parseThoughtContent(part.text);
        yield { type: 'thought', value: thoughtSummary };
      }
    }

    if (response.functionCalls) {
      for (const functionCall of response.functionCalls) {
        const toolCallInfo = this.convertToToolCallInfo(functionCall);
        this.pendingToolCalls.push(toolCallInfo);

        yield { type: 'tool_call_request', value: toolCallInfo };
      }
    }
  }

  private parseThoughtContent(text: string): ThoughtSummary {
    const subjectMatch = text.match(/\*\*(.*?)\*\*/);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Thinking';
    const description = text.replace(/\*\*(.*?)\*\*/, '').trim();

    return { subject, description };
  }

  private convertToToolCallInfo(functionCall: FunctionCall): ToolCallInfo {
    return {
      callId: functionCall.id || `call_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: functionCall.name || 'unknown_tool',
      args: functionCall.args || {},
      isClientInitiated: false,
    };
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') || 
             message.includes('500') ||
             message.includes('502') ||
             message.includes('503');
    }
    return false;
  }
}