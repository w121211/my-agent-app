// UI panel types
export type UIPanelType = "explorer" | "chat" | "preview";

// UI layout types
export type UILayoutType = "two-column" | "three-column";

// UI user status
export type UIUserStatus = "editing" | "viewing";

// UI user
export interface UIUser {
  id: string;
  name: string;
  status: UIUserStatus;
}

// UI panel visibility state
export interface UIPanelVisibility {
  explorer: boolean;
  chat: boolean;
  preview: boolean;
}

// Define UI event types
export const UIEventType = [
  "UI_PANEL_TOGGLE",
  "UI_ITEM_SELECT",
  "UI_FOLDER_TOGGLE",
  "UI_LAYOUT_CHANGE",
  "UI_CHAT_MESSAGE_SUBMIT",
  "UI_CREATE_TASK",
  "UI_CREATE_SUBTASK",
  "UI_CREATE_CHAT",
  "UI_PROMPT_SUBMIT",
] as const;

export type UIEventType = (typeof UIEventType)[number];

// Base UI event interface
export interface BaseUIEvent {
  eventType: UIEventType;
  timestamp: Date;
}

// Panel toggle event
export interface UIPanelToggleEvent extends BaseUIEvent {
  eventType: "UI_PANEL_TOGGLE";
  panelType: UIPanelType;
  isVisible: boolean;
}

// Item selection event
export interface UIItemSelectEvent extends BaseUIEvent {
  eventType: "UI_ITEM_SELECT";
  itemId: string;
}

// Folder toggle event
export interface UIFolderToggleEvent extends BaseUIEvent {
  eventType: "UI_FOLDER_TOGGLE";
  folderId: string;
  isExpanded: boolean;
}

// Layout change event
export interface UILayoutChangeEvent extends BaseUIEvent {
  eventType: "UI_LAYOUT_CHANGE";
  layout: UILayoutType;
}

// Chat message submit event
export interface UIChatMessageSubmitEvent extends BaseUIEvent {
  eventType: "UI_CHAT_MESSAGE_SUBMIT";
  chatId: string;
  content: string;
}

// Create task event
export interface UICreateTaskEvent extends BaseUIEvent {
  eventType: "UI_CREATE_TASK";
  taskName: string;
}

// Create subtask event
export interface UICreateSubtaskEvent extends BaseUIEvent {
  eventType: "UI_CREATE_SUBTASK";
  taskId: string;
  subtaskName: string;
}

// Create chat event
export interface UICreateChatEvent extends BaseUIEvent {
  eventType: "UI_CREATE_CHAT";
  parentId: string; // Could be task or subtask ID
}

// Prompt submit event
export interface UIPromptSubmitEvent extends BaseUIEvent {
  eventType: "UI_PROMPT_SUBMIT";
  promptType: "chat" | "task";
  content: string;
}

// Union type for all UI events
export type UIEventUnion =
  | UIPanelToggleEvent
  | UIItemSelectEvent
  | UIFolderToggleEvent
  | UILayoutChangeEvent
  | UIChatMessageSubmitEvent
  | UICreateTaskEvent
  | UICreateSubtaskEvent
  | UICreateChatEvent
  | UIPromptSubmitEvent;
