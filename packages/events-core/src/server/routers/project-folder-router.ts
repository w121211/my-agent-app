// packages/events-core/src/server/routers/project-folder-router.ts
import { router, loggedProcedure } from "../trpc-server.js";
import {
  folderTreeRequestSchema,
  projectFolderUpdateSchema,
  startWatchingAllProjectFoldersSchema,
} from "../schemas.js";
import { ProjectFolderService } from "../../services/project-folder-service.js";

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
