// File path: packages/events-core/src/server/routers/chat-router.ts

import { router, loggedProcedure } from "../trpc-server.js";
import {
  createNewChatSchema,
  submitMessageSchema,
  chatIdSchema,
  openFileSchema,
} from "../schemas.js";
import { ChatService } from "../../services/chat-service.js";

export function createChatRouter(chatService: ChatService) {
  return router({
    createChat: loggedProcedure
      .input(createNewChatSchema)
      .mutation(async ({ input }) => {
        return chatService.createChat(
          input.newTask,
          input.mode,
          input.knowledge,
          input.prompt,
          input.model,
          input.correlationId
        );
      }),

    submitMessage: loggedProcedure
      .input(submitMessageSchema)
      .mutation(async ({ input }) => {
        return chatService.submitMessage(
          input.chatId,
          input.message,
          input.attachments,
          input.correlationId
        );
      }),

    getById: loggedProcedure.input(chatIdSchema).query(async ({ input }) => {
      const chat = await chatService.getChatById(input.chatId);
      if (!chat) {
        throw new Error(`Chat ${input.chatId} not found`);
      }
      return chat;
    }),

    getAll: loggedProcedure.query(async () => {
      return chatService.getAllChats();
    }),

    openChatFile: loggedProcedure
      .input(openFileSchema)
      .query(async ({ input }) => {
        return chatService.openChatFile(input.filePath, input.correlationId);
      }),
  });
}
