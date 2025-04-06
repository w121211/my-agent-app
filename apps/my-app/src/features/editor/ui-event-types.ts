import { BaseEvent } from "@repo/events-core/event-types";

// UI event kinds
export const UiEventKind = [
  // User interaction events
  "UiNewTaskButtonClicked",
  "UiFolderNodeClicked",
  "UiFileNodeClicked",
  "UiStartTaskButtonClicked",
  "UiStopTaskButtonClicked",
  "UiCloneSubtaskButtonClicked",
  "UiNewChatButtonClicked",
  "UiCloneChatButtonClicked",
  "UiBranchChatButtonClicked",
  "UiSendMessageButtonClicked",
  "UiApproveWorkButtonClicked",

  // UI state events
  "UiFileNodeSelected",
  "UiFolderNodeExpansionToggled",
  "UiFileOpened",
  "UiTaskInputModalShown",
  "UiTaskInputSubmitted",
  "UiChatInputModalShown",
  "UiChatInputSubmitted",
  "UiChatFileOpened",
  "UiErrorNotificationShown",
] as const;

export type UiEventKind = (typeof UiEventKind)[number];

// Base UI event interface
export interface BaseUiEvent extends BaseEvent {
  kind: UiEventKind;
}

// User Interaction Events
export interface UiNewTaskButtonClickedEvent extends BaseUiEvent {
  kind: "UiNewTaskButtonClicked";
}

export interface UiFolderNodeClickedEvent extends BaseUiEvent {
  kind: "UiFolderNodeClicked";
  path: string;
}

export interface UiFileNodeClickedEvent extends BaseUiEvent {
  kind: "UiFileNodeClicked";
  path: string;
}

export interface UiStartTaskButtonClickedEvent extends BaseUiEvent {
  kind: "UiStartTaskButtonClicked";
  taskId: string;
}

export interface UiStopTaskButtonClickedEvent extends BaseUiEvent {
  kind: "UiStopTaskButtonClicked";
  taskId: string;
}

export interface UiCloneSubtaskButtonClickedEvent extends BaseUiEvent {
  kind: "UiCloneSubtaskButtonClicked";
  taskId: string;
  subtaskId: string;
}

export interface UiNewChatButtonClickedEvent extends BaseUiEvent {
  kind: "UiNewChatButtonClicked";
  taskId: string;
  subtaskId: string;
}

export interface UiCloneChatButtonClickedEvent extends BaseUiEvent {
  kind: "UiCloneChatButtonClicked";
  chatId: string;
}

export interface UiBranchChatButtonClickedEvent extends BaseUiEvent {
  kind: "UiBranchChatButtonClicked";
  chatId: string;
  messageId: string;
}

export interface UiSendMessageButtonClickedEvent extends BaseUiEvent {
  kind: "UiSendMessageButtonClicked";
  chatId: string;
  content: string;
}

export interface UiApproveWorkButtonClickedEvent extends BaseUiEvent {
  kind: "UiApproveWorkButtonClicked";
  chatId: string;
}

// UI State Events
export interface UiFileNodeSelectedEvent extends BaseUiEvent {
  kind: "UiFileNodeSelected";
  path: string;
}

export interface UiFolderNodeExpansionToggledEvent extends BaseUiEvent {
  kind: "UiFolderNodeExpansionToggled";
  path: string;
  expanded: boolean;
}

export interface UiFileOpenedEvent extends BaseUiEvent {
  kind: "UiFileOpened";
  path: string;
}

export interface UiTaskInputModalShownEvent extends BaseUiEvent {
  kind: "UiTaskInputModalShown";
  taskId: string;
}

export interface UiTaskInputSubmittedEvent extends BaseUiEvent {
  kind: "UiTaskInputSubmitted";
  taskId: string;
  input: unknown;
}

export interface UiChatInputModalShownEvent extends BaseUiEvent {
  kind: "UiChatInputModalShown";
  chatId: string;
}

export interface UiChatInputSubmittedEvent extends BaseUiEvent {
  kind: "UiChatInputSubmitted";
  chatId: string;
  input: unknown;
}

export interface UiChatFileOpenedEvent extends BaseUiEvent {
  kind: "UiChatFileOpened";
  chatId: string;
}

export interface UiErrorNotificationShownEvent extends BaseUiEvent {
  kind: "UiErrorNotificationShown";
  message: string;
  error?: Error;
}

// Union type for all UI events
export type UiEventUnion =
  | UiNewTaskButtonClickedEvent
  | UiFolderNodeClickedEvent
  | UiFileNodeClickedEvent
  | UiStartTaskButtonClickedEvent
  | UiStopTaskButtonClickedEvent
  | UiCloneSubtaskButtonClickedEvent
  | UiNewChatButtonClickedEvent
  | UiCloneChatButtonClickedEvent
  | UiBranchChatButtonClickedEvent
  | UiSendMessageButtonClickedEvent
  | UiApproveWorkButtonClickedEvent
  | UiFileNodeSelectedEvent
  | UiFolderNodeExpansionToggledEvent
  | UiFileOpenedEvent
  | UiTaskInputModalShownEvent
  | UiTaskInputSubmittedEvent
  | UiChatInputModalShownEvent
  | UiChatInputSubmittedEvent
  | UiChatFileOpenedEvent
  | UiErrorNotificationShownEvent;

// Type guard to check if an event is a UI event
export function isUiEvent(event: BaseEvent): event is UiEventUnion {
  return UiEventKind.includes(event.kind as UiEventKind);
}
