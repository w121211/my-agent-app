/**
 * Example usage of the event communication system
 */

import { Logger } from "tslog";
import { createClientEventBus } from "@repo/events-core/event-bus";
import { v4 as uuidv4 } from "uuid";
import { createWebSocketEventChannel } from "./websocket-event-channel";
import { createEventBusAdapter } from "./event-bus-adapter";

// Client-side setup example
function setupClientEventCommunication() {
  const logger = new Logger({ name: "Client" });
  
  // Create the base event bus
  const baseEventBus = createClientEventBus({ logger });
  
  // Create the WebSocket event channel
  const eventChannel = createWebSocketEventChannel({
    url: "ws://localhost:8000/ws",
    eventBus: baseEventBus,
    logger,
  });
  
  // Create the enhanced event bus adapter
  const enhancedEventBus = createEventBusAdapter(
    baseEventBus,
    eventChannel,
    logger
  );
  
  // Connect to the server
  enhancedEventBus.connect().then(() => {
    logger.info("Connected to server");
  }).catch(error => {
    logger.error("Failed to connect:", error);
  });
  
  // Monitor connection status
  enhancedEventBus.onConnectionStatusChange((isConnected) => {
    logger.info(`Connection status: ${isConnected ? "connected" : "disconnected"}`);
    
    // Update UI or take other actions based on connection status
    if (isConnected) {
      document.getElementById("status-indicator")?.classList.add("connected");
      document.getElementById("status-indicator")?.classList.remove("disconnected");
    } else {
      document.getElementById("status-indicator")?.classList.add("disconnected");
      document.getElementById("status-indicator")?.classList.remove("connected");
    }
  });
  
  // Example: Send a regular event
  async function sendSampleEvent() {
    try {
      await enhancedEventBus.emit({
        kind: "ClientCreateTask",
        timestamp: new Date(),
        taskName: "Sample Task",
        taskConfig: { priority: "high" }
      });
      logger.info("Event sent successfully");
    } catch (error) {
      logger.error("Failed to send event:", error);
    }
  }
  
  // Example: Send a request and wait for response
  async function requestFolderTree() {
    try {
      const response = await enhancedEventBus.sendRequest(
        {
          kind: "ClientRequestWorkspaceFolderTree",
          timestamp: new Date(),
          correlationId: uuidv4(),
          workspacePath: "/projects/myapp"
        },
        "ServerWorkspaceFolderTreeResponsed",
        5000 // 5 second timeout
      );
      
      logger.info("Received folder tree:", response);
      return response;
    } catch (error) {
      logger.error("Failed to get folder tree:", error);
      throw error;
    }
  }
  
  // Listen for specific events
  enhancedEventBus.subscribe("ServerTaskCreated", (event) => {
    logger.info("Task created:", event.taskId);
  });
  
  // Clean up when done
  function cleanup() {
    enhancedEventBus.disconnect().catch(error => {
      logger.error("Error during disconnect:", error);
    });
  }
  
  // Return the event bus and utility functions
  return {
    eventBus: enhancedEventBus,
    sendSampleEvent,
    requestFolderTree,
    cleanup
  };
}

// Usage in a component
function ChatComponent() {
  const { eventBus, requestFolderTree } = setupClientEventCommunication();
  
  // Example of using the event system in a UI component
  document.getElementById("send-button")?.addEventListener("click", async () => {
    const messageInput = document.getElementById("message-input") as HTMLInputElement;
    const chatId = "chat-123"; // In real app, this would come from your app state
    
    if (messageInput && messageInput.value.trim()) {
      try {
        await eventBus.emit({
          kind: "ClientSubmitMessage",
          timestamp: new Date(),
          chatId,
          content: messageInput.value.trim()
        });
        
        // Clear input after sending
        messageInput.value = "";
      } catch (error) {
        console.error("Failed to send message:", error);
        alert("Failed to send message. Please check your connection.");
      }
    }
  });
  
  // Example: Load folder tree when a button is clicked
  document.getElementById("load-tree-button")?.addEventListener("click", async () => {
    try {
      const folderTree = await requestFolderTree();
      
      // Update UI with the folder tree
      const treeContainer = document.getElementById("folder-tree");
      if (treeContainer && folderTree.folderTree) {
        renderFolderTree(treeContainer, folderTree.folderTree);
      }
    } catch (error) {
      console.error("Failed to load folder tree:", error);
      alert("Failed to load folder tree. Please try again later.");
    }
  });
  
  // Helper function to render a folder tree in the UI
  function renderFolderTree(container: HTMLElement, tree: any) {
    // Implementation details omitted
  }
  
  // Subscribe to messages for this chat
  eventBus.subscribe("ServerMessageReceived", (event) => {
    if (event.chatId === "chat-123") {
      const messagesContainer = document.getElementById("messages-container");
      if (messagesContainer) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", event.message.role.toLowerCase());
        messageElement.textContent = event.message.content;
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  });
  
  // Clean up on component unmount
  function unmount() {
    eventBus.clear();
  }
  
  return {
    unmount
  };
}