// src/chatService.ts

import { IEventBus } from "./event-bus.js";
import { ChatRepository } from "./repositories.js";
import {
  Chat,
  ChatCreatedEvent,
  ChatStatus,
  EventType,
  Message,
  MessageMetadata,
  MessageSavedToChatFileEvent,
  Role,
  StartNewChatCommand,
  UserApproveWorkEvent,
} from "./types.js";
import { generateId } from "./types.js";

export class ChatService {
  private eventBus: IEventBus;
  private chatRepo: ChatRepository;

  constructor(eventBus: IEventBus, chatRepo: ChatRepository) {
    this.eventBus = eventBus;
    this.chatRepo = chatRepo;

    // 訂閱事件
    this.eventBus.subscribeAsync(
      EventType.START_NEW_CHAT_COMMAND,
      this.handleStartNewChatCommand.bind(this)
    );
    // 可以根據需要取消註解並實現其他事件處理器
    // this.eventBus.subscribeAsync(EventType.USER_SUBMIT_MESSAGE_COMMAND, this.handleUserSubmitMessageCommand.bind(this));
    // this.eventBus.subscribeAsync(EventType.SUBMIT_INITIAL_PROMPT_COMMAND, this.handleSubmitInitialPromptCommand.bind(this));
  }

  private async handleStartNewChatCommand(
    command: StartNewChatCommand
  ): Promise<void> {
    const chatId = this.generateChatId();
    const now = new Date();

    // 初始化聊天對象
    const chat: Chat = {
      id: chatId,
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      messages: [],
      status: ChatStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      metadata: command.metadata,
    };

    // 在儲存庫中創建聊天
    const chatFilePath = await this.chatRepo.createChat(chat);

    // 發布聊天創建事件
    await this.eventBus.publish({
      eventType: EventType.CHAT_CREATED_EVENT,
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      chatId,
      timestamp: now,
      correlationId: command.correlationId,
    });

    // 生成並處理初始提示
    const prompt = await this.generateInitialPrompt(
      command.taskId,
      command.subtaskId
    );
    const message: Message = {
      id: this.generateMessageId(),
      role: Role.USER,
      content: prompt,
      timestamp: now,
      metadata: {
        taskId: chat.taskId,
        subtaskId: chat.subtaskId,
        isPrompt: true,
      },
    };

    await this.onMessageReceived(chat, message, command.correlationId);
  }

  private async onMessageReceived(
    chat: Chat,
    message: Message,
    correlationId?: string
  ): Promise<void> {
    // 將消息添加到聊天
    await this.chatRepo.addMessage(chat.id, message);

    // 發布消息保存事件
    await this.eventBus.publish({
      eventType: EventType.MESSAGE_SAVED_TO_CHAT_FILE_EVENT,
      chatId: chat.id,
      messageId: message.id,
      filePath: chat.id, // 使用 chatId 作為參考，因為檔案路徑由儲存庫管理
      timestamp: new Date(),
      correlationId,
    });

    // 處理用戶消息
    if (message.role === Role.USER) {
      if (message.content.includes("APPROVE")) {
        await this.eventBus.publish({
          eventType: EventType.USER_APPROVE_WORK_EVENT,
          chatId: chat.id,
          timestamp: new Date(),
          correlationId,
        });
        return;
      }

      // 生成並處理代理回應
      const response = await this.generateAgentResponse(chat, message);
      await this.onMessageReceived(chat, response, correlationId);
    }
  }

  private generateChatId(): string {
    return generateId("chat");
  }

  private generateMessageId(): string {
    return generateId("msg");
  }

  private async generateInitialPrompt(
    taskId: string,
    subtaskId: string
  ): Promise<string> {
    // TODO: 根據子任務配置生成初始提示
    return "Initial prompt placeholder";
  }

  private async generateAgentResponse(
    chat: Chat,
    userMessage: Message
  ): Promise<Message> {
    // TODO: 實現 AI 代理回應生成
    return {
      id: this.generateMessageId(),
      role: Role.ASSISTANT,
      content: "Agent response placeholder",
      timestamp: new Date(),
      metadata: {
        taskId: chat.taskId,
        subtaskId: chat.subtaskId,
      },
    };
  }
}
