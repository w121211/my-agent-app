import { ws } from "msw";
import { setupServer } from "msw/node";

// 创建一个WebSocket链接处理器
const chatSocket = ws.link("wss://chat.example.com");

export const handlers = [
  // WebSocket handlers
  chatSocket.addEventListener("connection", ({ client }) => {
    console.log("WebSocket connection established");

    // 当客户端发送消息时
    client.addEventListener("message", (event) => {
      console.log("Received from client:", event.data);

      // 判断消息内容并响应
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "join") {
          // 响应加入聊天室的消息
          client.send(
            JSON.stringify({
              type: "system",
              content: `Welcome ${message.username} to the chat!`,
              timestamp: new Date().toISOString(),
            })
          );
        } else if (message.type === "message") {
          // 响应普通消息，模拟回显
          client.send(
            JSON.stringify({
              type: "message",
              username: message.username,
              content: message.content,
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        // 如果不是JSON格式的消息，简单回显
        client.send(`Echo: ${event.data}`);
      }
    });

    // 模拟服务器主动发送的系统消息
    setTimeout(() => {
      client.send(
        JSON.stringify({
          type: "system",
          content: "This is a system notification from the mock server",
          timestamp: new Date().toISOString(),
        })
      );
    }, 2000);
  }),
];

export const server = setupServer(...handlers);

// chat-client.ts - 简单的WebSocket客户端实现
export class ChatClient {
  private socket: WebSocket | null = null;
  private messageListeners: ((message: any) => void)[] = [];

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log("WebSocket connection opened");
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageListeners.forEach((listener) => listener(data));
        } catch (e) {
          console.log("Received non-JSON message:", event.data);
          this.messageListeners.forEach((listener) => listener(event.data));
        }
      };

      this.socket.onclose = () => {
        console.log("WebSocket connection closed");
      };
    });
  }

  sendMessage(username: string, content: string): void {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }

    this.socket.send(
      JSON.stringify({
        type: "message",
        username,
        content,
        timestamp: new Date().toISOString(),
      })
    );
  }

  join(username: string): void {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }

    this.socket.send(
      JSON.stringify({
        type: "join",
        username,
        timestamp: new Date().toISOString(),
      })
    );
  }

  onMessage(listener: (message: any) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(
        (l) => l !== listener
      );
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// ------------------------------

beforeAll(() => {
  // Enable API mocking before all the tests.
  server.listen();
});

afterEach(() => {
  // Reset the request handlers between each test.
  // This way the handlers we add on a per-test basis
  // do not leak to other, irrelevant tests.
  server.resetHandlers();
});

afterAll(() => {
  // Finally, disable API mocking after the tests are done.
  server.close();
});

describe("ChatClient", () => {
  // 在所有测试之前设置MSW服务器
  // jest.setup.ts已经配置了全局的beforeAll/afterAll/afterEach

  it("should connect to websocket server", async () => {
    const client = new ChatClient("wss://chat.example.com");
    await client.connect();

    // 清理
    client.disconnect();
  });

  it("should join the chat and receive welcome message", async () => {
    // 安排
    const client = new ChatClient("wss://chat.example.com");
    const mockMessageListener = jest.fn();

    // 行动
    await client.connect();
    client.onMessage(mockMessageListener);
    client.join("TestUser");

    // 断言 - 等待欢迎消息
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (mockMessageListener.mock.calls.length > 0) {
          clearInterval(checkInterval);

          const receivedMessage = mockMessageListener.mock.calls[0][0];
          expect(receivedMessage.type).toBe("system");
          expect(receivedMessage.content).toContain("Welcome TestUser");

          // 清理
          client.disconnect();
          resolve();
        }
      }, 100);
    });
  });

  it("should send and receive chat messages", async () => {
    // 安排
    const client = new ChatClient("wss://chat.example.com");
    const receivedMessages: any[] = [];

    // 行动
    await client.connect();
    client.onMessage((message) => receivedMessages.push(message));
    client.sendMessage("TestUser", "Hello, world!");

    // 断言 - 等待消息回显
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (receivedMessages.length > 0) {
          clearInterval(checkInterval);

          const echoMessage = receivedMessages.find(
            (msg) => msg.type === "message" && msg.content === "Hello, world!"
          );

          expect(echoMessage).toBeDefined();
          expect(echoMessage.username).toBe("TestUser");

          // 清理
          client.disconnect();
          resolve();
        }
      }, 100);
    });
  });

  it("should receive system notifications", async () => {
    // 安排
    const client = new ChatClient("wss://chat.example.com");
    const receivedMessages: any[] = [];

    // 行动
    await client.connect();
    client.onMessage((message) => receivedMessages.push(message));

    // 断言 - 等待系统通知(handlers.ts中设置了2秒后发送)
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const systemMessage = receivedMessages.find(
          (msg) =>
            msg.type === "system" &&
            msg.content === "This is a system notification from the mock server"
        );

        expect(systemMessage).toBeDefined();

        // 清理
        client.disconnect();
        resolve();
      }, 3000); // 给足够时间让模拟的系统消息发送(>2000ms)
    });
  });
});
