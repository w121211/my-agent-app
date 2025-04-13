import { getWebSocketEventClient } from "@repo/events-relay/websocket-event-client";
import { createBrowserEventBus } from "@repo/events-core/browser-event-bus";

// Example of how to check WebSocket connection status and listen for changes

// Create an event bus
const eventBus = createBrowserEventBus();

// Get the WebSocket client
const wsClient = getWebSocketEventClient({
  eventBus,
  // Customize port/hostname if needed
  // port: 9000,
  // hostname: 'example.com'
});

// Method 1: Check current connection status directly
const isCurrentlyConnected = wsClient.isConnected();
console.log(`WebSocket is currently connected: ${isCurrentlyConnected}`);

// Method 2: Listen for connection status changes
const unsubscribe = wsClient.onConnectionStatusChange((connected) => {
  console.log(`WebSocket connection status changed: ${connected ? 'connected' : 'disconnected'}`);
  
  // You can update UI elements here
  if (connected) {
    // Handle connected state
    document.getElementById('status-indicator')?.classList.add('connected');
    document.getElementById('status-indicator')?.classList.remove('disconnected');
  } else {
    // Handle disconnected state
    document.getElementById('status-indicator')?.classList.add('disconnected');
    document.getElementById('status-indicator')?.classList.remove('connected');
  }
});

// Connect to the WebSocket server
wsClient.connect();

// Later, when you're done listening for connection status changes
// you can unsubscribe to avoid memory leaks
// unsubscribe();