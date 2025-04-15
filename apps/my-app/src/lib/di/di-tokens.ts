/**
 * Dependency Injection tokens for the application
 */
export const DI_TOKENS = {
  // Core services
  LOGGER: "LOGGER",
  CONFIG_SERVICE: "CONFIG_SERVICE",
  EVENT_BUS: "EVENT_BUS",
  WEBSOCKET_CLIENT: "WEBSOCKET_CLIENT",
  CONNECTION_SERVICE: "CONNECTION_SERVICE",

  // Feature services
  FILE_EXPLORER_SERVICE: "FILE_EXPLORER_SERVICE",
  EDITOR_SERVICE: "EDITOR_SERVICE",
  WORKSPACE_TREE_SERVICE: "WORKSPACE_TREE_SERVICE",
} as const;

// Type for DI tokens
export type DIToken = (typeof DI_TOKENS)[keyof typeof DI_TOKENS];
