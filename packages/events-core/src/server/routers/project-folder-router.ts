// packages/events-core/src/server/routers/project-folder-router.ts
import { z } from "zod";
import { router, loggedProcedure } from "../trpc-server.js";
import { ProjectFolderService } from "../../services/project-folder-service.js";

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

export function createProjectFolderRouter(
  projectFolderService: ProjectFolderService
) {
  return router({
    getFolderTree: loggedProcedure
      .input(folderTreeRequestSchema)
      .query(async ({ input }) => {
        return projectFolderService.getFolderTree(
          input.projectFolderPath,
          input.correlationId
        );
      }),

    addProjectFolder: loggedProcedure
      .input(projectFolderUpdateSchema)
      .mutation(async ({ input }) => {
        if (input.command !== "addProjectFolder") {
          throw new Error("Invalid command for addProjectFolder");
        }

        return projectFolderService.addProjectFolder(
          input.projectFolderPath!,
          input.correlationId
        );
      }),

    removeProjectFolder: loggedProcedure
      .input(projectFolderUpdateSchema)
      .mutation(async ({ input }) => {
        if (input.command !== "removeProjectFolder") {
          throw new Error("Invalid command for removeProjectFolder");
        }

        return projectFolderService.removeProjectFolder(
          input.projectFolderId!,
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
