import { BaseEvent } from "@repo/events-core/event-types";

/**
 * UI-specific event kinds
 */
export const UIEventKind = [
  // Workspace tree related events
  "UIWorkspaceTreeNodeFileClicked",
  "UIWorkspaceTreeNodeFolderClicked",
  "UIWorkspaceTreeNodeSelected",
  "UIWorkspaceTreeNodeFolderToggled",
  "UIWorkspaceTreeNodeAutoClicked",

  // Chat panel related UI events
  "UIChatMessageSubmitted",
  "UIChatMessagesUpdated",
  "UIChatResponseLoadingStarted",
  "UIChatResponseLoadingEnded",
  "UIChatPanelUpdated",

  // New chat related UI events
  "UINewChatButtonClicked",

  // Preview panel related UI events
  "UIPreviewPanelUpdated",

  // Modal dialog related UI events
  "UIModalOpened",
  "UIModalClosed",

  // Summarize feature related UI events
  "UISummarizeButtonClicked",
  "UISummarizeCompleted",

  // Next step feature related UI events
  "UINextStepButtonClicked",
  "UINextStepSelected",
] as const;

export type UIEventKind = (typeof UIEventKind)[number];

/**
 * Base interface for UI-originated events
 */
export interface BaseUIEvent extends BaseEvent {
  kind: UIEventKind;
}

// Workspace tree related UI events

export interface UIWorkspaceTreeNodeFileClickedEvent extends BaseUIEvent {
  kind: "UIWorkspaceTreeNodeFileClicked";
  filePath: string;
  nodeType: "file" | "folder";
}

export interface UIWorkspaceTreeNodeFolderClickedEvent extends BaseUIEvent {
  kind: "UIWorkspaceTreeNodeFolderClicked";
  folderPath: string;
}

export interface UIWorkspaceTreeNodeSelectedEvent extends BaseUIEvent {
  kind: "UIWorkspaceTreeNodeSelected";
  path: string;
  nodeType: "file" | "folder";
}

export interface UIWorkspaceTreeNodeFolderToggledEvent extends BaseUIEvent {
  kind: "UIWorkspaceTreeNodeFolderToggled";
  folderPath: string;
  isExpanded: boolean;
}

export interface UIWorkspaceTreeNodeAutoClickedEvent extends BaseUIEvent {
  kind: "UIWorkspaceTreeNodeAutoClicked";
  filePath: string;
}

// Chat panel related UI events

export interface UIChatMessageSubmittedEvent extends BaseUIEvent {
  kind: "UIChatMessageSubmitted";
  message: string;
  attachments?: Array<{
    fileName: string;
    content: string;
  }>;
}

export interface UIChatMessagesUpdatedEvent extends BaseUIEvent {
  kind: "UIChatMessagesUpdated";
  chatId: string;
}

export interface UIChatResponseLoadingStartedEvent extends BaseUIEvent {
  kind: "UIChatResponseLoadingStarted";
  chatId: string;
}

export interface UIChatResponseLoadingEndedEvent extends BaseUIEvent {
  kind: "UIChatResponseLoadingEnded";
  chatId: string;
}

export interface UIChatPanelUpdatedEvent extends BaseUIEvent {
  kind: "UIChatPanelUpdated";
  chatId: string;
}

// New chat related UI events

export interface UINewChatButtonClickedEvent extends BaseUIEvent {
  kind: "UINewChatButtonClicked";
}

// Preview panel related UI events

export interface UIPreviewPanelUpdatedEvent extends BaseUIEvent {
  kind: "UIPreviewPanelUpdated";
  content: string;
  fileType: string;
  filePath: string;
}

// Modal dialog related UI events

export interface UIModalOpenedEvent extends BaseUIEvent {
  kind: "UIModalOpened";
  modalId: string;
  context?: Record<string, unknown>;
}

export interface UIModalClosedEvent extends BaseUIEvent {
  kind: "UIModalClosed";
  modalId: string;
  result?: Record<string, unknown>;
}

// Summarize feature related UI events

export interface UISummarizeButtonClickedEvent extends BaseUIEvent {
  kind: "UISummarizeButtonClicked";
  chatId: string;
}

export interface UISummarizeCompletedEvent extends BaseUIEvent {
  kind: "UISummarizeCompleted";
  chatId: string;
  summaryPath: string;
}

// Next step feature related UI events

export interface UINextStepButtonClickedEvent extends BaseUIEvent {
  kind: "UINextStepButtonClicked";
  chatId: string;
}

export interface UINextStepSelectedEvent extends BaseUIEvent {
  kind: "UINextStepSelected";
  chatId: string;
  nextStepOption: string;
  prompt: string;
  knowledge: string[];
  createNewTask: boolean;
}

// Union type for all UI events
export type UIEventUnion =
  | UIWorkspaceTreeNodeFileClickedEvent
  | UIWorkspaceTreeNodeFolderClickedEvent
  | UIWorkspaceTreeNodeSelectedEvent
  | UIWorkspaceTreeNodeFolderToggledEvent
  | UIWorkspaceTreeNodeAutoClickedEvent
  | UIChatMessageSubmittedEvent
  | UIChatMessagesUpdatedEvent
  | UIChatResponseLoadingStartedEvent
  | UIChatResponseLoadingEndedEvent
  | UIChatPanelUpdatedEvent
  | UINewChatButtonClickedEvent
  | UIPreviewPanelUpdatedEvent
  | UIModalOpenedEvent
  | UIModalClosedEvent
  | UISummarizeButtonClickedEvent
  | UISummarizeCompletedEvent
  | UINextStepButtonClickedEvent
  | UINextStepSelectedEvent;

/**
 * Type guard to check if an event is a UI event
 */
export function isUIEvent(event: BaseEvent): event is UIEventUnion {
  return UIEventKind.includes(event.kind as UIEventKind);
}

/**
 * Type guard to check if an event is of a specific UI kind
 */
export function isUIEventKind<T extends BaseUIEvent>(
  event: BaseEvent,
  kind: UIEventKind
): event is T {
  return event.kind === kind;
}
