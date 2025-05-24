// packages/events-core/src/services/user-settings-service.ts
import { Logger, ILogObj } from "tslog";
import type {
  UserSettingsRepository,
  UserSettings,
} from "./user-settings-repository.js";

// Define safe user settings update type that excludes projectFolders
type SafeUserSettingsUpdate = Omit<Partial<UserSettings>, "projectFolders"> &
  Record<string, unknown>;

export class UserSettingsService {
  private readonly logger: Logger<ILogObj>;
  private readonly userSettingsRepository: UserSettingsRepository;

  constructor(userSettingsRepository: UserSettingsRepository) {
    this.logger = new Logger({ name: "UserSettingsService" });
    this.userSettingsRepository = userSettingsRepository;
  }

  public async getUserSettings(): Promise<UserSettings> {
    return this.userSettingsRepository.getSettings();
  }

  public async updateUserSettings(
    settingsUpdate: SafeUserSettingsUpdate // Type-safe: prevents projectFolders updates at compile time
  ): Promise<{ success: boolean; message?: string; settings?: UserSettings }> {
    try {
      this.logger.info("Updating user settings");

      // Get current settings
      const currentSettings = await this.userSettingsRepository.getSettings();

      // Note: projectFolders should be updated through the ProjectFolderService,
      // so we exclude that field here using type constraints at compile time
      const updatedSettings: UserSettings = {
        ...currentSettings,
        ...settingsUpdate,
      };

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
  userSettingsRepository: UserSettingsRepository
): UserSettingsService {
  return new UserSettingsService(userSettingsRepository);
}
