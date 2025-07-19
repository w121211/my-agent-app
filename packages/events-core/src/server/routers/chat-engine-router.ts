// packages/events-core/src/server/routers/chat-engine-router.ts

import { z } from "zod";
import { router, publicProcedure } from "../trpc-server.js";
import { 
  ChatEngineConfig, 
  ChatClient,
  type ChatSessionConfig,
  type SystemConfig,
  type ChatStreamEvent 
} from "../../chat-engine/index.js";

const systemConfigSchema = z.object({
  apiKey: z.string(),
  authType: z.enum(['oauth', 'api-key', 'vertex-ai']).default('api-key'),
  debugMode: z.boolean().default(false),
  enableTools: z.boolean().default(false),
  maxRetries: z.number().default(3),
  timeout: z.number().default(30000),
});

const chatConfigSchema = z.object({
  model: z.string().default('gemini-2.0-flash'),
  temperature: z.number().min(0).max(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
  mode: z.enum(['chat', 'agent']).default('chat'),
  systemPrompt: z.string().optional(),
  maxTurns: z.number().positive().optional(),
  maxSessionTurns: z.number().positive().optional(),
});

const sendMessageSchema = z.object({
  message: z.string(),
  systemConfig: systemConfigSchema,
  chatConfig: chatConfigSchema,
  correlationId: z.string().optional(),
  initialHistory: z.array(z.any()).optional(),
});

export function createChatEngineRouter() {
  return router({
    
    sendMessageStream: publicProcedure
      .input(sendMessageSchema)
      .subscription(async function* ({ input, signal }) {
        
        const systemConfig: SystemConfig = {
          ...input.systemConfig,
          workingDir: process.cwd(),
        };

        const chatEngineConfig = new ChatEngineConfig(
          systemConfig,
          input.chatConfig
        );

        await chatEngineConfig.initialize();

        const chatClient = new ChatClient(chatEngineConfig);

        const correlationId = input.correlationId || `session_${Date.now()}`;

        for await (const event of chatClient.sendMessageStream(
          input.message,
          correlationId,
          signal,
          undefined,
          input.initialHistory,
          input.chatConfig
        )) {
          yield event;
        }
      }),
    
    generateJson: publicProcedure
      .input(z.object({
        message: z.string(),
        schema: z.any(),
        systemConfig: systemConfigSchema,
        chatConfig: chatConfigSchema,
        correlationId: z.string().optional(),
        initialHistory: z.array(z.any()).optional(),
      }))
      .mutation(async ({ input, signal }) => {
        
        const systemConfig: SystemConfig = {
          ...input.systemConfig,
          workingDir: process.cwd(),
        };

        const chatEngineConfig = new ChatEngineConfig(
          systemConfig,
          input.chatConfig
        );

        await chatEngineConfig.initialize();

        const chatClient = new ChatClient(chatEngineConfig);

        const correlationId = input.correlationId || `json_${Date.now()}`;
        const abortSignal = signal || new AbortController().signal;

        return chatClient.generateJson(
          input.message,
          input.schema,
          input.chatConfig,
          correlationId,
          abortSignal,
          input.initialHistory
        );
      }),
    
    resetChat: publicProcedure
      .input(z.object({
        systemConfig: systemConfigSchema,
      }))
      .mutation(async ({ input }) => {
        
        const systemConfig: SystemConfig = {
          ...input.systemConfig,
          workingDir: process.cwd(),
        };

        const chatEngineConfig = new ChatEngineConfig(
          systemConfig,
          { model: 'gemini-2.0-flash', mode: 'chat' }
        );

        await chatEngineConfig.initialize();

        const chatClient = new ChatClient(chatEngineConfig);
        chatClient.resetChat();

        return { success: true };
      }),
  });
}

export type ChatEngineRouter = ReturnType<typeof createChatEngineRouter>;