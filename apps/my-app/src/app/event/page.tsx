"use client";

import { initializeStoreEvents, useAppStore } from "@/lib/app-store";
import { eventBus } from "@/lib/event-bus";
import { IncrementCountEvent, SetMessageEvent } from "@/lib/event-types";
import { useEffect } from "react";

// components/Counter.tsx
export const Counter = () => {
  const { count, message } = useAppStore();

  useEffect(() => {
    const cleanup = initializeStoreEvents();
    return () => cleanup();
  }, []);

  const handleIncrement = () => {
    eventBus.emit<IncrementCountEvent>({
      type: "INCREMENT_COUNT",
    });
  };

  const handleSetMessage = () => {
    eventBus.emit<SetMessageEvent>({
      type: "SET_MESSAGE",
      payload: {
        message: `Count is now: ${count}`,
      },
    });
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

export default Counter;
