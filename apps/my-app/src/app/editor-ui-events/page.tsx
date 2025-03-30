"use client";

import React, { useState, useCallback, KeyboardEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Paperclip,
  Send,
  Plus,
  Home,
  Settings,
  Edit,
  Download,
  Share,
  Users,
  Play,
  Pause,
  Search,
  MoreVertical,
  PenTool,
} from "lucide-react";
import { SubtaskStatus, TaskStatus } from "@repo/events-core/event-types";
import { DIProvider, useEditorService } from "../../lib/di/di-provider";
import {
  ChatTreeNodeItem,
  FileTreeNodeItem,
  FolderTreeNodeItem,
  TreeNodeItemType,
  useEditorStore,
  getTaskStatusBadge,
  getSubtaskStatusBadge,
  getTaskActionButton,
  getSubtaskActionButton,
  isTaskTreeNodeItem,
  hasChildrenNodeItems,
  isSubtaskTreeNodeItem,
  isChatTreeNodeItem,
  isFileTreeNodeItem,
  isFolderTreeNodeItem,
} from "../../features/editor/editor-store";
import { ILogObj, Logger } from "tslog";

// Setup logger
const logger = new Logger<ILogObj>({ name: "editor-ui" });

// Common Components

const ActionIconButton = ({
  icon,
  onClick,
  label,
  className = "",
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  label?: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`p-1 hover:bg-gray-100 rounded-md flex items-center ${className}`}
    title={label}
  >
    {icon}
    {label && <span className="ml-1 text-sm">{label}</span>}
  </button>
);

const NavigationBreadcrumb = ({ path }: { path: string[] }) => (
  <div className="px-4 py-2 border-b text-sm text-gray-600 flex items-center flex-wrap">
    <Home className="inline-block w-4 h-4 mr-1" />
    <span>Home</span>
    {path.length > 0 && (
      <>
        <span className="mx-1">&gt;</span>
        <Users className="inline-block w-4 h-4 mr-1" />
        <span>Workspace</span>
      </>
    )}
    {path.map((segment, index) => (
      <React.Fragment key={index}>
        <span className="mx-1">&gt;</span>
        <span>{segment}</span>
      </React.Fragment>
    ))}
  </div>
);

// Left Panel (Explorer) Components

