// packages/events-core/src/chat-engine/core/chat-client.ts

import type {
  Content,
  ChatConfig,
  SessionConfig,
  SchemaUnion
} from '../config/types.js';
import type { ChatEngineConfig } from '../config/config.js';
import type { ChatStreamEvent, ChatCompressionInfo } from '../events/types.js';
import { ChatSession } from './chat-session.js';
import { Turn } from './turn.js';

export class ChatClient {
  private readonly MAX_TURNS = 100;
  private sessionTurnCount = 0;
  private currentChatSession?: ChatSession;

  constructor(
    private config: ChatEngineConfig
  ) {}

  async *sendMessageStream(
    request: string,
    chatConfig: ChatConfig,
    sessionConfig: SessionConfig,
    turns: number = this.MAX_TURNS,
    initialHistory?: Content[]
  ): AsyncGenerator<ChatStreamEvent> {
    
    this.sessionTurnCount++;
    if (
      chatConfig.maxSessionTurns && 
      chatConfig.maxSessionTurns > 0 &&
      this.sessionTurnCount > chatConfig.maxSessionTurns
    ) {
      yield { 
        type: 'max_session_turns_reached',
        value: {
          sessionTurns: this.sessionTurnCount,
          maxSessionTurns: chatConfig.maxSessionTurns,
        }
      };
      return;
    }

    const boundedTurns = Math.min(turns, this.MAX_TURNS);
    if (!boundedTurns) {
      return;
    }

    if (!this.currentChatSession || initialHistory) {
      this.currentChatSession = this.createChatSession(chatConfig, initialHistory);
    }

    const compressed = await this.tryCompressChat();
    if (compressed) {
      yield { type: 'chat_compressed', value: compressed };
    }

    const turn = new Turn(this.currentChatSession, sessionConfig.correlationId);

    for await (const event of turn.run(request, sessionConfig.abortSignal)) {
      yield event;
    }

    if (!turn.pendingToolCalls.length && !sessionConfig.abortSignal.aborted) {
      
      const nextSpeakerCheck = await this.checkNextSpeaker(
        this.currentChatSession,
        sessionConfig.abortSignal,
        chatConfig
      );

      if (nextSpeakerCheck?.next_speaker === 'model') {
        const nextRequest = 'Please continue.';

        yield* this.sendMessageStream(
          nextRequest,
          chatConfig,
          sessionConfig,
          boundedTurns - 1
        );
      }
    }
  }

  async generateJson(
    message: string,
    schema: SchemaUnion,
    chatConfig: ChatConfig,
    sessionConfig: SessionConfig,
    initialHistory?: Content[]
  ): Promise<Record<string, unknown>> {
    
    const chatSession = this.createChatSession(chatConfig, initialHistory);

    return chatSession.generateJson(
      message,
      schema,
      sessionConfig.abortSignal
    );
  }

  resetChat(): void {
    this.currentChatSession = undefined;
    this.sessionTurnCount = 0;
  }

  getHistory(): Content[] {
    return this.currentChatSession?.getHistory() || [];
  }

  private async tryCompressChat(): Promise<ChatCompressionInfo | null> {
    if (!this.currentChatSession) return null;

    return this.currentChatSession.compressHistory(false);
  }

  private async checkNextSpeaker(
    chatSession: ChatSession,
    abortSignal: AbortSignal,
    chatConfig: ChatConfig
  ): Promise<{ next_speaker: 'user' | 'model' } | null> {
    
    switch (chatConfig.mode) {
      case 'chat':
        return { next_speaker: 'user' };
        
      case 'agent':
        return this.checkNextSpeakerForAgent(chatSession, abortSignal);
        
      default:
        return { next_speaker: 'user' };
    }
  }

  private async checkNextSpeakerForAgent(
    chatSession: ChatSession,
    abortSignal: AbortSignal
  ): Promise<{ next_speaker: 'user' | 'model' } | null> {
    
    const history = chatSession.getHistory(true);

    if (history.length === 0) {
      return null;
    }

    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.role !== 'model') {
      return null;
    }

    const lastContent = this.extractTextFromContent(lastMessage);
    const shouldContinue = this.heuristicShouldContinue(lastContent);

    return {
      next_speaker: shouldContinue ? 'model' : 'user'
    };
  }

  private heuristicShouldContinue(content: string): boolean {
    const text = content.toLowerCase();

    const continueIndicators = [
      'next,', 'then,', 'now i will', 'let me', 'i need to',
      'first,', 'second,', 'step', '...', 'continue',
      'i\'ll now', 'moving on', 'next step'
    ];

    const stopIndicators = [
      'what would you like', 'how can i help', 'any questions',
      'is there anything', 'would you prefer', 'let me know',
      'what do you think', 'how does this look'
    ];

    const hasStopIndicator = stopIndicators.some(indicator => 
      text.includes(indicator)
    );

    if (hasStopIndicator) {
      return false;
    }

    const hasContinueIndicator = continueIndicators.some(indicator => 
      text.includes(indicator)
    );

    return hasContinueIndicator;
  }

  private extractTextFromContent(content: Content): string {
    if (!content.parts) return '';

    return content.parts
      .map(part => part.text || '')
      .join('')
      .trim();
  }

  private createChatSession(
    chatConfig: ChatConfig,
    initialHistory?: Content[]
  ): ChatSession {
    
    return new ChatSession(
      this.config.getContentGenerator(),
      chatConfig,
      this.config.getSystemConfig(),
      initialHistory
    );
  }
}