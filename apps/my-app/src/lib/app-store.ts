import { create } from "zustand";
import { IncrementCountEvent, SetMessageEvent } from "@/app/event/event-types";
import { eventBus } from "@/app/event/event-bus";

interface AppState {
  count: number;
  message: string;
  incrementCount: () => void;
  setMessage: (message: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  message: "",
  incrementCount: () => set((state) => ({ count: state.count + 1 })),
  setMessage: (message: string) => set({ message }),
}));

export const initializeStoreEvents = () => {
  const unsubscribers = [
    eventBus.subscribe<IncrementCountEvent>("INCREMENT_COUNT", () => {
      useAppStore.getState().incrementCount();
    }),

    eventBus.subscribe<SetMessageEvent>("SET_MESSAGE", (event) => {
      useAppStore.getState().setMessage(event.payload.message);
    }),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};
