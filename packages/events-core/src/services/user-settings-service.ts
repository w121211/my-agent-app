// File path: packages/events-core/src/services/user-settings-service.ts

import { Logger, ILogObj } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type { BaseEvent } from "../event-types.js";
import type {
  UserSettingsRepository,
  UserSettings,
} from "./user-settings-repository.js";
import type { WorkspaceService } from "./workspace-service.js";

// Event type definitions
export type UserSettingsUpdateType = "WORKSPACE_ADDED" | "WORKSPACE_REMOVED";

export interface ClientUpdateUserSettingsEvent extends BaseEvent {
  kind: "ClientUpdateUserSettings";
  type: UserSettingsUpdateType;
  workspacePath?: string;
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
  private readonly workspaceService: WorkspaceService;

  constructor(
    eventBus: IEventBus,
    userSettingsRepository: UserSettingsRepository,
    workspaceService: WorkspaceService
  ) {
    this.logger = new Logger({ name: "UserSettingsService" });
    this.eventBus = eventBus;
    this.userSettingsRepository = userSettingsRepository;
    this.workspaceService = workspaceService;

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

    if (
      !event.workspacePath &&
      (event.type === "WORKSPACE_ADDED" || event.type === "WORKSPACE_REMOVED")
    ) {
      this.logger.error("Workspace path is required for workspace updates");
      return;
    }

    try {
      switch (event.type) {
        case "WORKSPACE_ADDED":
          await this.workspaceService.addWorkspace(
            event.workspacePath!,
            event.correlationId
          );
          break;
        case "WORKSPACE_REMOVED":
          await this.workspaceService.removeWorkspace(
            event.workspacePath!,
            event.correlationId
          );
          break;
        default:
          this.logger.warn(`Unknown settings update type: ${event.type}`);
          return;
      }

      // Get current settings after workspace operation
      const settings = await this.userSettingsRepository.getSettings();

      // Emit settings updated event
      await this.eventBus.emit<ServerUserSettingsUpdatedEvent>({
        kind: "ServerUserSettingsUpdated",
        timestamp: new Date(),
        correlationId: event.correlationId,
        settings,
        changeType: event.type,
      });
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
  workspaceService: WorkspaceService
): UserSettingsService {
  return new UserSettingsService(
    eventBus,
    userSettingsRepository,
    workspaceService
  );
}
