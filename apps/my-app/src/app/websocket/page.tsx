"use client";

import WebSocketClientProvider from "./websocket-client-provider";
import WebSocketTestPanel from "./websocket-test-panel";

// 包裝主頁面，提供 WebSocket 連接
const WebSocketTestPage = () => {
  return (
    <WebSocketClientProvider>
      <WebSocketTestPanel />
    </WebSocketClientProvider>
  );
};

export default WebSocketTestPage;
