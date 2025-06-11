// packages/events-core/src/server/routers/project-folder-router.ts
import { z } from "zod";
import path from "node:path";
import { router, publicProcedure } from "../trpc-server.js";
import { ProjectFolderService } from "../../services/project-folder-service.js";

// Validation helper for absolute paths
const absolutePathSchema = z
  .string()
  .refine((value) => path.isAbsolute(value), {
    message: "Path must be absolute",
  });

// Project folder schemas
export const folderTreeRequestSchema = z.object({
  absoluteProjectFolderPath: z
    .string()
    .optional()
    .refine((value) => !value || path.isAbsolute(value), {
      message: "Path must be absolute when provided",
    }),
});

export const addProjectFolderSchema = z.object({
  absoluteProjectFolderPath: absolutePathSchema,
  correlationId: z.string().optional(),
});

export const removeProjectFolderSchema = z.object({
  projectFolderId: z.string(),
  correlationId: z.string().optional(),
});

export const startWatchingAllProjectFoldersSchema = z.object({
  correlationId: z.string().optional(),
});

export function createProjectFolderRouter(
  projectFolderService: ProjectFolderService
) {
  return router({
    getFolderTree: publicProcedure
      .input(folderTreeRequestSchema)
      .query(async ({ input }) => {
        return projectFolderService.getFolderTree(
          input.absoluteProjectFolderPath
        );
      }),

    addProjectFolder: publicProcedure
      .input(addProjectFolderSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.addProjectFolder(
          input.absoluteProjectFolderPath,
          input.correlationId
        );
      }),

    removeProjectFolder: publicProcedure
      .input(removeProjectFolderSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.removeProjectFolder(
          input.projectFolderId,
          input.correlationId
        );
      }),

    getAllProjectFolders: publicProcedure.query(async () => {
      return projectFolderService.getAllProjectFolders();
    }),

    startWatchingAllProjectFolders: publicProcedure
      .input(startWatchingAllProjectFoldersSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.startWatchingAllProjectFolders(
          input.correlationId
        );
      }),
  });
}
