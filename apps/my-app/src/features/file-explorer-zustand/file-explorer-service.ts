import { ILogObj, Logger } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  FileExplorerEventType,
  FileSystemNode,
  FileExplorerEventUnion,
} from "../file-explorer-di/file-explorer-types";

const logger = new Logger<ILogObj>({ name: "FileExplorerService" });

// Interface for the store state we need to access
export interface FileExplorerStoreAPI {
  createFile: (parentPath: string | null, name: string) => string;
  deleteNode: (nodeId: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  moveNode: (nodeId: string, newParentPath: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  expandDirectory: (directoryId: string) => void;
  collapseDirectory: (directoryId: string) => void;
  loadFileTree: (rootNodes: FileSystemNode[]) => void;
  getNodeById: (id: string) => FileSystemNode | null;
  expandedDirectories: Set<string>;
  createDirectory: (parentPath: string | null, name: string) => string;
}

export class FileExplorerService {
  private eventBus: IEventBus;
  private getStore: () => FileExplorerStoreAPI;

  constructor(eventBus: IEventBus, getStore: () => FileExplorerStoreAPI) {
    this.eventBus = eventBus;
    this.getStore = getStore;
    this.registerEventHandlers();

    logger.debug("FileExplorerService initialized");
  }

  private registerEventHandlers(): void {
    Object.values(FileExplorerEventType).forEach((eventType) => {
      this.eventBus.subscribe<FileExplorerEventUnion>(eventType, (event) => {
        this.handleEvent(event);
      });
    });

    logger.debug("Registered event handlers for file explorer events");
  }

  private handleEvent(event: FileExplorerEventUnion): void {
    const store = this.getStore();

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
        logger.warn(
          `Unhandled file explorer event type: ${(event as unknown).eventType}`
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
    const isExpanded = this.getStore().expandedDirectories.has(directoryId);

    if (isExpanded) {
      this.collapseDirectory(directoryId);
    } else {
      this.expandDirectory(directoryId);
    }
  }

  // Load initial file tree
  public loadFileTree(rootNodes: FileSystemNode[]): void {
    this.getStore().loadFileTree(rootNodes);
    logger.debug("Loaded initial file tree");
  }
}
