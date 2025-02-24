import { ReactNode, useEffect } from "react";
import { getWebSocketClient } from "@/lib/websocket-client";

interface WebSocketClientProviderProps {
  children: ReactNode;
}

const WebSocketClientProvider = ({
  children,
}: WebSocketClientProviderProps) => {
  useEffect(() => {
    const client = getWebSocketClient();
    if (client) {
      client.connect();
      client.subscribe("user_update");
    }

    return () => {
      if (client) {
        client.unsubscribe("user_update");

        // (Optional) Disconnect the WebSocket client
        // 如果这是唯一的WebSocket管理组件，可以考虑完全断开连接
        client.disconnect();
      }
    };
  }, []);

  return children;
};

export default WebSocketClientProvider;
