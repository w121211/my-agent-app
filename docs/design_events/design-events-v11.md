# Event Flows for Chat (MVP)

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

# In-memory Chat Object Creation (Object-First approach)
→ ServerChatCreated {chatObject} # New event: creates chat in memory first
→ ServerChatFileCreated (async operation, doesn't block UI)

# Creation Completed - Return chat object, not just file path
→ ServerNewChatCreated {chatId: newChatId, chatObject: chat} # Modified: returns full chat object
→ UIFileAutoClicked {filePath: newChatPath}
  → ClientOpenChatFile {filePath: newChatPath} # Changed to chat-specific event

# Chat Panel Update
→ UIChatPanelUpdated {chatObject} # UI updates based on chat object, not file

# Chat mode processing
(if mode === "chat" && prompt exists)
→ (Client Submit Chat Message Flow) # Continue to message submission if prompt exists
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

# Server Processing - Memory First
→ ServerUserChatMessagePostProcessed (handles #references and knowledge)
→ ServerChatMessageAppended {role: "user", content, timestamp}
→ ServerChatUpdated {chatObject, update: {kind: "MESSAGE_ADDED", message: message}} # More structured update format
→ UIChatMessagesUpdated # UI updates immediately based on chat object

# Asynchronous File Operations (happens in background)
→ ServerChatFileUpdated # Happens after file write completes, UI doesn't wait for this

# Server Processing - AI Response
→ ServerAIResponseRequested
→ UIChatResponseLoadingStarted
→ ServerAIResponseGenerated
→ ServerAIResponsePostProcessed (handles artifacts and formatting)

# Artifact Creation (if needed)
→ ServerArtifactFileCreated (creates files for each artifact) # File system operation, UI doesn't wait for this
→ ServerChatUpdated {chatObject, update: {kind: "ARTIFACT_ADDED", artifact}} # UI updates based on this event
→ UIPreviewPanelUpdated (shows artifact) # UI responds to ServerChatUpdated, not ServerArtifactFileCreated

# Chat Update
→ ServerChatUpdated {chatObject, update: {kind: "MESSAGE_ADDED", message: aiMessage}}
→ UIChatMessagesUpdated
→ UIChatResponseLoadingEnded

# Asynchronous File Operations (happens in background)
→ ServerChatFileUpdated
```

## 3. Open File Flow

### User Story

A user clicks on a file in the explorer. The system detects the file type, loads the appropriate content, and displays it in either the chat panel (for chat files) or the preview panel (for non-chat files).

### Core Event Flow

```
UIFileClicked

# Generic File Open Command
→ ClientOpenFile {filePath, correlationId}

# Server determines file type based on extension, metadata, or content
→ ServerFileTypeDetected {filePath, fileType} # Determines if it's a chat file or content file

# Branch based on file type
(if fileType === "chat")
  # Memory Cache Check for Chat Files
  (if chat exists in memory)
    → ServerChatFileOpened {filePath, chat, correlationId}
  (else)
    → ServerChatFileLoaded {filePath}
    → ServerChatFileOpened {filePath, chat, correlationId}

  # UI Update for Chat Files - based on ServerChatFileOpened
  → UIChatPanelUpdated

(else) # Non-chat file
  # Non-chat File Processing
  → ServerNonChatFileOpened {filePath, content, fileType, correlationId}

  # UI Update for Non-chat Files
  → UIPreviewPanelUpdated {content, fileType} # Updates preview panel based on file type
```
