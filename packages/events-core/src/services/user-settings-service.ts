// packages/events-core/src/services/user-settings-service.ts
import { Logger, ILogObj } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type { BaseEvent } from "../event-types.js";
import type {
  UserSettingsRepository,
  UserSettings,
} from "./user-settings-repository.js";
import type { ProjectFolderService } from "./project-folder-service.js";

// Event type definitions
export type UserSettingsUpdateType =
  | "PROJECT_FOLDER_ADDED"
  | "PROJECT_FOLDER_REMOVED";

export interface ClientUpdateUserSettingsEvent extends BaseEvent {
  kind: "ClientUpdateUserSettings";
  type: UserSettingsUpdateType;
  projectFolderPath?: string;
  projectFolderId?: string;
}

export interface ServerUserSettingsUpdatedEvent extends BaseEvent {
  kind: "ServerUserSettingsUpdated";
  settings: UserSettings;
  changeType: UserSettingsUpdateType;
}

/**
 * Service for managing user settings
 */
export class UserSettingsService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly userSettingsRepository: UserSettingsRepository;
  private readonly projectFolderService: ProjectFolderService;

  constructor(
    eventBus: IEventBus,
    userSettingsRepository: UserSettingsRepository,
    projectFolderService: ProjectFolderService
  ) {
    this.logger = new Logger({ name: "UserSettingsService" });
    this.eventBus = eventBus;
    this.userSettingsRepository = userSettingsRepository;
    this.projectFolderService = projectFolderService;
  }

  /**
   * Get current user settings
   */
  public async getUserSettings(): Promise<UserSettings> {
    return this.userSettingsRepository.getSettings();
  }

  /**
   * Update user settings
   */
  public async updateUserSettings(
    settingsUpdate: Record<string, unknown>,
    correlationId?: string
  ): Promise<{ success: boolean; message?: string }> {
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
      Object.keys(settingsUpdate).forEach((key) => {
        if (key !== "projectFolders") {
          // For now, just update any fields other than projectFolders directly
          (updatedSettings as any)[key] = settingsUpdate[key];
        }
      });

      // Save updated settings
      await this.userSettingsRepository.saveSettings(updatedSettings);

      this.logger.info("User settings updated successfully");
      return { success: true };
    } catch (error) {
      this.logger.error(`Error updating user settings: ${error}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Factory function to create a user settings service
 */
export function createUserSettingsService(
  eventBus: IEventBus,
  userSettingsRepository: UserSettingsRepository,
  projectFolderService: ProjectFolderService
): UserSettingsService {
  return new UserSettingsService(
    eventBus,
    userSettingsRepository,
    projectFolderService
  );
}
