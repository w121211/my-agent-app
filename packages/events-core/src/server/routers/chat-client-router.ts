// packages/events-core/src/server/routers/chat-client-router.ts

import { z } from "zod";
import { router, publicProcedure } from "../trpc-server.js";
import { ChatClient } from "../../services/chat-engine/chat-client.js";
import type { IEventBus } from "../../event-bus.js";
import type { ChatSessionData } from "../../services/chat-engine/chat-session-repository.js";
import type { CreateChatSessionConfig } from "../../services/chat-engine/chat-client.js";
import type { TaskService } from "../../services/task-service.js";
import type { ProjectFolderService } from "../../services/project-folder-service.js";
import type { UserSettingsService } from "../../services/user-settings-service.js";
import type { FileService } from "../../services/file-service.js";
import type { ToolRegistry } from "../../services/tool-call/tool-registry.js";
import type { ChatSessionRepository } from "../../services/chat-engine/chat-session-repository.js";
import { TurnResult } from "../../services/chat-engine/chat-session.js";

const createChatSessionConfigSchema: z.ZodType<CreateChatSessionConfig> =
  z.object({
    mode: z.enum(["chat", "agent"]).default("chat"),
    modelId: z
      .custom<`${string}/${string}`>(
        (val) => {
          return typeof val === "string" && /^.+\/.+$/.test(val);
        },
        { message: "Model ID must be in format 'provider/model'" },
      )
      .optional(),
    knowledge: z.array(z.string()).optional(),
    prompt: z.string().optional(),
    newTask: z.boolean().optional(),
  });

const sendMessageSchema = z.object({
  absoluteFilePath: z.string(),
  chatSessionId: z.string(),
  message: z.object({
    role: z.literal("user"),
    content: z.union([z.string(), z.array(z.any())]),
  }),
});

export function createChatClientRouter(
  eventBus: IEventBus,
  taskService: TaskService,
  projectFolderService: ProjectFolderService,
  userSettingsService: UserSettingsService,
  fileService: FileService,
  toolRegistry: ToolRegistry,
  chatSessionRepository: ChatSessionRepository,
) {
  const chatClient = new ChatClient(
    eventBus,
    chatSessionRepository,
    taskService,
    projectFolderService,
    userSettingsService,
    fileService,
    toolRegistry,
  );

  return router({
    createNewChatSession: publicProcedure
      .input(
        z.object({
          targetDirectory: z.string(),
          config: createChatSessionConfigSchema.optional(),
        }),
      )
      .mutation(async ({ input }): Promise<ChatSessionData> => {
        const result = await chatClient.createChatSession(
          input.targetDirectory,
          input.config,
        );
        return result.toJSON();
      }),

    sendMessage: publicProcedure.input(sendMessageSchema).mutation(
      async ({
        input,
      }): Promise<{
        turnResult: TurnResult;
        updatedChatSession: ChatSessionData;
      }> => {
        const result = await chatClient.sendMessage(
          input.absoluteFilePath,
          input.chatSessionId,
          input.message,
        );
        return {
          turnResult: result.turnResult,
          updatedChatSession: result.updatedChatSession.toJSON(),
        };
      },
    ),

    confirmToolCall: publicProcedure
      .input(
        z.object({
          absoluteFilePath: z.string(),
          chatSessionId: z.string(),
          toolCallId: z.string(),
          outcome: z.enum(["yes", "no", "yes_always"]),
        }),
      )
      .mutation(
        async ({
          input,
        }): Promise<{
          turnResult: TurnResult;
          updatedChatSession: ChatSessionData;
        }> => {
          const result = await chatClient.confirmToolCall(
            input.absoluteFilePath,
            input.chatSessionId,
            input.toolCallId,
            input.outcome,
          );
          return {
            turnResult: result.turnResult,
            updatedChatSession: result.updatedChatSession.toJSON(),
          };
        },
      ),

    abortChat: publicProcedure
      .input(
        z.object({
          absoluteFilePath: z.string(),
          chatSessionId: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        await chatClient.abortChat(input.absoluteFilePath, input.chatSessionId);
        return { success: true };
      }),

    getAvailableModels: publicProcedure.query(async () => {
      const models = await chatClient.getAvailableModels();
      return models;
    }),

    updateChat: publicProcedure
      .input(
        z.object({
          absoluteFilePath: z.string(),
          updates: z
            .object({
              metadata: z.any().optional(),
              maxTurns: z.number().optional(),
            })
            .optional(),
        }),
      )
      .mutation(async ({ input }) => {
        await chatClient.updateChat(
          input.absoluteFilePath,
          input.updates || {},
        );
        return { success: true };
      }),

    deleteChat: publicProcedure
      .input(
        z.object({
          absoluteFilePath: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        await chatClient.deleteChat(input.absoluteFilePath);
        return { success: true };
      }),

    getChatSession: publicProcedure
      .input(
        z.object({
          absoluteFilePath: z.string(),
        }),
      )
      .query(async ({ input }) => {
        const session = await chatClient.getOrLoadChatSession(
          input.absoluteFilePath,
        );
        return session.toJSON();
      }),


    rerunChat: publicProcedure
      .input(
        z.object({
          absoluteFilePath: z.string(),
          chatSessionId: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await chatClient.rerunChat(
          input.absoluteFilePath,
          input.chatSessionId,
        );
        return result;
      }),
  });
}

export type ChatClientRouter = ReturnType<typeof createChatClientRouter>;
