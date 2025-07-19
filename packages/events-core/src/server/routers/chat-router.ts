// packages/events-core/src/server/routers/chat-router.ts
import { z } from "zod";
import { ChatService, ChatMode } from "../../services/chat-service.js";
import { ChatClient } from "../../services/chat-engine/chat-client.js";
import { router, publicProcedure } from "../trpc-server.js";

// Chat schemas
export const createNewChatSchema = z.object({
  targetDirectoryAbsolutePath: z.string(),
  newTask: z.boolean().default(false),
  mode: z.enum(["chat", "agent"] as const).default("chat"),
  knowledge: z.array(z.string()).default([]),
  prompt: z.string().optional(),
  model: z.string().default("default"),
  correlationId: z.string().optional(),
});

export const createEmptyChatSchema = z.object({
  targetDirectoryAbsolutePath: z.string(),
  correlationId: z.string().optional(),
});

export const updatePromptDraftSchema = z.object({
  chatId: z.string().uuid(),
  promptDraft: z.string(),
  correlationId: z.string().optional(),
});

export const sendMessageSchema = z.object({
  chatId: z.string().uuid(),
  message: z.string(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  correlationId: z.string().optional(),
});

export const sendToolConfirmationSchema = z.object({
  chatId: z.string().uuid(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.any()),
    needsConfirmation: z.boolean(),
  })),
  correlationId: z.string().optional(),
});

export const chatIdSchema = z.object({
  chatId: z.string().uuid(),
  correlationId: z.string().optional(),
});

export const openFileSchema = z.object({
  filePath: z.string(),
  correlationId: z.string().optional(),
});

export function createChatRouter(chatClient: ChatClient) {
  return router({
    createChat: publicProcedure
      .input(createNewChatSchema)
      .mutation(async ({ input }) => {
        return chatClient.createChat(
          input.targetDirectoryAbsolutePath,
          input.newTask,
          input.mode,
          input.knowledge,
          input.prompt,
          input.model,
          input.correlationId
        );
      }),

    createEmptyChat: publicProcedure
      .input(createEmptyChatSchema)
      .mutation(async ({ input }) => {
        return chatClient.createEmptyChat(
          input.targetDirectoryAbsolutePath,
          input.correlationId
        );
      }),

    updatePromptDraft: publicProcedure
      .input(updatePromptDraftSchema)
      .mutation(async ({ input }) => {
        return chatClient.updatePromptDraft(
          input.chatId,
          input.promptDraft,
          input.correlationId
        );
      }),

    sendMessage: publicProcedure
      .input(sendMessageSchema)
      .mutation(async ({ input, signal }) => {
        const chatSession = await chatClient.getSession(input.chatId);
        const result = await chatSession.runTurn({
          type: 'user_message',
          content: input.message,
          attachments: input.attachments,
        }, { signal });
        
        await chatClient.saveSession();
        return result;
      }),

    sendToolConfirmation: publicProcedure
      .input(sendToolConfirmationSchema)
      .mutation(async ({ input, signal }) => {
        return chatClient.sendToolConfirmation(
          input.chatId,
          input.toolCalls,
          input.correlationId
        );
      }),

    getById: publicProcedure.input(chatIdSchema).query(async ({ input }) => {
      return chatClient.getChatById(input.chatId);
    }),

    getAll: publicProcedure.query(async () => {
      return chatClient.getAllChats();
    }),

    openChatFile: publicProcedure
      .input(openFileSchema)
      .query(async ({ input }) => {
        return chatClient.openChatFile(input.filePath, input.correlationId);
      }),
  });
}
