import { create } from "zustand";
import { Logger } from "tslog";

const logger = new Logger({ name: "connection-state-store" });

interface ConnectionStateStore {
  isConnected: boolean;
  lastDisconnectTime: Date | null;
  reconnectAttempts: number;
  
  // Actions
  setConnected: (isConnected: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
}

export const useConnectionStateStore = create<ConnectionStateStore>((set) => ({
  isConnected: false,
  lastDisconnectTime: null,
  reconnectAttempts: 0,
  
  setConnected: (isConnected) => set((state) => {
    // Only log changes in connection state
    if (state.isConnected !== isConnected) {
      if (isConnected) {
        logger.info("WebSocket connection established");
      } else {
        logger.warn("WebSocket connection lost");
      }
    }
    
    return {
      isConnected,
      lastDisconnectTime: isConnected ? state.lastDisconnectTime : new Date(),
    };
  }),
  
  incrementReconnectAttempts: () => set((state) => ({
    reconnectAttempts: state.reconnectAttempts + 1,
  })),
  
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
}));
