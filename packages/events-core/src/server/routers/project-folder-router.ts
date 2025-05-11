// packages/events-core/src/server/routers/project-folder-router.ts
import { z } from "zod";
import { router, loggedProcedure } from "../trpc-server.js";
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
    getFolderTree: loggedProcedure
      .input(folderTreeRequestSchema)
      .query(async ({ input }) => {
        return projectFolderService.getFolderTree(input.projectFolderPath);
      }),

    addProjectFolder: loggedProcedure
      .input(addProjectFolderSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.addProjectFolder(
          input.projectFolderPath,
          input.correlationId
        );
      }),

    removeProjectFolder: loggedProcedure
      .input(removeProjectFolderSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.removeProjectFolder(
          input.projectFolderId,
          input.correlationId
        );
      }),

    getAllProjectFolders: loggedProcedure.query(async () => {
      return projectFolderService.getAllProjectFolders();
    }),

    startWatchingAllProjectFolders: loggedProcedure
      .input(startWatchingAllProjectFoldersSchema)
      .mutation(async ({ input }) => {
        return projectFolderService.startWatchingAllProjectFolders(
          input.correlationId
        );
      }),
  });
}
