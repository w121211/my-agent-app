// packages/events-core/src/services/user-settings-service.ts
import { Logger, ILogObj } from "tslog";
import type {
  UserSettingsRepository,
  UserSettings,
} from "./user-settings-repository.js";
import type { ProjectFolderService } from "./project-folder-service.js";

export class UserSettingsService {
  private readonly logger: Logger<ILogObj>;
  private readonly userSettingsRepository: UserSettingsRepository;
  private readonly projectFolderService: ProjectFolderService;

  constructor(
    userSettingsRepository: UserSettingsRepository,
    projectFolderService: ProjectFolderService
  ) {
    this.logger = new Logger({ name: "UserSettingsService" });
    this.userSettingsRepository = userSettingsRepository;
    this.projectFolderService = projectFolderService;
  }

  public async getUserSettings(): Promise<UserSettings> {
    return this.userSettingsRepository.getSettings();
  }

  public async updateUserSettings(
    settingsUpdate: Record<string, unknown>
  ): Promise<{ success: boolean; message?: string; settings?: UserSettings }> {
    try {
      this.logger.info("Updating user settings");

      // Get current settings
      const currentSettings = await this.userSettingsRepository.getSettings();

      // Create updated settings by merging with current settings
      const updatedSettings: UserSettings = { ...currentSettings };

      // Update settings fields
      // Note: projectFolders should be updated through the ProjectFolderService,
      // so we'll ignore that field here
      if (settingsUpdate.projectFolders !== undefined) {
        this.logger.warn(
          "Attempting to update projectFolders directly. This should be done through ProjectFolderService."
        );
      }

      // Update all fields except projectFolders
      Object.entries(settingsUpdate).forEach(([key, value]) => {
        if (key !== "projectFolders") {
          (updatedSettings as Record<string, unknown>)[key] = value;
        }
      });

      // Save updated settings
      await this.userSettingsRepository.saveSettings(updatedSettings);

      this.logger.info("User settings updated successfully");
      return { success: true, settings: updatedSettings };
    } catch (error) {
      this.logger.error(`Error updating user settings: ${error}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function createUserSettingsService(
  userSettingsRepository: UserSettingsRepository,
  projectFolderService: ProjectFolderService
): UserSettingsService {
  return new UserSettingsService(userSettingsRepository, projectFolderService);
}
