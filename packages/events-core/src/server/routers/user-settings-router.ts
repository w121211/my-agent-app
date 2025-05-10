// File path: packages/events-core/src/server/routers/user-settings-router.ts

import { router, loggedProcedure } from "../trpc-server.js";
import { z } from "zod";
import { UserSettingsService } from "../../services/user-settings-service.js";
import { workspaceUpdateSchema } from "../schemas.js";

export function createUserSettingsRouter(
  userSettingsService: UserSettingsService
) {
  return router({
    // Get current user settings
    getSettings: loggedProcedure.query(async () => {
      return userSettingsService.getUserSettings();
    }),

    // Update general settings
    updateSettings: loggedProcedure
      .input(
        z.object({
          settings: z.record(z.unknown()),
          correlationId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // This would need implementation in the UserSettingsService
        // For now we'll return a not implemented response
        return {
          success: false,
          message: "Direct settings update not implemented yet",
        };
      }),
  });
}
