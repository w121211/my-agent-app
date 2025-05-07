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

目標

Implementation note

- 在程式還沒穩定前，新 types 直接寫在最為相關的 file 裡，不去更動原本的 event-types.ts
-

Rewrite task repository

- 忽略現在的 task repository，現在的repository將會淘汰
- 可參考 chat repository 寫法
- Task 是一個 folder, 存有 task.json
- save/load task，用 Zod 做資料驗證
- Create/update/remove task
- 有 task cache
- 路徑優先於 id

Update task service

- Run task (naive run)
  - Steps:
    - Get the entry chat object by its path through chat repo
      - entry chat path is stored in task.json
    - Run entry chat
    - List all 1st level subtask paths, sort in ascending order by subtask’s folder name, ie[task1, task2, …] )
      - This method may implement in task repo or task service?
    - For each 1st level subtask path: get the subtask object (through task repo) & run
  - Only initialize the task, chat when we really need to use it

```
/task1
- task.json
- chat1.json  # entry chat
- /task2   # subtask
    - task.json
    - chat1.json
- /task3
    - task.json
    - chat1.json
    - /task4
        - …

# Task1 run sequence:
1. Init chat1, run chat1
2. Init task2 , run task2
3. Init task 3, run task3
```

Add run chat feature - chat-service.ts

- Start, stop run chat
  - No pause running chat (MVP)
  - Start run run the chat from the starting point (like rerun)
- 當執行 run chat 時，會先備份當前的chat

```
Before:
- chat1.json  # 因為還沒 rerun，所以沒有備份

After:
- chat1.json # 最新的 run，複寫 chat1.json
- /chat_backup (or chat_history, chat_runs, …?)
    - chat1.run0.json  # this is the initial chat
    - chat1.run1.json
    - chat1.run2.json  # previous run result
```

Chat 需要儲存哪些東西？

- 這只是思考，並非決定版
- messages
  - Current messages
  - 每個 message 都會有時間戳，這個時間戳也可以用於表示 run 的時間點
  - 當rerun時，不管content有沒有變，時間戳都會按照最新的時間來記錄
- source messages (或是叫 original, backup, …?）
  - 當在 rerun 時，先備份原本的 messages，新生成的 messages 就直接寫入 messages
  - 這只是為了省麻煩，避免修改原始的 messages

Message block可以是一個 prompt, tool, or ai，總之要能串連起來

- 每個block會先被處理
  - Prompt：處理 injections
  -

Prompt 可以注入（injections）哪些？

- #{file_path}: 會嘗試轉成 markdown text
  - Output => “<file data-path=“...”>{{markdown_text}}</file>”
  - Example “<file data-path=“/some/path/hello.txt”>Hello!</file>”
- #{json_file_path}: 會嘗試 parse json file，然後引用指定的值
  - Example:
    - “#{user1.json:name}” => “<file …>Amy</file>”
    - 假設 user1.json = {name: “Amy”}
  - Output => <{{json_file_path}}>chat-obj.messages[10].toString()<{{/json_file_path}}>
-
- #<predefined-block> #{predefined-string} => MVP 略過
- {{inputData}}

Prompt injection

- 安全問題：要考慮到若引用敏感資訊的問題
  - 只能引用workspace內的 file
  - Block reference files list, eg hidden files, “.env”, …

Chat messages 實際上可以看成是一個 workflow

- 需要有個 trigger
  Trigger <- {
  runChatPath: “/some/path/chat1”,
  input: {…}
  }
- Input 的作用
  - 用於實現一些複雜應用，可以用於

chat1 = {
messages: [
{role: “tool”, input, api: “”, …}
{role: “prompt”, content: “....”},
…
]
}

@print(“hello_world”)

- {workflowName: “print”, inputData: [“hello_world”]}
  @summarize(“#/path/to/chat.json:{{messages[7]}}”) -> 用於引用 chat data - messages param

- Get workflow
  - Load the corresponding chat (which stored somewhere, like “default_workflows/print.chat.json”)
- Run workflow = Run chat

試著思考 Summarize chat 的運作過程（裡面的 variables 都只是示意、猜測，不要照抄）

- 前端
  - User click summarize chat button
    - submit a tool message

```
{	role: “tool”,
	toolChain: [		{toolName: “runChat”, args: {
			chatPath: “./summarize-chat.chat.json”,
			inputData: {chatMessages: state.chat.messages}
		}},
		{toolName: “saveTo”, args: {
			text: {{ previousOutput }},
			saveToPath: “”
		} },
	]}

```

        - commandService.submitRunChatCommand({chatName: “@summarize-chat”, inputData: {chatPathToSummarize: state.thisChatPath}})

- 後端
  - 收到 client run chat command
  - Chat service - run chat( chatPath: …, inputData: …)
    - summarizeChat <- chatRepo.get(chatPath)
    - summarizeChat.run(inputData)
      - 假設
        - inputData = {chatPathToSummarize: “some/path/for/summarize.chat.json”}
      - Execute message1:
        - 假設
          - message1 = {role: “tool”, tool: {name: “getChat”, inputData: {chatPath: “”}}}
        - ## run tool
      - message2 = {role: “prompt”, content: “”}

Run task implementation notes

1. Client run task command {taskDirectoryPath: ….}
2. Load and initialize task, including all subtasks under the task directory
3. Run Task

如何 initialize Task？

- 類似 chat，有一個 task cache，優先使用 cache
- 沒有的情況下， scan task folder，只需要第一個子階層就好，不需要 down to the leaf

Run task 步驟 (naive run)
Rerun chat

- 需要考慮不同情境
  - Chat mode: prompt -> ai -> prompt -> ai
    - Prompt 固定，動態注入 references
    - AI 部分會重跑，所以 ai 部分會變動
  - Chat mode + tools （workflow mode？）
    - 例如：prompt -> ai -> {input} tool {output} -> ai -> tool
    - Tool 會重跑，需要考慮 tool 的 input/output 要如何與前後一個 block 相連接
      - naive的做法：完全丟給 ai 做 parse/銜接（可以是用一個外部的 workflow ，不一定需要放在這個 workflow 裡）
        - {output_from_previous_block} -> ai -> {transformed_output} -> tool -> {tool_output} -> ai -> …
        - 外部 workflow 的話就需要有一個「引用外部 workflow」的機制
          - 其實想一想，workflow不也是一種 function 嗎？一樣是 output <- function(input)，那引用外部 workflow 應該可以用 tool 來表示？就當作一個 tool 來執行
  - Agent mode
    - Prompt -> ai loop
    - 全自動agent，完全基於初始 prompt 自動跑
