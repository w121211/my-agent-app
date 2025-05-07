/**
 * pnpm tsx ./examples/workspace-events-demo.ts
 */
import { Logger, ILogObj } from "tslog";
import path from "node:path";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createServerEventBus, IEventBus } from "../src/event-bus.js";
import {
  createUserSettingsRepository,
  UserSettingsRepository,
  UserSettings,
} from "../src/user-settings-repository.js";
import {
  createWorkspaceService,
  WorkspaceService,
  ClientRequestStartWatchingAllWorkspacesEvent,
} from "../src/workspace-service.js";
import {
  createUserSettingsService,
  UserSettingsService,
  ServerUserSettingsUpdatedEvent,
  ClientUpdateUserSettingsEvent,
} from "../src/user-settings-service.js";
import {
  createFileWatcherService,
  FileWatcherService,
} from "../src/file-watcher-service.js";
import {
  FolderTreeNode,
  ServerWorkspaceFolderTreeResponsedEvent,
  ClientRequestWorkspaceFolderTreeEvent,
} from "../src/event-types.js";
import { ServerWorkspaceValidatedEvent } from "../src/workspace-service.js";

// Setup workspace and initialize services
async function setupDemo() {
  const logger: Logger<ILogObj> = new Logger({
    name: "WorkspaceManagementDemo",
  });

  // Create temp directory for settings
  const configDirPath = path.join(process.cwd(), "temp-config");
  await fs.mkdir(configDirPath, { recursive: true });

  // Create test workspace directories to add/remove
  const testWorkspace1 = path.join(process.cwd(), "test-workspace-1");
  const testWorkspace2 = path.join(process.cwd(), "test-workspace-2");

  await fs.mkdir(testWorkspace1, { recursive: true });
  await fs.mkdir(testWorkspace2, { recursive: true });

  // Create a sample file in test workspace 1 for demonstration
  await fs.writeFile(
    path.join(testWorkspace1, "sample.txt"),
    "This is a sample file for workspace demo."
  );

  logger.info(`Created config directory at: ${configDirPath}`);
  logger.info(
    `Created test workspaces at: ${testWorkspace1} and ${testWorkspace2}`
  );

  // Initialize event bus
  const eventBus = createServerEventBus();

  // Initialize repositories and services
  const userSettingsRepository = createUserSettingsRepository(configDirPath);
  const workspaceService = createWorkspaceService(
    eventBus,
    userSettingsRepository
  );
  const userSettingsService = createUserSettingsService(
    eventBus,
    userSettingsRepository,
    workspaceService
  );
  const fileWatcherService = createFileWatcherService(eventBus);

  // Log all events for demonstration
  eventBus.subscribeToAllServerEvents((event) => {
    logger.info(`Server Event: ${event.kind}`, {
      timestamp: event.timestamp,
      correlationId: event.correlationId,
    });
  });

  return {
    logger,
    eventBus,
    configDirPath,
    testWorkspace1,
    testWorkspace2,
    userSettingsRepository,
    workspaceService,
    userSettingsService,
    fileWatcherService,
  };
}

