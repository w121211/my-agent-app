// File path: packages/events-core/src/server/routers/workspace-router.ts

import { router, loggedProcedure } from "../trpc-server.js";
import {
  folderTreeRequestSchema,
  workspaceUpdateSchema,
  startWatchingAllWorkspacesSchema,
} from "../schemas.js";
import { WorkspaceService } from "../../services/workspace-service.js";

export function createWorkspaceRouter(workspaceService: WorkspaceService) {
  return router({
    getFolderTree: loggedProcedure
      .input(folderTreeRequestSchema)
      .query(async ({ input }) => {
        return workspaceService.getFolderTree(
          input.workspacePath,
          input.correlationId
        );
      }),

    addWorkspace: loggedProcedure
      .input(workspaceUpdateSchema)
      .mutation(async ({ input }) => {
        if (input.command !== "addWorkspace") {
          throw new Error("Invalid command for addWorkspace");
        }

        return workspaceService.addWorkspace(
          input.workspacePath,
          input.correlationId
        );
      }),

    removeWorkspace: loggedProcedure
      .input(workspaceUpdateSchema)
      .mutation(async ({ input }) => {
        if (input.command !== "removeWorkspace") {
          throw new Error("Invalid command for removeWorkspace");
        }

        return workspaceService.removeWorkspace(
          input.workspacePath,
          input.correlationId
        );
      }),

    startWatchingAllWorkspaces: loggedProcedure
      .input(startWatchingAllWorkspacesSchema)
      .mutation(async ({ input }) => {
        return workspaceService.startWatchingAllWorkspaces(input.correlationId);
      }),

    getSettings: loggedProcedure.query(async () => {
      return workspaceService.getSettings();
    }),
  });
}
