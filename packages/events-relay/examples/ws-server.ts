import { WebSocketServer } from "ws";

// 創建 WebSocket 服務器並監聽 8080 端口
const wss = new WebSocketServer({ port: 8080 });

console.log("WebSocket 服務器正在監聽 8080 端口");

// 處理連接事件
wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    console.log("收到消息: %s", message);
  });

  ws.send("歡迎連接到 WebSocket 服務器！");
});

// wss.close(() => {
//   console.log("WebSocket 服務器已關閉");
// });
