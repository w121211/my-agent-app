"use client";

// types/events.ts
export interface BaseEvent {
  type: string;
}

export interface IncrementCountEvent extends BaseEvent {
  type: 'INCREMENT_COUNT';
}

export interface SetMessageEvent extends BaseEvent {
  type: 'SET_MESSAGE';
  payload: {
    message: string;
  };
}

// Type-safe event emitter and subscriber
export interface EventBus {
  emit<E extends BaseEvent>(event: E): void;
  subscribe<E extends BaseEvent>(
    type: E['type'], 
    callback: (event: E) => void
  ): () => void;
}

// lib/eventBus.ts
class EventBusImpl implements EventBus {
  private events: Map<string, Set<(event: BaseEvent) => void>>;

  constructor() {
    this.events = new Map();
  }

  emit<E extends BaseEvent>(event: E) {
    const callbacks = this.events.get(event.type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event callback for ${event.type}:`, error);
        }
      });
    }
  }

  subscribe<E extends BaseEvent>(
    type: E['type'], 
    callback: (event: E) => void
  ) {
    if (!this.events.has(type)) {
      this.events.set(type, new Set());
    }
    
    const callbacks = this.events.get(type)!;
    callbacks.add(callback as (event: BaseEvent) => void);

    return () => {
      callbacks.delete(callback as (event: BaseEvent) => void);
      if (callbacks.size === 0) {
        this.events.delete(type);
      }
    };
  }
}

export const eventBus = new EventBusImpl();

// store/useAppStore.ts
import { create } from "zustand";
// import { eventBus } from '@/lib/eventBus';

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

// Subscribe to events when the store is created
eventBus.subscribe("INCREMENT_COUNT", (event: IncrementCountEvent) => {
  useAppStore.getState().incrementCount();
});

eventBus.subscribe("SET_MESSAGE", (event: SetMessageEvent) => {
  useAppStore.getState().setMessage(event.payload.message);
});

// components/Counter.tsx
// import { useAppStore } from "@/store/useAppStore";
// import { eventBus } from "@/lib/eventBus";

export const Counter = () => {
  const { count, message } = useAppStore();

  const handleIncrement = () => {
    eventBus.emit("INCREMENT_COUNT");
  };

  const handleSetMessage = () => {
    eventBus.emit("SET_MESSAGE", `Count is now: ${count}`);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <p>Count: {count}</p>
        <p>Message: {message}</p>
      </div>
      <div className="space-x-4">
        <button
          onClick={handleIncrement}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Increment
        </button>
        <button
          onClick={handleSetMessage}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Update Message
        </button>
      </div>
    </div>
  );
};

// Usage Example in page.tsx
// import { Counter } from "@/components/Counter";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Event Driven System Demo</h1>
      <Counter />
    </main>
  );
}
