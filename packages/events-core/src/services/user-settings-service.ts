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

    // Subscribe to user settings events
    this.eventBus.subscribe<ClientUpdateUserSettingsEvent>(
      "ClientUpdateUserSettings",
      this.handleUserSettingsUpdate.bind(this)
    );
  }

  /**
   * Handle user settings update events
   */
  private async handleUserSettingsUpdate(
    event: ClientUpdateUserSettingsEvent
  ): Promise<void> {
    this.logger.info(`Handling user settings update: ${event.type}`);

    try {
      switch (event.type) {
        case "PROJECT_FOLDER_ADDED":
          if (!event.projectFolderPath) {
            this.logger.error(
              "Project folder path is required for add operation"
            );
            return;
          }
          await this.projectFolderService.addProjectFolder(
            event.projectFolderPath,
            event.correlationId
          );
          break;
        case "PROJECT_FOLDER_REMOVED":
          if (!event.projectFolderId) {
            this.logger.error(
              "Project folder ID is required for remove operation"
            );
            return;
          }
          await this.projectFolderService.removeProjectFolder(
            event.projectFolderId,
            event.correlationId
          );
          break;
        default:
          this.logger.warn(`Unknown settings update type: ${event.type}`);
          return;
      }
    } catch (error) {
      this.logger.error(`Error handling user settings update: ${error}`);
    }
  }

  /**
   * Get current user settings
   */
  public async getUserSettings(): Promise<UserSettings> {
    return this.userSettingsRepository.getSettings();
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
