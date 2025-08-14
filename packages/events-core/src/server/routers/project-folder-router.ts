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

export const searchFilesSchema = z.object({
  query: z.string(),
  projectId: z.string(),
  limit: z.number().optional().default(20),
});

export const copyFileSchema = z.object({
  sourceAbsolutePath: absolutePathSchema,
  destinationAbsolutePath: absolutePathSchema,
  correlationId: z.string().optional(),
});

export const moveFileSchema = z.object({
  sourceAbsolutePath: absolutePathSchema,
  destinationAbsolutePath: absolutePathSchema,
  correlationId: z.string().optional(),
});

export const renameFileSchema = z.object({
  absolutePath: absolutePathSchema,
  newName: z.string().min(1, "New name cannot be empty"),
  correlationId: z.string().optional(),
});

export const deleteFileSchema = z.object({
  absolutePath: absolutePathSchema,
  correlationId: z.string().optional(),
});

export const duplicateFileSchema = z.object({
  sourceAbsolutePath: absolutePathSchema,
  newName: z.string().optional(),
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
        await projectFolderService.removeProjectFolder(
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
        const count = await projectFolderService.startWatchingAllProjectFolders(
          input.correlationId
        );
        return { count };
      }),

    searchFiles: publicProcedure
      .input(searchFilesSchema)
      .query(async ({ input }) => {
        return projectFolderService.searchFilesInProject(
          input.query,
          input.projectId,
          input.limit
        );
      }),

    copyFile: publicProcedure
      .input(copyFileSchema)
      .mutation(async ({ input }) => {
        await projectFolderService.copyFile(
          input.sourceAbsolutePath,
          input.destinationAbsolutePath,
          input.correlationId
        );
      }),

    moveFile: publicProcedure
      .input(moveFileSchema)
      .mutation(async ({ input }) => {
        await projectFolderService.moveFile(
          input.sourceAbsolutePath,
          input.destinationAbsolutePath,
          input.correlationId
        );
      }),

    renameFile: publicProcedure
      .input(renameFileSchema)
      .mutation(async ({ input }) => {
        await projectFolderService.renameFile(
          input.absolutePath,
          input.newName,
          input.correlationId
        );
      }),

    deleteFile: publicProcedure
      .input(deleteFileSchema)
      .mutation(async ({ input }) => {
        await projectFolderService.deleteFile(
          input.absolutePath,
          input.correlationId
        );
      }),

    duplicateFile: publicProcedure
      .input(duplicateFileSchema)
      .mutation(async ({ input }) => {
        const newPath = await projectFolderService.duplicateFile(
          input.sourceAbsolutePath,
          input.newName,
          input.correlationId
        );
        return { newPath };
      }),
  });
}
