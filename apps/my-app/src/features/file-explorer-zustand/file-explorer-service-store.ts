import { create } from "zustand";
import { ILogObj, Logger } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import { FileExplorerService, FileExplorerStoreAPI } from "./file-explorer-service";
import { useFileExplorerStore } from "./file-explorer-store";

const logger = new Logger<ILogObj>({ name: "FileExplorerServiceStore" });

interface FileExplorerServiceState {
  service: FileExplorerService | null;
  initialized: boolean;
  initialize: (eventBus: IEventBus) => FileExplorerService;
}

export const useFileExplorerServiceStore = create<FileExplorerServiceState>((set, get) => ({
  service: null,
  initialized: false,
  initialize: (eventBus: IEventBus) => {
    if (!eventBus) {
      throw new Error("Event bus is required to initialize FileExplorerService");
    }

    // Check if already initialized to avoid duplicate services
    if (get().initialized && get().service) {
      logger.debug("FileExplorerService already initialized, returning existing instance");
      return get().service;
    }

    // Create a getter function for the file explorer store
    const getStore = (): FileExplorerStoreAPI => {
      return useFileExplorerStore.getState();
    };

    // Create new service instance
    const service = new FileExplorerService(eventBus, getStore);
    
    logger.debug("FileExplorerService initialized and stored in Zustand store");
    set({ service, initialized: true });
    
    return service;
  }
}));

// Convenience hook for React components
export const useFileExplorerService = (): FileExplorerService => {
  const service = useFileExplorerServiceStore((state) => state.service);
  
  if (!service) {
    throw new Error(
      "FileExplorerService not initialized. Make sure WebSocketEventClientProvider is mounted."
    );
  }
  
  return service;
};