// Demo Add Workspace Flow
async function demoAddWorkspace(
  eventBus: IEventBus,
  logger: Logger<ILogObj>,
  workspacePath: string
): Promise<string> {
  logger.info("=== Starting Add Workspace Flow ===");

  const correlationId = uuidv4();

  // Track workspace validation
  let isWorkspaceValid = false;
  let workspaceValidationMsg = "";

  // Track user settings updates
  let updatedSettings: UserSettings | null = null;

  // Track folder tree response
  let folderTree: FolderTreeNode | null = null;

  // Subscribe to events
  const validationUnsubscribe =
    eventBus.subscribe<ServerWorkspaceValidatedEvent>(
      "ServerWorkspaceValidated",
      (event) => {
        if (event.correlationId === correlationId) {
          isWorkspaceValid = event.isValid;
          workspaceValidationMsg =
            event.validationMessage || "Validation successful";
          logger.info(
            `Workspace validation: ${isWorkspaceValid ? "Valid" : "Invalid"}`
          );
        }
      }
    );

  const settingsUpdatedUnsubscribe =
    eventBus.subscribe<ServerUserSettingsUpdatedEvent>(
      "ServerUserSettingsUpdated",
      (event) => {
        if (event.correlationId === correlationId) {
          updatedSettings = event.settings;
          logger.info(
            `User settings updated with change type: ${event.changeType}`
          );
        }
      }
    );

  const folderTreeUnsubscribe =
    eventBus.subscribe<ServerWorkspaceFolderTreeResponsedEvent>(
      "ServerWorkspaceFolderTreeResponsed",
      (event) => {
        if (event.correlationId === correlationId) {
          folderTree = event.folderTree;
          logger.info(
            `Received workspace folder tree for: ${event.workspacePath}`
          );
        }
      }
    );

  // Mock user adding a workspace through settings page
  const addWorkspaceEvent: ClientUpdateUserSettingsEvent = {
    kind: "ClientUpdateUserSettings",
    type: "WORKSPACE_ADDED",
    workspacePath,
    timestamp: new Date(),
    correlationId,
  };

  logger.info(
    `Emitting event: ClientUpdateUserSettings (WORKSPACE_ADDED) for ${workspacePath}`
  );
  await eventBus.emit(addWorkspaceEvent);

  // Wait for workspace validation and settings update
  await new Promise((resolve) => setTimeout(resolve, 500));

  // If workspace is valid, request folder tree
  if (isWorkspaceValid) {
    const requestTreeEvent: ClientRequestWorkspaceFolderTreeEvent = {
      kind: "ClientRequestWorkspaceFolderTree",
      workspacePath,
      timestamp: new Date(),
      correlationId,
    };

    logger.info(
      `Emitting event: ClientRequestWorkspaceFolderTree for ${workspacePath}`
    );
    await eventBus.emit(requestTreeEvent);

    // Wait for folder tree response
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Unsubscribe from events
  validationUnsubscribe();
  settingsUpdatedUnsubscribe();
  folderTreeUnsubscribe();

  logger.info("=== Add Workspace Flow Completed ===");

  if (!isWorkspaceValid) {
    logger.warn(`Workspace validation failed: ${workspaceValidationMsg}`);
  } else if (folderTree) {
    logger.info("Workspace folder tree structure received");
  }

  return correlationId;
}

// Demo Remove Workspace Flow
async function demoRemoveWorkspace(
  eventBus: IEventBus,
  logger: Logger<ILogObj>,
  workspacePath: string
): Promise<string> {
  logger.info("=== Starting Remove Workspace Flow ===");

  const correlationId = uuidv4();

  // Track user settings updates
  let updatedSettings: UserSettings | null = null;

  // Subscribe to settings updated event
  const settingsUpdatedUnsubscribe =
    eventBus.subscribe<ServerUserSettingsUpdatedEvent>(
      "ServerUserSettingsUpdated",
      (event) => {
        if (event.correlationId === correlationId) {
          updatedSettings = event.settings;
          logger.info(
            `User settings updated with change type: ${event.changeType}`
          );
        }
      }
    );

  // Mock user removing a workspace through settings page
  const removeWorkspaceEvent: ClientUpdateUserSettingsEvent = {
    kind: "ClientUpdateUserSettings",
    type: "WORKSPACE_REMOVED",
    workspacePath,
    timestamp: new Date(),
    correlationId,
  };

  logger.info(
    `Emitting event: ClientUpdateUserSettings (WORKSPACE_REMOVED) for ${workspacePath}`
  );
  await eventBus.emit(removeWorkspaceEvent);

  // Wait for settings update
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Unsubscribe from events
  settingsUpdatedUnsubscribe();

  logger.info("=== Remove Workspace Flow Completed ===");

  if (updatedSettings) {
    logger.info(
      `Updated workspace list: ${(updatedSettings as UserSettings).workspaces.join(", ") || "Empty"}`
    );
  }

  return correlationId;
}

// Demo request workspace folder tree
async function demoRequestWorkspaceTree(
  eventBus: IEventBus,
  logger: Logger<ILogObj>,
  workspacePath: string
): Promise<void> {
  logger.info("=== Starting Request Workspace Tree Flow ===");

  const correlationId = uuidv4();

  // Track folder tree response
  let folderTree: FolderTreeNode | null = null;

  // Subscribe to folder tree response event
  const folderTreeUnsubscribe =
    eventBus.subscribe<ServerWorkspaceFolderTreeResponsedEvent>(
      "ServerWorkspaceFolderTreeResponsed",
      (event) => {
        if (event.correlationId === correlationId) {
          folderTree = event.folderTree;
          logger.info(
            `Received workspace folder tree for: ${event.workspacePath}`
          );
        }
      }
    );

  // Mock user requesting workspace tree
  const requestTreeEvent: ClientRequestWorkspaceFolderTreeEvent = {
    kind: "ClientRequestWorkspaceFolderTree",
    workspacePath,
    timestamp: new Date(),
    correlationId,
  };

  logger.info(
    `Emitting event: ClientRequestWorkspaceFolderTree for ${workspacePath}`
  );
  await eventBus.emit(requestTreeEvent);

  // Wait for folder tree response
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Unsubscribe from events
  folderTreeUnsubscribe();

  logger.info("=== Request Workspace Tree Flow Completed ===");

  if (folderTree) {
    logger.info("Workspace folder tree structure received");
  } else {
    logger.warn("No folder tree received");
  }
}

// Demo start watching all workspaces
async function demoStartWatchingAllWorkspaces(
  eventBus: IEventBus,
  logger: Logger<ILogObj>,
  fileWatcherService: FileWatcherService
): Promise<void> {
  logger.info("=== Starting Watch All Workspaces Flow ===");

  const correlationId = uuidv4();

  // Log current watched folders before starting
  const watchedFoldersBefore = fileWatcherService.getWatchedFolders();
  logger.info(
    `Currently watching ${watchedFoldersBefore.length} folders: ${watchedFoldersBefore.join(", ") || "None"}`
  );

  // Create the client event to request watching all workspaces
  const startWatchingEvent: ClientRequestStartWatchingAllWorkspacesEvent = {
    kind: "ClientRequestStartWatchingAllWorkspaces",
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Emitting event: ClientRequestStartWatchingAllWorkspaces");
  await eventBus.emit(startWatchingEvent);

  // Wait a bit for the watching to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Log current watched folders after starting
  const watchedFoldersAfter = fileWatcherService.getWatchedFolders();
  logger.info(
    `Now watching ${watchedFoldersAfter.length} folders: ${watchedFoldersAfter.join(", ") || "None"}`
  );

  logger.info("=== Start Watching All Workspaces Flow Completed ===");
}

// Demo stop all file watchers
async function demoStopAllWatchers(
  fileWatcherService: FileWatcherService,
  logger: Logger<ILogObj>
): Promise<void> {
  logger.info("=== Starting Stop All Watchers Flow ===");

  // Log the currently watched folders before stopping
  const watchedFolders = fileWatcherService.getWatchedFolders();
  logger.info(
    `Currently watching ${watchedFolders.length} folders: ${watchedFolders.join(", ") || "None"}`
  );

  // Stop all watchers directly using the service method
  await fileWatcherService.stopAllWatchers();

  // Verify that all watchers are stopped
  const watchedFoldersAfter = fileWatcherService.getWatchedFolders();
  logger.info(
    `After stopping, watching ${watchedFoldersAfter.length} folders: ${watchedFoldersAfter.join(", ") || "None"}`
  );

  logger.info("=== Stop All Watchers Flow Completed ===");
}

// Main demo function
async function main() {
  const {
    logger,
    eventBus,
    configDirPath,
    testWorkspace1,
    testWorkspace2,
    userSettingsRepository,
    fileWatcherService,
  } = await setupDemo();

  try {
    // Show initial state
    let settings = await userSettingsRepository.getSettings();
    logger.info("Initial user settings:", settings);

    // Demo Add Workspace 1
    await demoAddWorkspace(eventBus, logger, testWorkspace1);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Show settings after adding first workspace
    settings = await userSettingsRepository.getSettings();
    logger.info("Settings after adding workspace 1:", settings);

    // Demo Request Workspace Tree for workspace 1
    await demoRequestWorkspaceTree(eventBus, logger, testWorkspace1);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo Add Workspace 2
    await demoAddWorkspace(eventBus, logger, testWorkspace2);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Show settings after adding second workspace
    settings = await userSettingsRepository.getSettings();
    logger.info("Settings after adding workspace 2:", settings);

    // Demo start watching all workspaces
    await demoStartWatchingAllWorkspaces(eventBus, logger, fileWatcherService);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo stop all watchers
    await demoStopAllWatchers(fileWatcherService, logger);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo Remove Workspace 1
    await demoRemoveWorkspace(eventBus, logger, testWorkspace1);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Show final settings
    settings = await userSettingsRepository.getSettings();
    logger.info("Final settings:", settings);

    logger.info("All demo flows completed successfully!");
  } catch (error) {
    logger.error("Error during demo:", error);
  } finally {
    // Cleanup
    try {
      await fs.rm(configDirPath, { recursive: true, force: true });
      await fs.rm(testWorkspace1, { recursive: true, force: true });
      await fs.rm(testWorkspace2, { recursive: true, force: true });
      logger.info("Cleaned up demo directories");
    } catch (cleanupError) {
      logger.error("Error during cleanup:", cleanupError);
    }
  }
}

// Run the demo
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
