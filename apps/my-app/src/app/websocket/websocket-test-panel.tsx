import React, { useEffect, useState, useCallback } from "react";
import {
  useWebSocketEventClient,
  useEventBus,
} from "./websocket-client-provider";
import { BaseEvent, ClientTestEvent } from "@repo/events-core/event-types";
import { ILogObj, Logger } from "tslog";

const logger: Logger<ILogObj> = new Logger({ name: "WebSocketTestPanel" });

interface EventLogEntry {
  id: string;
  direction: "sent" | "received";
  timestamp: Date;
  eventType: string;
  data: string;
}

const WebSocketTestPanel: React.FC = () => {
  const wsClient = useWebSocketEventClient();
  const eventBus = useEventBus();
  const [logEntries, setLogEntries] = useState<EventLogEntry[]>([]);
  const [testMessage, setTestMessage] = useState<string>("Hello world!");
  const [selectedEventType, setSelectedEventType] =
    useState<string>("CLIENT_TEST_EVENT");

  // Define addLogEntry as a useCallback to ensure stable reference
  const addLogEntry = useCallback(
    (direction: "sent" | "received", event: BaseEvent): void => {
      const newEntry: EventLogEntry = {
        id: crypto.randomUUID(),
        direction,
        timestamp: new Date(),
        eventType: event.eventType,
        data: JSON.stringify(event, null, 2),
      };

      setLogEntries((prev) => [newEntry, ...prev].slice(0, 100)); // Keep last 100 entries
    },
    []
  );

  // Subscribe to server events for logging
  useEffect(() => {
    if (!eventBus) return;

    // Optional: Log client events too
    const unsubscribeClient = eventBus.subscribeToAllClientEvents((event) => {
      addLogEntry("sent", event);
    });

    const unsubscribeServer = eventBus.subscribeToAllServerEvents((event) => {
      addLogEntry("received", event);
    });

    return () => {
      unsubscribeClient();
      unsubscribeServer();
    };
  }, [eventBus, addLogEntry]);

  // Send a test event
  const sendTestEvent = (): void => {
    if (!wsClient || !eventBus) {
      logger.error("WebSocket client or event bus is not available");
      return;
    }

    if (selectedEventType === "CLIENT_TEST_EVENT") {
      const testEvent: ClientTestEvent = {
        eventType: "CLIENT_TEST_EVENT",
        timestamp: new Date(),
        message: testMessage || "Test message",
        correlationId: crypto.randomUUID(),
      };

      eventBus.emit(testEvent);
      setTestMessage("");
    }
  };

  // Get CSS class for log entry based on event type
  const getEntryClass = (entry: EventLogEntry): string => {
    const baseClass = "py-2 px-3 border-b text-sm font-mono";

    if (entry.direction === "sent") {
      return `${baseClass} bg-blue-50`;
    } else {
      return `${baseClass} bg-green-50`;
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebSocket Event Test Panel</h1>

      {/* Connection status */}
      <div className="mb-4">
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${wsClient ? "bg-green-500" : "bg-red-500"}`}
          />
          <span>{wsClient ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      {/* Event sender */}
      <div className="mb-6 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Send Test Event</h2>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Event Type</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
          >
            <option value={"CLIENT_TEST_EVENT"}>Test Event</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Message</label>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter message for test event"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <button
          onClick={sendTestEvent}
          disabled={!wsClient || !eventBus}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          Send Event
        </button>
      </div>

      {/* Event log */}
      <div className="border rounded-md">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h2 className="text-lg font-semibold">Event Log</h2>
        </div>

        <div className="h-96 overflow-y-auto">
          {logEntries.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No events logged yet
            </div>
          ) : (
            logEntries.map((entry) => (
              <div key={entry.id} className={getEntryClass(entry)}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {entry.direction === "sent" ? "➡️ Sent" : "⬅️ Received"}
                  </span>
                  <span>{entry.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="font-semibold">{entry.eventType}</div>
                <pre className="mt-1 text-xs whitespace-pre-wrap">
                  {entry.data}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketTestPanel;
