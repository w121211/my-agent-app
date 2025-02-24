import React, { useEffect, useState } from "react";
import { eventBus } from "@/lib/event-bus";
import { BaseEvent, EventType, TestEvent } from "@/lib/event-types";

const WebSocketTestPanel = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    // 監聽所有事件
    const unsubscribe = eventBus.subscribe<BaseEvent>("*", (event) => {
      const message = `Received event: ${event.event_type} - ${JSON.stringify(
        event
      )}`;
      setMessages((prev) => [...prev, message]);
    });

    return () => unsubscribe();
  }, []);

  const sendTestEvent = () => {
    const testEvent: TestEvent = {
      event_type: EventType.TEST_EVENT,
      timestamp: new Date().toISOString(),
      message: "This is a test message",
    };

    // 記錄發送的事件
    const message = `Sent event: ${testEvent.event_type} - ${JSON.stringify(
      testEvent
    )}`;
    setMessages((prev) => [...prev, message]);

    eventBus.emit(testEvent);
    setInputMessage("");
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebSocket Event Bridge Test</h1>

      {/* Event 發送區域 */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Enter message for test event"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            onClick={sendTestEvent}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Send Test Event
          </button>
        </div>
      </div>

      {/* Event 日誌區域 */}
      <div className="border rounded-md p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Event Log:</h2>
        <div className="h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className="py-1 border-b text-sm font-mono">
              {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WebSocketTestPanel;