const TaskTreeNode = ({
  item,
  level,
  onNewChat,
}: {
  item: TreeNodeItemType;
  level: number;
  onNewChat: (itemId: string) => void;
}) => {
  const { toggleFolder, isExpanded } = useEditorStore();
  const isOpen = isExpanded(item.id);
  const paddingLeft = `${level * 16}px`;

  if (!isTaskTreeNodeItem(item)) {
    return null;
  }

  const handleClick = () => {
    toggleFolder(item.id);
  };

  const statusBadge = item.data.status ? (
    <TaskStatusBadge status={item.data.status} />
  ) : null;

  const actionButton = item.data.status ? (
    <TaskActionButton status={item.data.status} />
  ) : null;

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 group`}
        style={{ paddingLeft }}
      >
        <span className="mr-1">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <span className="flex-grow truncate">{item.name}</span>
        {statusBadge}
        <span className="ml-1">{actionButton}</span>
        <span className="ml-1 invisible group-hover:visible">
          <TaskOptionsButton />
        </span>
      </div>

      {isOpen && (
        <div>
          <NewChatButton level={level + 1} onClick={() => onNewChat(item.id)} />

          {hasChildrenNodeItems(item) && item.children.length > 0 ? (
            item.children.map((child: TreeNodeItemType) => (
              <ExplorerItem
                key={child.id}
                item={child}
                level={level + 1}
                onNewChat={onNewChat}
              />
            ))
          ) : (
            <div
              className="text-gray-400 px-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
            >
              (No items)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TaskStatusBadge = ({ status }: { status: TaskStatus }) => {
  const icon = getTaskStatusBadge(status);
  return <span title={status}>{icon}</span>;
};

const TaskActionButton = ({ status }: { status: TaskStatus }) => {
  const actionIcon = getTaskActionButton(status);

  let icon;
  if (actionIcon === "⏸️") {
    icon = <Pause className="w-3 h-3" />;
  } else if (actionIcon === "▶️") {
    icon = <Play className="w-3 h-3" />;
  }

  return actionIcon ? <ActionIconButton icon={icon} /> : null;
};

const TaskOptionsButton = () => (
  <ActionIconButton icon={<MoreVertical className="w-3 h-3" />} />
);

const SubtaskTreeNode = ({
  item,
  level,
  onNewChat,
}: {
  item: TreeNodeItemType;
  level: number;
  onNewChat: (itemId: string) => void;
}) => {
  const { toggleFolder, isExpanded } = useEditorStore();
  const isOpen = isExpanded(item.id);
  const paddingLeft = `${level * 16}px`;

  if (!isSubtaskTreeNodeItem(item)) {
    return null;
  }

  const handleClick = () => {
    toggleFolder(item.id);
  };

  const statusBadge = item.data.status ? (
    <SubtaskStatusBadge status={item.data.status} />
  ) : null;

  const actionButton = item.data.status ? (
    <SubtaskActionButton status={item.data.status} />
  ) : null;

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 group`}
        style={{ paddingLeft }}
      >
        <span className="mr-1">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <span className="flex-grow truncate">{item.name}</span>
        {statusBadge}
        <span className="ml-1">{actionButton}</span>
        <span className="ml-1 invisible group-hover:visible">
          <SubtaskOptionsButton />
        </span>
      </div>

      {isOpen && (
        <div>
          <NewChatButton level={level + 1} onClick={() => onNewChat(item.id)} />

          {hasChildrenNodeItems(item) && item.children.length > 0 ? (
            item.children.map((child: TreeNodeItemType) => (
              <ExplorerItem
                key={child.id}
                item={child}
                level={level + 1}
                onNewChat={onNewChat}
              />
            ))
          ) : (
            <div
              className="text-gray-400 px-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
            >
              (No items)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SubtaskStatusBadge = ({ status }: { status: SubtaskStatus }) => {
  const icon = getSubtaskStatusBadge(status);
  return <span title={status}>{icon}</span>;
};

const SubtaskActionButton = ({ status }: { status: SubtaskStatus }) => {
  const actionIcon = getSubtaskActionButton(status);

  let icon;
  if (actionIcon === "🔍") {
    icon = <Search className="w-3 h-3" />;
  } else if (actionIcon === "▶️") {
    icon = <Play className="w-3 h-3" />;
  }

  return actionIcon ? <ActionIconButton icon={icon} /> : null;
};

const SubtaskOptionsButton = () => (
  <ActionIconButton icon={<MoreVertical className="w-3 h-3" />} />
);

const ChatFileNode = ({
  item,
  level,
}: {
  item: ChatTreeNodeItem;
  level: number;
}) => {
  const { setSelectedItem, selectedItem } = useEditorStore();
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    setSelectedItem(item);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 group ${
        selectedItem?.id === item.id ? "bg-blue-100" : ""
      }`}
      style={{ paddingLeft }}
    >
      <MessageSquare className="w-4 h-4 mr-1" />
      <span className="flex-grow truncate">{item.name}</span>
      <span className="ml-1 invisible group-hover:visible">
        <FileOptionsButton />
      </span>
    </div>
  );
};

const DocumentFileNode = ({
  item,
  level,
}: {
  item: FileTreeNodeItem;
  level: number;
}) => {
  const { setSelectedItem, selectedItem } = useEditorStore();
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    setSelectedItem(item);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 group ${
        selectedItem?.id === item.id ? "bg-blue-100" : ""
      }`}
      style={{ paddingLeft }}
    >
      <FileText className="w-4 h-4 mr-1" />
      <span className="flex-grow truncate">{item.name}</span>
      <span className="ml-1 invisible group-hover:visible">
        <FileOptionsButton />
      </span>
    </div>
  );
};

const FileOptionsButton = () => (
  <ActionIconButton icon={<MoreVertical className="w-3 h-3" />} />
);

const FileTreeNode = ({
  item,
  level,
}: {
  item: TreeNodeItemType;
  level: number;
}) => {
  if (isChatTreeNodeItem(item)) {
    return <ChatFileNode item={item} level={level} />;
  } else if (isFileTreeNodeItem(item)) {
    return <DocumentFileNode item={item} level={level} />;
  }
  return null;
};

const NewChatButton = ({
  level,
  onClick,
}: {
  level: number;
  onClick: () => void;
}) => (
  <div
    className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 text-green-600"
    style={{ paddingLeft: `${level * 16}px` }}
    onClick={onClick}
  >
    <Plus className="w-4 h-4 mr-1" />
    <span>[+ New Chat]</span>
  </div>
);

const NewTaskButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="text-green-600 hover:text-green-700 px-2 py-1 rounded cursor-pointer"
  >
    [+ New Task]
  </button>
);

const ExplorerItem = ({
  item,
  level = 0,
  onNewChat,
}: {
  item: TreeNodeItemType;
  level?: number;
  onNewChat: (itemId: string) => void;
}) => {
  // Call hook at the top level before any conditional logic
  const { toggleFolder, isExpanded } = useEditorStore();

  // Determine which type of item we're dealing with
  if (level === 1 && (isFolderTreeNodeItem(item) || isTaskTreeNodeItem(item))) {
    // This is a task (level 1 folder or task)
    return <TaskTreeNode item={item} level={level} onNewChat={onNewChat} />;
  } else if (
    level === 2 &&
    (isFolderTreeNodeItem(item) || isSubtaskTreeNodeItem(item))
  ) {
    // This is a subtask (level 2 folder or subtask)
    return <SubtaskTreeNode item={item} level={level} onNewChat={onNewChat} />;
  } else if (isChatTreeNodeItem(item) || isFileTreeNodeItem(item)) {
    // This is a file or chat
    return <FileTreeNode item={item} level={level} />;
  } else if (isFolderTreeNodeItem(item)) {
    // Root folder (workspace)
    const isOpen = isExpanded(item.id);

    return (
      <div>
        <div
          onClick={() => toggleFolder(item.id)}
          className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100"
          style={{ paddingLeft: `${level * 16}px` }}
        >
          <span className="mr-1">
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
          <span className="flex-grow truncate">{item.name}</span>
        </div>

        {isOpen && hasChildrenNodeItems(item) && item.children.length > 0 && (
          <div>
            {item.children.map((child: TreeNodeItemType) => (
              <ExplorerItem
                key={child.id}
                item={child}
                level={level + 1}
                onNewChat={onNewChat}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

const ExplorerHeader = () => <div className="text-xl p-2">🏠</div>;

const ExplorerViewSwitch = () => (
  <div className="flex flex-col">
    <ExplorerViewButton icon={Settings} label="SETTINGS" />
  </div>
);

const ExplorerViewButton = ({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) => (
  <button className="flex items-center text-gray-600 hover:text-gray-800 p-2">
    <Icon className="w-4 h-4 mr-1" /> {label}
  </button>
);

const WorkspaceTreeView = ({
  data,
  onNewChat,
}: {
  data: FolderTreeNodeItem;
  onNewChat: (itemId: string) => void;
}) => <ExplorerItem item={data} onNewChat={onNewChat} />;

const ExplorerPanel = () => {
  const { data } = useEditorStore();
  const editorService = useEditorService();

  const handleCreateNewTask = () => {
    editorService.clientCreateTask("New Task", {});
  };

  const handleNewChat = (itemId: string) => {
    console.log("Creating new chat in folder", itemId);
    editorService.clientStartNewChat(itemId, itemId);
  };

  return (
    <div className="w-72 bg-white border-r overflow-y-auto">
      <div className="p-2 flex items-center justify-between border-b">
        <ExplorerHeader />
        <NewTaskButton onClick={handleCreateNewTask} />
      </div>
      <div className="flex flex-col h-[calc(100vh-88px)]">
        <div className="flex-grow overflow-y-auto">
          <WorkspaceTreeView data={data} onNewChat={handleNewChat} />
        </div>
        <div className="p-2 border-t">
          <ExplorerViewSwitch />
        </div>
      </div>
    </div>
  );
};

// Middle Panel (Chat) Components

const UserChatMessage = ({ message }: { message: { content: string } }) => (
  <div className="mb-4 p-3 rounded-md bg-gray-50">
    <div className="font-bold">[User]</div>
    <div>{message.content}</div>
  </div>
);

const AssistantChatMessage = ({
  message,
}: {
  message: { content: string };
}) => (
  <div className="mb-4 p-3 rounded-md bg-blue-50">
    <div className="font-bold">[AI]</div>
    <div>{message.content}</div>
  </div>
);

const ChatMessagesView = ({
  messages,
}: {
  messages: { role: string; content: string; id: string }[];
}) => (
  <div className="flex-grow p-4 overflow-auto">
    {messages.length > 0 ? (
      messages.map((msg) =>
        msg.role === "USER" ? (
          <UserChatMessage key={msg.id} message={msg} />
        ) : (
          <AssistantChatMessage key={msg.id} message={msg} />
        )
      )
    ) : (
      <div className="text-gray-400">
        No messages yet. Start a conversation!
      </div>
    )}
  </div>
);

const UserPresenceIndicator = ({
  name,
  status,
}: {
  name: string;
  status: "editing" | "viewing";
}) => (
  <div className="flex items-center">
    <span className="mr-1">👤</span>
    <span>
      {name} is {status}...
    </span>
  </div>
);

const UserPresenceBanner = () => {
  const { activeUsers } = useEditorStore();

  if (!activeUsers || activeUsers.length === 0) return null;

  return (
    <div className="bg-blue-50 text-blue-800 p-2 border-t border-b border-blue-200">
      {activeUsers.map((user, index) => (
        <UserPresenceIndicator
          key={index}
          name={user.name}
          status={user.status}
        />
      ))}
    </div>
  );
};

const ChatNavigationHeader = ({ item }: { item: TreeNodeItemType }) => {
  const { getItemPath } = useEditorStore();
  const path = getItemPath(item.id);

  return <NavigationBreadcrumb path={path} />;
};

const ChatMessageInput = ({
  value,
  onChange,
  onKeyDown,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) => (
  <input
    type="text"
    placeholder="Write a message..."
    className="flex-grow px-3 py-2 border rounded-md"
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
  />
);

const FileAttachmentButton = () => (
  <button className="p-2 hover:bg-gray-100 rounded-md">
    <Paperclip className="w-5 h-5" />
  </button>
);

const InsertContentButton = () => (
  <button className="p-2 hover:bg-gray-100 rounded-md">
    <PenTool className="w-5 h-5" />
  </button>
);

const ChatSendButton = ({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) => (
  <button
    className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md disabled:bg-blue-300"
    onClick={onClick}
    disabled={disabled}
  >
    <Send className="w-5 h-5" />
  </button>
);

const ChatInputContainer = ({ chatId }: { chatId: string }) => {
  const [inputValue, setInputValue] = useState("");
  const editorService = useEditorService();

  const handleSendMessage = useCallback(() => {
    if (inputValue.trim()) {
      editorService.clientSubmitMessage(chatId, inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, editorService, chatId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-2">
        <ChatMessageInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <FileAttachmentButton />
        <InsertContentButton />
        <ChatSendButton
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
        />
      </div>
    </div>
  );
};

const ChatPanel = () => {
  const { selectedItem } = useEditorStore();
  const chatItem =
    selectedItem && isChatTreeNodeItem(selectedItem) ? selectedItem : null;

  if (!chatItem) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-400">
        Select a chat to view messages
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatNavigationHeader item={chatItem} />
      <ChatMessagesView messages={chatItem.data.messages || []} />
      <UserPresenceBanner />
      <ChatInputContainer chatId={chatItem.id} />
    </div>
  );
};

// Right Panel (Preview) Components

const PreviewNavigationHeader = ({ item }: { item: TreeNodeItemType }) => {
  const { getItemPath } = useEditorStore();
  const path = getItemPath(item.id);

  return <NavigationBreadcrumb path={path} />;
};

const PreviewActionToolbar = () => (
  <div className="flex items-center mb-4 text-sm text-gray-600">
    <ActionIconButton
      icon={<Edit className="w-4 h-4" />}
      label="Edit"
      className="mr-2 border"
    />
    <ActionIconButton
      icon={<Download className="w-4 h-4" />}
      label="Download"
      className="mr-2 border"
    />
    <ActionIconButton
      icon={<Share className="w-4 h-4" />}
      label="Share"
      className="border"
    />
  </div>
);

const CodeFileView = ({ content }: { content: string }) => (
  <pre className="whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-md border overflow-auto max-h-[calc(100vh-200px)]">
    {content || "Empty file"}
  </pre>
);

const MarkdownFileView = ({ content }: { content: string }) => (
  <div className="whitespace-pre-wrap bg-white p-4 rounded-md border overflow-auto max-h-[calc(100vh-200px)]">
    {content || "Empty file"}
  </div>
);

const FileContentView = ({ item }: { item: FileTreeNodeItem }) => {
  // Simple file type detection based on extension
  const isMarkdown = item.name.endsWith(".md");

  return (
    <div className="p-4 h-full">
      <PreviewActionToolbar />
      {isMarkdown ? (
        <MarkdownFileView content={item.content || ""} />
      ) : (
        <CodeFileView content={item.content || ""} />
      )}
    </div>
  );
};

const PreviewPanel = () => {
  const { selectedItem } = useEditorStore();
  const fileItem =
    selectedItem && isFileTreeNodeItem(selectedItem) ? selectedItem : null;

  if (!fileItem) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-400">
        Select a file to preview
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PreviewNavigationHeader item={fileItem} />
      <div className="p-4 flex-grow overflow-auto">
        <FileContentView item={fileItem} />
      </div>
    </div>
  );
};

// Combined Components

const CombinedNavigationHeader = ({ path }: { path: string[] }) => (
  <NavigationBreadcrumb path={path} />
);

const ContentSwitchView = ({ item }: { item: TreeNodeItemType }) => {
  if (isChatTreeNodeItem(item)) {
    return <ChatMessagesView messages={item.data.messages || []} />;
  } else if (isFileTreeNodeItem(item)) {
    return <FileContentView item={item} />;
  } else {
    return <div className="p-4 text-gray-600">Folder view: {item.name}</div>;
  }
};

const ChatPreviewPanel = () => {
  const { selectedItem, getItemPath } = useEditorStore();

  if (!selectedItem) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-400">
        Select an item from the explorer to view its content
      </div>
    );
  }

  const path = getItemPath(selectedItem.id);

  return (
    <div className="flex flex-col h-full">
      <CombinedNavigationHeader path={path} />
      <div className="flex-grow overflow-auto">
        <ContentSwitchView item={selectedItem} />
      </div>
      {isChatTreeNodeItem(selectedItem) && (
        <>
          <UserPresenceBanner />
          <ChatInputContainer chatId={selectedItem.id} />
        </>
      )}
    </div>
  );
};

// Modal for new chat/task prompt input
const PromptInputModal = ({
  type = "chat",
  isOpen,
  onClose,
  onSubmit,
}: {
  type?: "chat" | "task";
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}) => {
  const [prompt, setPrompt] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <PenTool className="w-5 h-5 mr-2" />
          <h2 className="text-xl font-semibold">
            {type === "chat" ? "New Chat" : "New Task"}
          </h2>
        </div>
        <textarea
          className="w-full h-32 p-2 border rounded-md mb-4"
          placeholder={`Enter your ${type} prompt...`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={() => {
              onSubmit(prompt);
              onClose();
            }}
            disabled={!prompt.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// Workspace Layouts

const WorkspaceThreeColumnLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <ExplorerPanel />
      <div className="flex-grow flex flex-col bg-white">
        <ChatPanel />
      </div>
      <div className="w-90 flex flex-col bg-white border-l">
        <PreviewPanel />
      </div>
    </div>
  );
};

const WorkspaceTwoColumnLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <ExplorerPanel />
      <div className="flex-grow flex flex-col bg-white">
        <ChatPreviewPanel />
      </div>
    </div>
  );
};

// Main Editor Page Component with DI Provider
const EditorPage = () => {
  logger.debug("EditorPage rendered");
  const [showThreeColumn, setShowThreeColumn] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptType] = useState<"chat" | "task">("chat");

  const handleSubmitPrompt = (prompt: string) => {
    console.log(`New ${promptType} prompt submitted:`, prompt);
    // Logic to handle the prompt would go here
  };

  // For development: Toggle between layouts
  const toggleLayout = () => {
    setShowThreeColumn(!showThreeColumn);
  };

  return (
    <DIProvider logger={logger}>
      {/* Only for development: Layout toggle button */}
      <button
        onClick={toggleLayout}
        className="fixed top-2 right-2 z-50 px-2 py-1 bg-blue-500 text-white rounded-md"
      >
        Toggle Layout
      </button>

      {showThreeColumn ? (
        <WorkspaceThreeColumnLayout />
      ) : (
        <WorkspaceTwoColumnLayout />
      )}

      <PromptInputModal
        type={promptType}
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onSubmit={handleSubmitPrompt}
      />
    </DIProvider>
  );
};

export default EditorPage;
