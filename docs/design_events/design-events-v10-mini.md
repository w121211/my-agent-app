# Event Flows for Chat

## 1. Create New Chat Flow

### User Story

A user wants to start a new conversation with the AI. They click the "New Chat" button, configure their chat settings including whether to create a new task, select their model preference, and input their initial prompt. After submission, a new chat interface appears ready for interaction.

### Core Event Flow

```
# User Interaction
UINewChatButtonClicked

ClientCreateNewChat {newTask: boolean, mode: "chat"|"agent", knowledge: string[], prompt: string, model: string}

(if newTask === true)
  → ServerTaskFolderCreated
  → ServerTaskConfigFileCreated

# Chat file creation
→ ServerChatFileCreated (under current folder or the newly created task folder)
→ ServerChatInitialized

# Creation Completed
→ ServerNewChatCreated {filePath: newChatPath, chatId: newChatId}
→ UIFileAutoClicked {filePath: newChatPath}   # UI 自動點選新創的chat file，後續就跟一般的open chat file一樣
  → ClientOpenFile {filePath: newChatPath}
  (continues to Open Existing Chat Flow)

# Chat mode processing
(if mode === "chat")
→ (Client Submit Chat Message Flow)

# Agent mode processing (not for MVP1)
(if mode === "agent")
→ ServerAgentRunInitiated
→ ServerAgentRunStarted
→ ... (omitted, not considered for MVP1)
```

## 2. Submit Chat Message Flow

### User Story

A user in an active chat composes a message, potentially references files using the `#file` syntax, attaches documents if needed, and sends their message. They see their message appear in the chat, along with a loading indicator while the AI processes the response. The AI's response with any artifacts is then displayed.

### Core Event Flow

```
# User Interface
UIChatMessageSubmitted {message, attachments}

# Client Command
→ ClientSubmitUserChatMessage {chat_id, message, attachments}

# Server Processing - User Message
→ ServerUserChatMessagePostProcessed (handles #references and knowledge)
→ ServerChatMessageAppended {role: "user", content, timestamp}
→ ServerChatFileUpdated
→ UIChatMessagesUpdated (shows user message)

# Server Processing - AI Response
→ ServerAIResponseRequested
→ UIChatResponseLoadingStarted
→ ServerAIResponseGenerated
→ ServerAIResponsePostProcessed (handles artifacts and formatting)

# Artifact Creation (if needed)
→ ServerArtifactFileCreated (creates files for each artifact)
→ UIPreviewPanelUpdated (shows artifact)

# Chat Update
→ ServerChatMessageAppended {role: "assistant", content, timestamp}
→ UIChatMessagesUpdated (shows AI response)
→ UIChatResponseLoadingEnded
→ ServerChatFileUpdated
```

## 3. Open File Flow

### User Story

A user navigates to any file in the explorer and clicks on it. The system loads the file content and displays it in the appropriate panel based on the file type.

### Core Event Flow

```
UIFileClicked

# Command and Response
→ ClientOpenFile {filePath}
→ ServerFileOpened {filePath, content, fileType}

# Frontend Parsing (internal, no event)
→ (Frontend parses content based on fileType)

# UI Update
→ UIChatPanelUpdated (for chat files)
  or
→ UIPreviewPanelUpdated (for other files)
```
