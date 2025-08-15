// apps/my-app-svelte/src/stores/ui-store.svelte.ts

// Toast notifications
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  timestamp: number;
}

interface UiState {
  loadingStates: Record<string, boolean>;
  toasts: Toast[];
  modals: Record<string, boolean>;
  connectionStates: Record<string, "idle" | "connecting" | "connected" | "error">;
}

// Unified state object
export const uiState = $state<UiState>({
  loadingStates: {},
  toasts: [],
  modals: {},
  connectionStates: {
    fileWatcher: "idle",
    chatEvents: "idle",
    taskEvents: "idle",
    projectFolderEvents: "idle",
  },
});

// Derived stores
export const isAnyLoading = $derived(
  Object.values(uiState.loadingStates).some(Boolean),
);

export const activeToastCount = $derived(uiState.toasts.length);

export const isAnyModalOpen = $derived(
  Object.values(uiState.modals).some(Boolean),
);

export const allConnectionsHealthy = $derived(
  Object.values(uiState.connectionStates).every(
    (state) => state === "connected" || state === "idle",
  ),
);

export const connectionIssues = $derived(() => {
  const issues: string[] = [];
  Object.entries(uiState.connectionStates).forEach(([name, state]) => {
    if (state === "error") {
      issues.push(name);
    }
  });
  return issues;
});

// Loading state functions
export function setLoading(operation: string, isLoading: boolean) {
  uiState.loadingStates[operation] = isLoading;
}

export function getIsLoading(operation: string) {
  return uiState.loadingStates[operation] || false;
}

// Create specific loading state getters
export const isLoadingOpenChat = $derived(uiState.loadingStates["openChat"] || false);
export const isLoadingSubmitMessage = $derived(uiState.loadingStates["submitMessage"] || false);
export const isLoadingAddProjectFolder = $derived(uiState.loadingStates["addProjectFolder"] || false);
export const isLoadingProjectFolders = $derived(uiState.loadingStates["projectFolders"] || false);
export const isLoadingCreateChat = $derived(uiState.loadingStates["createChat"] || false);
export const isLoadingOpenFile = $derived(uiState.loadingStates["openFile"] || false);

export function clearAllLoading() {
  Object.keys(uiState.loadingStates).forEach(key => delete uiState.loadingStates[key]);
}

// Toast functions
export function showToast(
  message: string,
  type: Toast["type"] = "info",
  duration?: number,
) {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    message,
    type,
    duration: duration || (type === "error" ? 0 : 5000), // Errors stay until dismissed
    timestamp: Date.now(),
  };

  uiState.toasts.push(toast);

  // Auto-remove non-error toasts after duration
  if (toast.duration && toast.duration > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
  }

  return toast.id;
}

export function removeToast(toastId: string) {
  const index = uiState.toasts.findIndex(toast => toast.id === toastId);
  if (index !== -1) {
    uiState.toasts.splice(index, 1);
  }
}

export function clearAllToasts() {
  uiState.toasts.splice(0, uiState.toasts.length);
}

// Modal functions
export function openModal(modalName: string) {
  uiState.modals[modalName] = true;
}

export function closeModal(modalName: string) {
  uiState.modals[modalName] = false;
}

export function toggleModal(modalName: string) {
  uiState.modals[modalName] = !uiState.modals[modalName];
}

export function getIsModalOpen(modalName: string) {
  return uiState.modals[modalName] || false;
}

export function closeAllModals() {
  Object.keys(uiState.modals).forEach(key => delete uiState.modals[key]);
}

// Connection state functions
export function setConnectionState(
  connection: string,
  state: "idle" | "connecting" | "connected" | "error",
) {
  uiState.connectionStates[connection] = state;
}

export function getConnectionState(connection: string) {
  return uiState.connectionStates[connection] || "idle";
}

// Toast type helpers
export function showSuccessToast(message: string, duration?: number) {
  return showToast(message, "success", duration);
}

export function showErrorToast(message: string) {
  return showToast(message, "error", 0); // Errors don't auto-dismiss
}

export function showInfoToast(message: string, duration?: number) {
  return showToast(message, "info", duration);
}

export function showWarningToast(message: string, duration?: number) {
  return showToast(message, "warning", duration);
}

// Utility functions
export function withLoading<T>(
  operation: string,
  asyncFn: () => Promise<T>,
): Promise<T> {
  setLoading(operation, true);

  return asyncFn().finally(() => {
    setLoading(operation, false);
  });
}

export function getToastIcon(type: Toast["type"]): string {
  switch (type) {
    case "success":
      return "check-circle-fill";
    case "error":
      return "exclamation-triangle-fill";
    case "warning":
      return "exclamation-triangle-fill";
    case "info":
    default:
      return "info-circle-fill";
  }
}

export function getToastClassName(type: Toast["type"]): string {
  switch (type) {
    case "success":
      return "bg-panel border-green-600/40 text-green-400";
    case "error":
      return "bg-panel border-red-600/40 text-red-400";
    case "warning":
      return "bg-panel border-yellow-600/40 text-yellow-400";
    case "info":
    default:
      return "bg-panel border-blue-600/40 text-blue-400";
  }
}