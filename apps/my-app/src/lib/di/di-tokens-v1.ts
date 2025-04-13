// Symbol tokens for type-safe dependency injection
export const DI_TOKENS = {
  LOGGER: Symbol("Logger"),
  EVENT_BUS: Symbol("EventBus"),
  WEBSOCKET_CLIENT: Symbol("WebSocketClient"),
  FILE_EXPLORER_SERVICE: Symbol("FileExplorerService"),
  EDITOR_SERVICE: Symbol("EditorService"),
  WORKSPACE_TREE_SERVICE: Symbol("WorkspaceTreeService"),
};
