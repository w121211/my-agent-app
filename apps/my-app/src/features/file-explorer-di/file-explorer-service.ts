import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";
import { type IEventBus } from "@repo/events-core/event-bus";
import {
  FileExplorerEventType,
  FileSystemNode,
  FileExplorerEventUnion,
} from "./file-explorer-types";
import { useFileExplorerStore } from "./file-explorer-store";
import { DI_TOKENS } from "./di-tokens";

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
    // Register handlers for all file explorer events
    Object.values(FileExplorerEventType).forEach((eventType) => {
      this.eventBus.subscribe(eventType, (event: FileExplorerEventUnion) => {
        this.handleEvent(event);
      });
    });

    this.logger.debug("Registered event handlers for file explorer events");
  }

  private handleEvent(event: FileExplorerEventUnion): void {
    const store = useFileExplorerStore.getState();

    switch (event.eventType) {
      case "CLIENT_EXPLORER_FILE_CREATED":
        store.createFile(event.parentPath, event.name);
        break;

      case "CLIENT_EXPLORER_FILE_DELETED":
        store.deleteNode(event.fileId);
        break;

      case "CLIENT_EXPLORER_FILE_RENAMED":
        store.renameNode(event.fileId, event.newName);
        break;

      case "CLIENT_EXPLORER_FILE_MOVED":
        const fileMoveNode = store.getNodeById(event.fileId);
        if (fileMoveNode) {
          const newParentPath = event.newPath.substring(
            0,
            event.newPath.lastIndexOf("/")
          );
          store.moveNode(event.fileId, newParentPath || null);
        }
        break;

      case "CLIENT_EXPLORER_DIRECTORY_CREATED":
        store.createDirectory(event.parentPath, event.name);
        break;

      case "CLIENT_EXPLORER_DIRECTORY_DELETED":
        store.deleteNode(event.directoryId);
        break;

      case "CLIENT_EXPLORER_DIRECTORY_RENAMED":
        store.renameNode(event.directoryId, event.newName);
        break;

      case "CLIENT_EXPLORER_DIRECTORY_MOVED":
        const dirMoveNode = store.getNodeById(event.directoryId);
        if (dirMoveNode) {
          const newParentPath = event.newPath.substring(
            0,
            event.newPath.lastIndexOf("/")
          );
          store.moveNode(event.directoryId, newParentPath || null);
        }
        break;

      case "CLIENT_EXPLORER_NODE_SELECTED":
        store.selectNode(event.nodeId);
        break;

      case "CLIENT_EXPLORER_DIRECTORY_EXPANDED":
        store.expandDirectory(event.directoryId);
        break;

      case "CLIENT_EXPLORER_DIRECTORY_COLLAPSED":
        store.collapseDirectory(event.directoryId);
        break;

      default:
        this.logger.warn(
          `Unhandled file explorer event type: ${(event as any).eventType}`
        );
    }
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
