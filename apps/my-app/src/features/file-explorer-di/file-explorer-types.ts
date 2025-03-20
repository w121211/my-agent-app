// file-explorer-types.ts

import { BaseEvent } from "@repo/events-core/event-types";

export type FileType = "file" | "directory";

export interface FileSystemNode {
  id: string;
  name: string;
  type: FileType;
  path: string;
  parentPath: string | null;
  children?: string[];
  metadata?: {
    size?: number;
    modified?: Date;
    created?: Date;
    [key: string]: unknown;
  };
}

export const FileExplorerEventType = [
  "CLIENT_EXPLORER_FILE_CREATED",
  "CLIENT_EXPLORER_FILE_DELETED",
  "CLIENT_EXPLORER_FILE_RENAMED",
  "CLIENT_EXPLORER_FILE_MOVED",
  "CLIENT_EXPLORER_DIRECTORY_CREATED",
  "CLIENT_EXPLORER_DIRECTORY_DELETED",
  "CLIENT_EXPLORER_DIRECTORY_RENAMED",
  "CLIENT_EXPLORER_DIRECTORY_MOVED",
  "CLIENT_EXPLORER_NODE_SELECTED",
  "CLIENT_EXPLORER_DIRECTORY_EXPANDED",
  "CLIENT_EXPLORER_DIRECTORY_COLLAPSED",
] as const;

export type FileExplorerEventType = (typeof FileExplorerEventType)[number];

export interface FileExplorerState {
  nodes: Record<string, FileSystemNode>;
  rootNodeIds: string[];
  selectedNodeId: string | null;
  expandedDirectories: Set<string>;
  loading: boolean;
  error: string | null;
}

export interface BaseFileExplorerEvent extends BaseEvent {
  eventType: FileExplorerEventType;
  timestamp: Date;
}

// File events
export interface ClientExplorerFileCreatedEvent extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_FILE_CREATED";
  fileId: string;
  parentPath: string | null;
  name: string;
}

export interface ClientExplorerFileDeletedEvent extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_FILE_DELETED";
  fileId: string;
  path: string;
}

export interface ClientExplorerFileRenamedEvent extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_FILE_RENAMED";
  fileId: string;
  oldName: string;
  newName: string;
}

export interface ClientExplorerFileMovedEvent extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_FILE_MOVED";
  fileId: string;
  oldPath: string;
  newPath: string;
}

// Directory events
export interface ClientExplorerDirectoryCreatedEvent
  extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_DIRECTORY_CREATED";
  directoryId: string;
  parentPath: string | null;
  name: string;
}

export interface ClientExplorerDirectoryDeletedEvent
  extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_DIRECTORY_DELETED";
  directoryId: string;
  path: string;
}

export interface ClientExplorerDirectoryRenamedEvent
  extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_DIRECTORY_RENAMED";
  directoryId: string;
  oldName: string;
  newName: string;
}

export interface ClientExplorerDirectoryMovedEvent
  extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_DIRECTORY_MOVED";
  directoryId: string;
  oldPath: string;
  newPath: string;
}

// UI events
export interface ClientExplorerNodeSelectedEvent extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_NODE_SELECTED";
  nodeId: string;
}

export interface ClientExplorerDirectoryExpandedEvent
  extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_DIRECTORY_EXPANDED";
  directoryId: string;
}

export interface ClientExplorerDirectoryCollapsedEvent
  extends BaseFileExplorerEvent {
  eventType: "CLIENT_EXPLORER_DIRECTORY_COLLAPSED";
  directoryId: string;
}

// Union type for all file explorer events
export type FileExplorerEventUnion =
  | ClientExplorerFileCreatedEvent
  | ClientExplorerFileDeletedEvent
  | ClientExplorerFileRenamedEvent
  | ClientExplorerFileMovedEvent
  | ClientExplorerDirectoryCreatedEvent
  | ClientExplorerDirectoryDeletedEvent
  | ClientExplorerDirectoryRenamedEvent
  | ClientExplorerDirectoryMovedEvent
  | ClientExplorerNodeSelectedEvent
  | ClientExplorerDirectoryExpandedEvent
  | ClientExplorerDirectoryCollapsedEvent;
