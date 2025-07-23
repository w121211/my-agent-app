// packages/events-core/src/server/routers/chat-engine-router.ts

import { z } from "zod";
import { router, publicProcedure } from "../trpc-server.js";
import { ChatClient } from "../../services/chat-engine/chat-client.js";
import { ChatSessionRepositoryImpl } from "../../services/chat-engine/chat-session-repository.js";
import type { ChatModelConfig, AvailableModel } from "../../services/chat-engine/types.js";
import type { TaskService } from "../../services/task-service.js";
import type { ProjectFolderService } from "../../services/project-folder-service.js";
import type { UserSettingsService } from "../../services/user-settings-service.js";
import type { IEventBus } from "../../event-bus.js";

const chatModelConfigSchema = z.object({
  provider: z.string(),
  modelId: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
});

const createChatConfigSchema = z.object({
  mode: z.enum(['chat', 'agent']).default('chat'),
  model: z.union([z.string(), chatModelConfigSchema]).optional(),
  knowledge: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  newTask: z.boolean().optional(),
});

const sendMessageSchema = z.object({
  chatSessionId: z.string(),
  message: z.string(),
  attachments: z.array(z.object({
    fileName: z.string(),
    content: z.string(),
  })).optional(),
});

export function createChatEngineRouter(
  eventBus: IEventBus,
  taskService: TaskService,
  projectFolderService: ProjectFolderService,
  userSettingsService: UserSettingsService,
) {
  const chatSessionRepository = new ChatSessionRepositoryImpl();
  const chatClient = new ChatClient(
    eventBus,
    chatSessionRepository,
    taskService,
    projectFolderService,
    userSettingsService,
  );

  return router({
    createChat: publicProcedure
      .input(z.object({
        targetDirectory: z.string(),
        config: createChatConfigSchema.optional(),
      }))
      .mutation(async ({ input }) => {
        const chatSessionId = await chatClient.createChat(
          input.targetDirectory,
          input.config,
        );
        return { chatSessionId };
      }),

    sendMessage: publicProcedure
      .input(sendMessageSchema)
      .mutation(async ({ input }) => {
        const result = await chatClient.sendMessage(
          input.chatSessionId,
          input.message,
          input.attachments,
        );
        return result;
      }),

    confirmToolCall: publicProcedure
      .input(z.object({
        chatSessionId: z.string(),
        toolCallId: z.string(),
        outcome: z.enum(['approved', 'denied']),
      }))
      .mutation(async ({ input }) => {
        const result = await chatClient.confirmToolCall(
          input.chatSessionId,
          input.toolCallId,
          input.outcome,
        );
        return result;
      }),

    abortChat: publicProcedure
      .input(z.object({
        chatSessionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await chatClient.abortChat(input.chatSessionId);
        return { success: true };
      }),

    getAvailableModels: publicProcedure
      .query(async () => {
        const models = await chatClient.getAvailableModels();
        return models;
      }),

    validateModelConfig: publicProcedure
      .input(chatModelConfigSchema)
      .mutation(async ({ input }) => {
        const isValid = await chatClient.validateModelConfig(input);
        return { isValid };
      }),

    updateChat: publicProcedure
      .input(z.object({
        chatSessionId: z.string(),
        updates: z.object({
          metadata: z.any().optional(),
          maxTurns: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        await chatClient.updateChat(input.chatSessionId, input.updates || {});
        return { success: true };
      }),

    deleteChat: publicProcedure
      .input(z.object({
        chatSessionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await chatClient.deleteChat(input.chatSessionId);
        return { success: true };
      }),

    getChatById: publicProcedure
      .input(z.object({
        chatSessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const chat = await chatClient.getChatById(input.chatSessionId);
        return chat;
      }),

    loadChatFromFile: publicProcedure
      .input(z.object({
        filePath: z.string(),
      }))
      .mutation(async ({ input }) => {
        const chatSessionId = await chatClient.loadChatFromFile(input.filePath);
        return { chatSessionId };
      }),
  });
}

export type ChatEngineRouter = ReturnType<typeof createChatEngineRouter>;