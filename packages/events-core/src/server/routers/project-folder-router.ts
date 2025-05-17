// packages/events-core/src/server/routers/project-folder-router.ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc-server.js";
import { ProjectFolderService } from "../../services/project-folder-service.js";

// Project folder schemas
export const folderTreeRequestSchema = z.object({
  projectFolderPath: z.string().optional(),
});

export const addProjectFolderSchema = z.object({
  projectFolderPath: z.string(),
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
        return projectFolderService.getFolderTree(input.projectFolderPath);
      }),

    addProjectFolder: publicProcedure
      .input(addProjectFolderSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.addProjectFolder(
          input.projectFolderPath,
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
