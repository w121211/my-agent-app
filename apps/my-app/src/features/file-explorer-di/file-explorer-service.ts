import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";
import { type IEventBus } from "@repo/events-core/event-bus";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import {
  FileSystemNode,
  ClientExplorerFileCreatedEvent,
  ClientExplorerFileDeletedEvent,
  ClientExplorerFileRenamedEvent,
  ClientExplorerFileMovedEvent,
  ClientExplorerDirectoryCreatedEvent,
  ClientExplorerDirectoryDeletedEvent,
  ClientExplorerDirectoryRenamedEvent,
  ClientExplorerDirectoryMovedEvent,
  ClientExplorerNodeSelectedEvent,
  ClientExplorerDirectoryExpandedEvent,
  ClientExplorerDirectoryCollapsedEvent,
} from "./file-explorer-types";
import { useFileExplorerStore } from "./file-explorer-store";

@injectable()
export class FileExplorerService {
  private logger: Logger<ILogObj>;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger =
      logger || new Logger<ILogObj>({ name: "FileExplorerService" });
    this.registerEventHandlers();

    this.logger.debug("FileExplorerService initialized");
  }

  private registerEventHandlers(): void {
    const store = useFileExplorerStore.getState();

    // Register handlers for each file explorer event directly
    this.eventBus.subscribe(
      "CLIENT_EXPLORER_FILE_CREATED",
      (event: ClientExplorerFileCreatedEvent) => {
        store.createFile(event.parentPath, event.name);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_FILE_DELETED",
      (event: ClientExplorerFileDeletedEvent) => {
        store.deleteNode(event.fileId);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_FILE_RENAMED",
      (event: ClientExplorerFileRenamedEvent) => {
        store.renameNode(event.fileId, event.newName);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_FILE_MOVED",
      (event: ClientExplorerFileMovedEvent) => {
        const newParentPath = event.newPath.substring(
          0,
          event.newPath.lastIndexOf("/")
        );
        store.moveNode(event.fileId, newParentPath || null);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_DIRECTORY_CREATED",
      (event: ClientExplorerDirectoryCreatedEvent) => {
        store.createDirectory(event.parentPath, event.name);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_DIRECTORY_DELETED",
      (event: ClientExplorerDirectoryDeletedEvent) => {
        store.deleteNode(event.directoryId);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_DIRECTORY_RENAMED",
      (event: ClientExplorerDirectoryRenamedEvent) => {
        store.renameNode(event.directoryId, event.newName);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_DIRECTORY_MOVED",
      (event: ClientExplorerDirectoryMovedEvent) => {
        const newParentPath = event.newPath.substring(
          0,
          event.newPath.lastIndexOf("/")
        );
        store.moveNode(event.directoryId, newParentPath || null);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_NODE_SELECTED",
      (event: ClientExplorerNodeSelectedEvent) => {
        store.selectNode(event.nodeId);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_DIRECTORY_EXPANDED",
      (event: ClientExplorerDirectoryExpandedEvent) => {
        store.expandDirectory(event.directoryId);
      }
    );

    this.eventBus.subscribe(
      "CLIENT_EXPLORER_DIRECTORY_COLLAPSED",
      (event: ClientExplorerDirectoryCollapsedEvent) => {
        store.collapseDirectory(event.directoryId);
      }
    );

    this.logger.debug("Registered event handlers for file explorer events");
  }

  // Public methods that emit events
  public createFile(parentPath: string | null, name: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_FILE_CREATED" as const,
      timestamp: new Date(),
      fileId: "temp",
      parentPath,
      name,
    };
    this.eventBus.emit(event);
  }

  public deleteFile(fileId: string, path: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_FILE_DELETED" as const,
      timestamp: new Date(),
      fileId,
      path,
    };
    this.eventBus.emit(event);
  }

  public renameFile(fileId: string, oldName: string, newName: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_FILE_RENAMED" as const,
      timestamp: new Date(),
      fileId,
      oldName,
      newName,
    };
    this.eventBus.emit(event);
  }

  public moveFile(fileId: string, oldPath: string, newPath: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_FILE_MOVED" as const,
      timestamp: new Date(),
      fileId,
      oldPath,
      newPath,
    };
    this.eventBus.emit(event);
  }

  public createDirectory(parentPath: string | null, name: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_DIRECTORY_CREATED" as const,
      timestamp: new Date(),
      directoryId: "temp",
      parentPath,
      name,
    };
    this.eventBus.emit(event);
  }

  public deleteDirectory(directoryId: string, path: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_DIRECTORY_DELETED" as const,
      timestamp: new Date(),
      directoryId,
      path,
    };
    this.eventBus.emit(event);
  }

  public renameDirectory(
    directoryId: string,
    oldName: string,
    newName: string
  ): void {
    const event = {
      eventType: "CLIENT_EXPLORER_DIRECTORY_RENAMED" as const,
      timestamp: new Date(),
      directoryId,
      oldName,
      newName,
    };
    this.eventBus.emit(event);
  }

  public moveDirectory(
    directoryId: string,
    oldPath: string,
    newPath: string
  ): void {
    const event = {
      eventType: "CLIENT_EXPLORER_DIRECTORY_MOVED" as const,
      timestamp: new Date(),
      directoryId,
      oldPath,
      newPath,
    };
    this.eventBus.emit(event);
  }

  public selectNode(nodeId: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_NODE_SELECTED" as const,
      timestamp: new Date(),
      nodeId,
    };
    this.eventBus.emit(event);
  }

  public expandDirectory(directoryId: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_DIRECTORY_EXPANDED" as const,
      timestamp: new Date(),
      directoryId,
    };
    this.eventBus.emit(event);
  }

  public collapseDirectory(directoryId: string): void {
    const event = {
      eventType: "CLIENT_EXPLORER_DIRECTORY_COLLAPSED" as const,
      timestamp: new Date(),
      directoryId,
    };
    this.eventBus.emit(event);
  }

  public toggleDirectoryExpansion(directoryId: string): void {
    const isExpanded = useFileExplorerStore
      .getState()
      .expandedDirectories.has(directoryId);

    if (isExpanded) {
      this.collapseDirectory(directoryId);
    } else {
      this.expandDirectory(directoryId);
    }
  }

  // Load initial file tree
  public loadFileTree(rootNodes: FileSystemNode[]): void {
    useFileExplorerStore.getState().loadFileTree(rootNodes);
    this.logger.debug("Loaded initial file tree");
  }
}
