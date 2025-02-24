"use client";

import React, { useEffect } from "react";
import { Message, useChatStore } from "@/lib/chat-store";
import ChatPanel from "./chat-panel";

// Mock chat data
const mockChats: Message[] = [
  {
    role: "user",
    content:
      "Hello! Can you help me understand how to use the event bus system?",
    timestamp: "2024-02-16T10:00:00.000Z",
  },
  {
    role: "ai",
    content:
      "Of course! The event bus system is designed to handle communication between different parts of the application. It uses a publish-subscribe pattern where components can emit events and subscribe to them.\n\nWould you like me to show you some examples?",
    timestamp: "2024-02-16T10:00:05.000Z",
  },
  {
    role: "user",
    content: "Yes, please show me an example of how to subscribe to events.",
    timestamp: "2024-02-16T10:00:30.000Z",
  },
  {
    role: "ai",
    content:
      'Here\'s a simple example of subscribing to an event:\n\n```typescript\nimport { eventBus } from "@/lib/event-bus";\n\nconst unsubscribe = eventBus.subscribe("FILE_SYSTEM_CHANGED", (event) => {\n  console.log("File system changed:", event);\n});\n\n// Don\'t forget to unsubscribe when the component unmounts\n// Call unsubscribe() in cleanup```',
    timestamp: "2024-02-16T10:00:35.000Z",
  },
];

const ChatDemoPage = () => {
  const { messages, addMessage, setCurrentPath } = useChatStore();

  // Load mock data
  useEffect(() => {
    // Set a mock current path
    setCurrentPath("/chat/event-bus-tutorial.md");

    // Add mock messages if there are none
    if (messages.length === 0) {
      mockChats.forEach((message) => addMessage(message));
    }
  }, []);

  return (
    <div className="h-screen bg-white">
      <ChatPanel />
    </div>
  );
};

export default ChatDemoPage;
