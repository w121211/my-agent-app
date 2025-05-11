// packages/events-core/src/server/routers/user-settings-router.ts
import { z } from "zod";
import { UserSettingsService } from "../../services/user-settings-service.js";
import { router, loggedProcedure } from "../trpc-server.js";

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
        })
      )
      .mutation(async ({ input }) => {
        return userSettingsService.updateUserSettings(input.settings);
      }),
  });
}
