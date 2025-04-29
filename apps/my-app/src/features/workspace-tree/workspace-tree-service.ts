import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";

import { type IEventBus } from "@repo/events-core/event-bus";
import {
  ServerFileWatcherEvent,
  ChokidarFsEventData,
  ServerWorkspaceFolderTreeResponsedEvent,
  FolderTreeNode as ServerFolderTreeNode,
  ServerFileOpenedEvent,
} from "@repo/events-core/event-types";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import {
  useWorkspaceTreeStore,
  TreeNode,
  FileTreeNode,
  FolderTreeNode,
  isFolderNode,
  normalizePath,
  getParentPath,
  getBasename,
} from "./workspace-tree-store";

@injectable()
export class WorkspaceTreeService {
  private logger: Logger<ILogObj>;
  private isInitialized = false;
  private pendingFsEvents: ChokidarFsEventData[] = [];
  private pendingTreeResponse = false;

  // Retry mechanism properties
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: number | null = null;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger =
      logger || new Logger<ILogObj>({ name: "WorkspaceTreeService" });
    this.registerEventHandlers();
    this.logger.debug("WorkspaceTreeService initialized");
  }

  private registerEventHandlers(): void {
    // Subscribe to file watcher events
    this.eventBus.subscribe<ServerFileWatcherEvent>(
      "ServerFileWatcherEvent",
      (event) => this.handleFileWatcherEvent(event)
    );

    // Subscribe to workspace folder tree response events
    this.eventBus.subscribe<ServerWorkspaceFolderTreeResponsedEvent>(
      "ServerWorkspaceFolderTreeResponsed",
      (event) => this.handleWorkspaceTreeResponse(event)
    );

    // Subscribe to file opened events
    this.eventBus.subscribe<ServerFileOpenedEvent>(
      "ServerFileOpened",
      (event) => this.handleFileOpenedEvent(event)
    );
  }

  /**
   * Handles file opened events from the server
   * Identifies file type and selects the node in the tree
   */
  private handleFileOpenedEvent(event: ServerFileOpenedEvent): void {
    const { filePath, fileType, content } = event;

    // Select the node in the tree
    this.selectNode(filePath);

    // Determine if this is a chat file
    const isChatFile = this.isChatFile(filePath, fileType);

    this.logger.info(
      `File opened: ${filePath}, type: ${fileType}, isChatFile: ${isChatFile}`
    );

    // Note: Other services will be listening for ServerFileOpened events
    // and will handle displaying the content in the appropriate panel
  }

  /**
   * Determines if a file is a chat file based on fileType and path
   */
  private isChatFile(filePath: string, fileType: string): boolean {
    // Check if file is a chat file based on fileType
    if (fileType === "chat" || fileType === "application/json") {
      // Further check file extension or path patterns for chat files
      return (
        filePath.endsWith(".chat.json") ||
        filePath.includes("/chats/") ||
        filePath.endsWith(".v1.json") ||
        filePath.endsWith(".v2.json")
      );
    }
    return false;
  }

  private handleFileWatcherEvent(event: ServerFileWatcherEvent): void {
    const fsEvent = event.data;
    this.logger.debug(
      `Received file watcher event: ${fsEvent.fsEventKind} - ${fsEvent.srcPath}`
    );

    // If we're not initialized yet and this is not a "ready" event, store it for later processing
    if (!this.isInitialized && fsEvent.fsEventKind !== "ready") {
      this.pendingFsEvents.push(fsEvent);
      return;
    }

    // If this is a "ready" event, process all pending events
    if (fsEvent.fsEventKind === "ready") {
      this.initializeWorkspaceTree();
      return;
    }

    // Otherwise, process the event immediately
    this.processFsEvent(fsEvent);
  }

  private handleWorkspaceTreeResponse(
    event: ServerWorkspaceFolderTreeResponsedEvent
  ): void {
    this.logger.debug(
      `Received workspace tree response for path: ${event.workspacePath}`
    );

    // Reset retry state on any response
    this.resetRetryState();

    if (event.error) {
      this.logger.error(`Error retrieving workspace tree: ${event.error}`);
      this.pendingTreeResponse = false;
      return;
    }

    if (!event.folderTree) {
      this.logger.warn("Received empty folder tree response");
      this.pendingTreeResponse = false;
      return;
    }

    // Convert server folder tree to store format and update the store
    this.updateStoreWithFolderTree(event.folderTree);

    // Mark as initialized and process any pending events
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.logger.info("Workspace tree initialized via server response");
      this.processPendingEvents();
    }

    this.pendingTreeResponse = false;
  }

  // Process any pending file system events after initialization
  private processPendingEvents(): void {
    if (this.pendingFsEvents.length === 0) {
      return;
    }

    this.logger.info(
      `Processing ${this.pendingFsEvents.length} pending file system events`
    );

    // Sort events: directories first, then by path length
    const sortedEvents = [...this.pendingFsEvents].sort((a, b) => {
      // Directories before files
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      // Shorter paths (parent directories) before longer paths
      return a.srcPath.length - b.srcPath.length;
    });

    // Process each event
    for (const event of sortedEvents) {
      this.processFsEvent(event);
    }

    // Clear pending events
    this.pendingFsEvents = [];
  }

  private resetRetryState(): void {
    this.retryCount = 0;
    if (this.retryTimeout !== null) {
      window.clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private updateStoreWithFolderTree(serverTree: ServerFolderTreeNode): void {
    const store = useWorkspaceTreeStore.getState();

    // Create the root folder if it doesn't exist
    if (!store.root) {
      const rootNode: FolderTreeNode = {
        id: "root",
        name: "workspace",
        type: "folder",
        path: "/",
        children: [],
      };
      store.setRoot(rootNode);
    }

    // Convert server tree format to store format recursively
    const convertedTree = this.convertFolderTreeFormat(serverTree);

    if (convertedTree && isFolderNode(convertedTree)) {
      // If we're updating the root, replace it
      if (convertedTree.path === "/") {
        store.setRoot(convertedTree);
      } else {
        // Otherwise, add it as a child to the appropriate parent
        const parentPath = getParentPath(convertedTree.path);
        store.addNode(parentPath, convertedTree);
      }
      this.logger.info(`Updated workspace tree with data from server response`);
    }
  }

  private convertFolderTreeFormat(serverNode: ServerFolderTreeNode): TreeNode {
    const normalizedPath = normalizePath(serverNode.path);
    const nodeName = getBasename(normalizedPath);

    if (!serverNode.isDirectory) {
      // Convert file node
      return {
        id: `file-${Date.now()}-${normalizedPath}`,
        name: nodeName || serverNode.name,
        type: "file",
        path: normalizedPath,
      };
    } else {
      // Convert folder node and its children recursively
      const children: TreeNode[] = serverNode.children
        ? serverNode.children.map((child) =>
            this.convertFolderTreeFormat(child)
          )
        : [];

      return {
        id: `dir-${Date.now()}-${normalizedPath}`,
        name: nodeName || serverNode.name,
        type: "folder",
        path: normalizedPath,
        children,
      };
    }
  }

  private initializeWorkspaceTree(): void {
    this.logger.info(
      `Initializing workspace tree with ${this.pendingFsEvents.length} events from file watcher`
    );

    const store = useWorkspaceTreeStore.getState();

    // Create the root folder if it doesn't exist
    if (!store.root) {
      const rootNode: FolderTreeNode = {
        id: "root",
        name: "workspace",
        type: "folder",
        path: "/",
        children: [],
      };
      store.setRoot(rootNode);
    }

    // Sort events: directories first, then by path length
    const sortedEvents = [...this.pendingFsEvents].sort((a, b) => {
      // Directories before files
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      // Shorter paths (parent directories) before longer paths
      return a.srcPath.length - b.srcPath.length;
    });

    // Process each event
    for (const event of sortedEvents) {
      if (event.fsEventKind === "add" || event.fsEventKind === "addDir") {
        this.handleAddEvent(event.srcPath, event.isDirectory);
      }
    }

    // Mark as initialized and clear pending events
    this.isInitialized = true;
    this.pendingFsEvents = [];
    this.logger.info(
      "Workspace explorer initialization complete via file watcher events"
    );

    // Request a full tree to ensure we have the most up-to-date view
    if (!this.pendingTreeResponse) {
      this.requestWorkspaceTree();
    }
  }

  private processFsEvent(fsEvent: ChokidarFsEventData): void {
    const { fsEventKind, srcPath, isDirectory } = fsEvent;

    // Handle each event type
    switch (fsEventKind) {
      case "add":
      case "addDir":
        this.handleAddEvent(srcPath, isDirectory);
        break;

      case "unlink":
      case "unlinkDir":
        this.handleRemoveEvent(srcPath);
        break;

      case "change":
        this.handleFileChangeEvent(srcPath);
        break;

      case "error":
        this.logger.error(
          `File watcher error: ${fsEvent.error?.message || "Unknown error"}`
        );
        break;
    }
  }

  private handleAddEvent(srcPath: string, isDirectory: boolean): void {
    const store = useWorkspaceTreeStore.getState();

    if (!store.root) {
      this.logger.warn("Cannot add node: root is null");
      return;
    }

    // Normalize the path
    const normalizedPath = normalizePath(srcPath);
    if (!normalizedPath) return;

    // Get the parent path and file name
    const parentPath = getParentPath(normalizedPath);
    const fileName = getBasename(normalizedPath);

    // Create the new node
    const newNode: TreeNode = isDirectory
      ? {
          id: `dir-${Date.now()}-${normalizedPath}`,
          name: fileName,
          type: "folder",
          path: normalizedPath,
          children: [],
        }
      : {
          id: `file-${Date.now()}-${normalizedPath}`,
          name: fileName,
          type: "file",
          path: normalizedPath,
        };

    // Add the node to the tree
    store.addNode(parentPath, newNode);
  }

  private handleRemoveEvent(srcPath: string): void {
    const store = useWorkspaceTreeStore.getState();

    // Normalize the path
    const normalizedPath = normalizePath(srcPath);
    if (!normalizedPath) return;

    // Remove the node from the tree
    store.removeNode(normalizedPath);
  }

  private handleFileChangeEvent(srcPath: string): void {
    const store = useWorkspaceTreeStore.getState();

    // Normalize the path
    const normalizedPath = normalizePath(srcPath);
    if (!normalizedPath) return;

    const node = store.findNodeByPath(normalizedPath);

    if (!node) {
      // File might not be in our tree yet (could be a new file)
      this.logger.debug(
        `File changed but not found in tree: ${normalizedPath}`
      );

      // Try to add it as a new file
      const parentPath = getParentPath(normalizedPath);
      const fileName = getBasename(normalizedPath);

      const newNode: FileTreeNode = {
        id: `file-${Date.now()}-${normalizedPath}`,
        name: fileName,
        type: "file",
        path: normalizedPath,
        lastModified: new Date(),
      };

      store.addNode(parentPath, newNode);
      return;
    }

    if (node.type !== "file") {
      this.logger.warn(
        `Change event received for non-file node: ${normalizedPath}`
      );
      return;
    }

    // Update the file in the tree
    store.updateFile(normalizedPath);
    this.logger.debug(`Updated file: ${normalizedPath}`);

    // If this is the currently selected file, may need to trigger a refresh
    const selectedNode = store.selectedNode;
    if (selectedNode && selectedNode.path === normalizedPath) {
      this.logger.debug(
        `Changed file is currently selected, may need UI refresh`
      );
    }
  }

  // Public methods for UI components

  /**
   * Selects a node in the tree
   */
  public selectNode(path: string): void {
    const store = useWorkspaceTreeStore.getState();
    const node = store.findNodeByPath(path);

    if (node) {
      store.setSelectedNode(node);
      this.logger.debug(`Selected node: ${path}`);
    } else {
      this.logger.warn(`Node not found for selection: ${path}`);
    }
  }

  /**
   * Opens a file by emitting a ClientOpenFile event
   */
  public openFile(path: string): void {
    const store = useWorkspaceTreeStore.getState();
    const node = store.findNodeByPath(path);

    if (!node) {
      this.logger.warn(`Cannot open file: node not found at path ${path}`);
      return;
    }

    if (node.type !== "file") {
      this.logger.warn(`Cannot open ${path}: not a file`);
      return;
    }

    // Select the node in the tree
    this.selectNode(path);

    // Emit the ClientOpenFile event
    this.logger.debug(`Emitting ClientOpenFile event for ${path}`);
    this.eventBus
      .emit({
        kind: "ClientOpenFile",
        timestamp: new Date(),
        correlationId: `file-open-${Date.now()}`,
        filePath: path,
      })
      .catch((error) => {
        this.logger.error(`Error opening file ${path}: ${error}`);
      });
  }

  /**
   * Handles node click events from the UI
   * Routes to appropriate handler based on node type
   */
  public handleNodeClick(path: string): void {
    const store = useWorkspaceTreeStore.getState();
    const node = store.findNodeByPath(path);

    if (!node) {
      this.logger.warn(`Node click handler: node not found at path ${path}`);
      return;
    }

    // Select the node
    this.selectNode(path);

    // If it's a file, open it
    if (node.type === "file") {
      this.openFile(path);
    }
    // If it's a folder, toggle expansion
    else if (node.type === "folder") {
      this.toggleFolder(path);
    }
  }

  public toggleFolder(path: string): void {
    const store = useWorkspaceTreeStore.getState();
    const node = store.findNodeByPath(path);

    if (node && isFolderNode(node)) {
      store.toggleFolderExpansion(path);
      this.logger.debug(
        `Toggled folder: ${path}, expanded: ${store.isExpanded(path)}`
      );
    } else {
      this.logger.warn(
        `Cannot toggle folder: node not found or not a folder at ${path}`
      );
    }
  }

  public isExpanded(path: string): boolean {
    return useWorkspaceTreeStore.getState().isExpanded(path);
  }

  public getWorkspaceRoot(): FolderTreeNode | null {
    return useWorkspaceTreeStore.getState().root;
  }

  public getSelectedNode(): TreeNode | null {
    return useWorkspaceTreeStore.getState().selectedNode;
  }

  // Request workspace tree with retry mechanism
  public requestWorkspaceTree(path?: string): void {
    if (this.pendingTreeResponse) {
      this.logger.warn("Tree request already in progress, skipping");
      return;
    }

    this.logger.info(`Requesting workspace tree for path: ${path || "/"}`);
    this.pendingTreeResponse = true;
    this.retryCount = 0;

    this.sendTreeRequest(path);
  }

  // Send the actual tree request
  private sendTreeRequest(path?: string): void {
    this.eventBus
      .emit({
        kind: "ClientRequestWorkspaceFolderTree",
        timestamp: new Date(),
        correlationId: `tree-req-${Date.now()}`,
        workspacePath: path,
      })
      .catch((error) => {
        this.logger.error(`Error requesting workspace tree: ${error}`);
        this.handleRequestFailure(path);
      });
  }

  // Handle request failures with retry logic
  private handleRequestFailure(path?: string): void {
    this.pendingTreeResponse = false;

    if (this.retryCount < this.maxRetries) {
      const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
      this.retryCount++;

      this.logger.info(
        `Retrying workspace tree request in ${delay}ms (Attempt ${this.retryCount}/${this.maxRetries})`
      );

      this.retryTimeout = window.setTimeout(() => {
        this.pendingTreeResponse = true;
        this.sendTreeRequest(path);
      }, delay);
    } else {
      this.logger.error(
        `Max retry attempts (${this.maxRetries}) reached for workspace tree request`
      );
      this.retryCount = 0;
    }
  }
}
