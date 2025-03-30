// src/mocks/handlers.ts
import { ws } from "msw";

// 聊天 WebSocket 端點處理程序
export const chatSocket = ws.link("wss://chat.example.com");

export const handlers = [
  chatSocket.addEventListener("connection", ({ client }) => {
    console.log("WebSocket connection established");

    // 監聽客戶端發送的消息
    client.addEventListener("message", (event) => {
      const message = event.data;
      console.log("Received message from client:", message);

      // 廣播消息給所有其他客戶端
      chatSocket.broadcastExcept(
        client,
        JSON.stringify({
          id: crypto.randomUUID(),
          text: message,
          sender: "other-user",
          timestamp: new Date().toISOString(),
        })
      );

      // 發送確認回客戶端
      client.send(
        JSON.stringify({
          id: crypto.randomUUID(),
          text: message,
          sender: "you",
          timestamp: new Date().toISOString(),
        })
      );
    });
  }),
];
