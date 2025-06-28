// packages/events-core/src/server/routers/chat-router.ts
import { z } from "zod";
import { ChatService, ChatMode } from "../../services/chat-service.js";
import { router, publicProcedure } from "../trpc-server.js";

// Chat schemas
export const createDraftChatSchema = z.object({ // Renamed from createNewChatSchema
  targetDirectoryAbsolutePath: z.string(),
  newTask: z.boolean().default(false),
  mode: z.enum(["chat", "agent"] as const).default("chat"),
  knowledge: z.array(z.string()).default([]),
  initialPromptDraft: z.string().optional(), // Renamed from prompt
  model: z.string().default("default"),
  correlationId: z.string().optional(),
});

export const updatePromptDraftSchema = z.object({
  chatId: z.string().uuid(),
  promptDraft: z.string(),
  correlationId: z.string().optional(),
});

export const cleanupEmptyDraftsSchema = z.object({ // Simple schema, might only need correlationId
  correlationId: z.string().optional(),
});

export const submitMessageSchema = z.object({
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

export const chatIdSchema = z.object({
  chatId: z.string().uuid(),
  correlationId: z.string().optional(),
});

export const openFileSchema = z.object({
  filePath: z.string(),
  correlationId: z.string().optional(),
});

export function createChatRouter(chatService: ChatService) {
  return router({
    createDraftChat: publicProcedure // Renamed from createChat
      .input(createDraftChatSchema) // Use new schema
      .mutation(async ({ input }) => {
        return chatService.createDraftChat( // Call new service method
          input.targetDirectoryAbsolutePath,
          input.newTask,
          input.mode,
          input.knowledge,
          input.initialPromptDraft, // Use renamed field
          input.model,
          input.correlationId
        );
      }),

    updatePromptDraft: publicProcedure
      .input(updatePromptDraftSchema)
      .mutation(async ({ input }) => {
        return chatService.updatePromptDraft(
          input.chatId,
          input.promptDraft,
          input.correlationId
        );
      }),

    cleanupEmptyDrafts: publicProcedure
      .input(cleanupEmptyDraftsSchema)
      .mutation(async ({ input }) => {
        await chatService.cleanupEmptyDrafts(input.correlationId);
        return { success: true, message: "Empty drafts cleanup process initiated." }; // Return a confirmation
      }),

    submitMessage: publicProcedure
      .input(submitMessageSchema)
      .mutation(async ({ input }) => {
        return chatService.submitMessage(
          input.chatId,
          input.message,
          input.attachments,
          input.correlationId
        );
      }),

    getById: publicProcedure.input(chatIdSchema).query(async ({ input }) => {
      return chatService.getChatById(input.chatId);
    }),

    getAll: publicProcedure.query(async () => {
      return chatService.getAllChats();
    }),

    openChatFile: publicProcedure
      .input(openFileSchema)
      .query(async ({ input }) => {
        return chatService.openChatFile(input.filePath, input.correlationId);
      }),
  });
}
