// apps/my-app-svelte/src/stores/ui-store.ts
import { writable, derived } from "svelte/store";

// Loading states for different operations
export const loadingStates = writable<Record<string, boolean>>({});

// Toast notifications
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  timestamp: number;
}

export const toasts = writable<Toast[]>([]);

// Modal states
export const modals = writable<Record<string, boolean>>({});

// Connection states for subscriptions
export const connectionStates = writable<
  Record<string, "idle" | "connecting" | "connected" | "error">
>({
  fileWatcher: "idle",
  chatEvents: "idle",
  taskEvents: "idle",
  projectFolderEvents: "idle",
});

// Derived stores
export const isAnyLoading = derived(loadingStates, ($loadingStates) =>
  Object.values($loadingStates).some(Boolean),
);

export const activeToastCount = derived(toasts, ($toasts) => $toasts.length);

export const isAnyModalOpen = derived(modals, ($modals) =>
  Object.values($modals).some(Boolean),
);

export const allConnectionsHealthy = derived(
  connectionStates,
  ($connectionStates) =>
    Object.values($connectionStates).every(
      (state) => state === "connected" || state === "idle",
    ),
);

export const connectionIssues = derived(
  connectionStates,
  ($connectionStates) => {
    const issues: string[] = [];
    Object.entries($connectionStates).forEach(([name, state]) => {
      if (state === "error") {
        issues.push(name);
      }
    });
    return issues;
  },
);

// Loading state functions
export function setLoading(operation: string, isLoading: boolean) {
  loadingStates.update((states) => ({
    ...states,
    [operation]: isLoading,
  }));
}

export function isLoading(operation: string) {
  return derived(
    loadingStates,
    ($loadingStates) => $loadingStates[operation] || false,
  );
}

// Create derived stores for commonly used loading operations
export const isLoadingOpenChat = derived(
  loadingStates,
  ($loadingStates) => $loadingStates["openChat"] || false,
);

export const isLoadingSubmitMessage = derived(
  loadingStates,
  ($loadingStates) => $loadingStates["submitMessage"] || false,
);

export const isLoadingAddProjectFolder = derived(
  loadingStates,
  ($loadingStates) => $loadingStates["addProjectFolder"] || false,
);

export const isLoadingProjectFolders = derived(
  loadingStates,
  ($loadingStates) => $loadingStates["projectFolders"] || false,
);

export const isLoadingCreateChat = derived(
  loadingStates,
  ($loadingStates) => $loadingStates["createChat"] || false,
);

export const isLoadingOpenFile = derived(
  loadingStates,
  ($loadingStates) => $loadingStates["openFile"] || false,
);

export function clearAllLoading() {
  loadingStates.set({});
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

  toasts.update((currentToasts) => [...currentToasts, toast]);

  // Auto-remove non-error toasts after duration
  if (toast.duration && toast.duration > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
  }

  return toast.id;
}

export function removeToast(toastId: string) {
  toasts.update((currentToasts) =>
    currentToasts.filter((toast) => toast.id !== toastId),
  );
}

export function clearAllToasts() {
  toasts.set([]);
}

// Modal functions
export function openModal(modalName: string) {
  modals.update((currentModals) => ({
    ...currentModals,
    [modalName]: true,
  }));
}

export function closeModal(modalName: string) {
  modals.update((currentModals) => ({
    ...currentModals,
    [modalName]: false,
  }));
}

export function toggleModal(modalName: string) {
  modals.update((currentModals) => ({
    ...currentModals,
    [modalName]: !currentModals[modalName],
  }));
}

export function isModalOpen(modalName: string) {
  return derived(modals, ($modals) => $modals[modalName] || false);
}

export function closeAllModals() {
  modals.set({});
}

// Connection state functions
export function setConnectionState(
  connection: string,
  state: "idle" | "connecting" | "connected" | "error",
) {
  connectionStates.update((states) => ({
    ...states,
    [connection]: state,
  }));
}

export function getConnectionState(connection: string) {
  return derived(
    connectionStates,
    ($connectionStates) => $connectionStates[connection] || "idle",
  );
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
