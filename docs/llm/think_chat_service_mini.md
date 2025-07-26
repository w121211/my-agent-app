### 思考 Summarize chat 的程式運作流程

- 注意：這只是非常草的草案，不需要照抄
- 我在思考的是如何將它設計成類似 extension 的方式，而非原生元件

前端

- Define the summarize button
- Chat extension 是不是有可能從 inputs 收到一些注入的值？例如 chat

```tsx
<chat-extension availableVariables availableFunctions>
  <button
    onClick={availableFunctions.submitToolMessage({
      // app default tool
      toolName: "app.runChat",

      inputs: {
        chatPath: "extension/path/summarize-chat.chat.json",
        // input when running the summarize-chat
        inputs: {
          // current chat
          chat: availableVariables.chat,
        },
      },
    })}
  ></button>
</chat-extension>
```

- 更進一步，乾脆不要寫tsx，就假設基本的 extension 就是一個按鈕，統一 render，直接用json來定義可不可以？
  - 當 user click 後 -> render the tool message template -> submit tool message -> (server) run the tool

```js
// Usage: "@summarizeChat", 好像等同於 "@runChat({chatPath: '${{ chat.path }}', chat: '${{ chat }}'})"
const customDefinedTool: ToolMessageTemplate = {
  toolName: "@summarizeChat",
  runFunctionName: "app.runChat",  // app default tool "runChat"
  runFunctionInputs: {
    chatPath: "${{ chat.path }}",
    inputs: {
      chat: "${{ chat }}",
      saveTo: "${{ replace(chat.path, '.json') }}-summary.txt"
    },
  },

  // 假設 runChat(...) outputs = { ranChat, ... }
  outputsPostProcess: {
    // 把它轉成 artifact
    toArtifact: {
        text: "${{ tool.run.results.ranChat.messages[tool.run.results.ranChat.messages.length-1] }}", // last message
        fileName: "${{ chat.filename.replace('.json', '-summary.txt') }}"
    }
  }
};
```

- 如何展示 output？

```txt
[system]: Run tool {...}

[system]: Tool run results {...}

[system]: Tool run results transform: [artifact_file]
```

### 思考 Run chat 的流程

chatObj 可能長怎樣?

```js
const summarizeChatObj = {
  // 我在想需不需要特別為這種 workflow template 型的 chat 專門定義一個 type，因為處理邏輯可能跟一般的 chat 邏輯不太一樣？
  type: "workflowTemplate",

  // 由 runChat 注入的值，假設本次注入值
  inputs: {
    // 寫法1: 一種是注入 chat path
    chatToSummarizePath: "some/path/chat.json",

    // 寫法2: 更簡單暴力，直接注入 chat object
    chat: {
      messages: ["..."],
    },

    saveTo: "/some/path/summary.txt",
  },

  // 依照此 messages 依序執行，執行的結果會存在 `chat.messages`
  sourceMessages: [
    {
      role: "promptTemplate",
      // 寫法1.1，github actions 寫法，並在大括號裡使用 loadJson 預設函數，然後按 path 來取得需要的 variable
      templateText:
        "Please summarize this: ${{ loadJson(inputs.chatToSummarizePath, path='.messages') }}",
      // 寫法1.2，模仿 copilot 寫法，但要 double render，1. render ${{ ...}} -> render #file:....
      templateText:
        "Please summarize this: #file:${{ inputs.chatToSummarizePath }}?path=.messages",

      // 寫法2.1，直接用 messages
      templateText: "Please summarize this: ${{ chat.messages }}",
    },
    { role: "assistant", text: "for padding" },
    {
      role: "tool",
      tool: {
        name: "saveTo",
        inputs: {
          // 當 run 到這個 message 時，前一個 message 已經有結果，所以就直接引用
          text: "${{ chat.messages[1].text }}",
          saveToPath: "",
        },
      },
    },
  ],
};
```
