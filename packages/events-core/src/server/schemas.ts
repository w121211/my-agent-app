// packages/events-core/src/server/schemas.ts
import { z } from "zod";

// Task schemas
export const createTaskSchema = z.object({
  taskName: z.string().min(1),
  taskConfig: z.record(z.unknown()).default({}),
  correlationId: z.string().optional(),
});

export const taskIdSchema = z.object({
  taskId: z.string().uuid(),
  correlationId: z.string().optional(),
});

// Chat schemas
export const createNewChatSchema = z.object({
  newTask: z.boolean().default(false),
  mode: z.enum(["chat", "agent"]).default("chat"),
  knowledge: z.array(z.string()).default([]),
  prompt: z.string().optional(),
  model: z.string().default("default"),
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

// File schemas
export const openFileSchema = z.object({
  filePath: z.string(),
  correlationId: z.string().optional(),
});

// Project folder schemas
export const folderTreeRequestSchema = z.object({
  projectFolderPath: z.string().optional(),
  correlationId: z.string().optional(),
});

export const projectFolderUpdateSchema = z
  .object({
    command: z.enum(["addProjectFolder", "removeProjectFolder"]),
    projectFolderPath: z.string().optional(),
    projectFolderId: z.string().optional(),
    correlationId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.command === "addProjectFolder" && !data.projectFolderPath) {
        return false;
      }
      if (data.command === "removeProjectFolder" && !data.projectFolderId) {
        return false;
      }
      return true;
    },
    {
      message:
        "projectFolderPath required for addProjectFolder, projectFolderId required for removeProjectFolder",
    }
  );

export const startWatchingAllProjectFoldersSchema = z.object({
  correlationId: z.string().optional(),
});
