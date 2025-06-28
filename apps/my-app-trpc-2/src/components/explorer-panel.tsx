// apps/my-app-trpc-2/src/components/explorer-panel.tsx
import React, { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";
import {
  ChevronDown,
  ChevronRight,
  ChatDots,
  ThreeDotsVertical,
  Copy,
  Trash,
  Pencil,
  FileEarmark,
  FolderPlus,
  Folder,
  Folder2Open,
  Gear,
  PlusLg,
  FileEarmarkCheck,
  StopFill,
} from "react-bootstrap-icons";

// Type definitions

// As per design doc for styling, assuming ChatStatus and relevant Chat metadata are available for tree nodes representing chats.
// This might require backend changes to ProjectFolderService.getFolderTree if not already providing this.
export type ChatStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

interface ChatLikeForDisplay { // Simplified structure for display functions
  status: ChatStatus;
  metadata: {
    title: string;
  };
}

interface FolderTreeNode {
  name: string; // Filename, e.g., "chat1.chat.json" or "My Document.txt"
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
  // For .chat.json files, these fields would be populated by the backend (assumption)
  chatStatus?: ChatStatus;
  chatTitle?: string; // The actual title from chat metadata, e.g., "Untitled Chat" or user-set title
}

// Helper functions for chat display from design document
const getChatDisplayName = (node: FolderTreeNode): string => {
  if (node.isDirectory || !node.name.endsWith(".chat.json") || !node.chatStatus || node.chatTitle === undefined) {
    return node.name; // Return filename for non-chats or if chat info is missing
  }

  const title = node.chatTitle; // Use the actual chat title
  switch (node.chatStatus) {
    case "DRAFT":
      return `💭 ${title}`;
    case "ACTIVE":
      return title;
    case "ARCHIVED": // Future feature
      return `📦 ${title}`;
    default:
      return title; // Fallback to title or node.name if status is unexpected
  }
};

const getChatDisplayStyle = (node: FolderTreeNode): string => {
  if (node.isDirectory || !node.name.endsWith(".chat.json") || !node.chatStatus) {
    return "text-foreground"; // Default style for non-chats
  }
  if (node.chatStatus === "DRAFT") {
    return "italic text-muted";
  }
  return "text-foreground";
};


interface TaskInfo {
  id: string;
  status: "CREATED" | "INITIALIZED" | "IN_PROGRESS" | "COMPLETED";
  title: string;
  absoluteDirectoryPath: string;
}

const getFileIcon = (
  fileName: string,
  isDirectory: boolean,
  isExpanded = false,
) => {
  if (isDirectory) {
    return isExpanded ? (
      <Folder2Open className="text-accent text-sm" />
    ) : (
      <Folder className="text-accent text-sm" />
    );
  }

  if (fileName.endsWith(".chat.json")) {
    return <ChatDots className="text-accent text-sm" />;
  }

  return <FileEarmark className="text-muted text-sm" />;
};

const getTaskStatusBadge = (status: string) => {
  const statusConfig = {
    COMPLETED: {
      label: "completed",
      className: "bg-green-600/20 text-green-400 border-green-600/40",
    },
    IN_PROGRESS: {
      label: "running",
      className: "bg-blue-600/20 text-blue-400 border-blue-600/40",
    },
    CREATED: {
      label: "created",
      className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/40",
    },
    INITIALIZED: {
      label: "ready",
      className: "bg-purple-600/20 text-purple-400 border-purple-600/40",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.CREATED;

  return (
    <span
      className={`ml-2 rounded border px-2 py-0.5 font-mono text-xs ${config.className}`}
    >
      {config.label}
    </span>
  );
};

const FileOperationsMenu: React.FC<{
  node: FolderTreeNode;
  onNewChat: () => void;
}> = ({ node, onNewChat }) => {
  const { showToast } = useToast();

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path);
    showToast(`Path copied: ${node.path}`, "success");
  };

  const handleRename = () => {
    const newName = prompt(`Rename ${node.name}:`, node.name);
    if (newName && newName !== node.name) {
      showToast(`Rename functionality not implemented yet`, "info");
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${node.name}?`)) {
      showToast(`Delete functionality not implemented yet`, "info");
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="hover:bg-hover cursor-pointer rounded p-1 opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ThreeDotsVertical className="text-muted text-xs" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-panel border-border z-50 min-w-[200px] rounded-md border shadow-lg"
          sideOffset={5}
        >
          {node.isDirectory && (
            <>
              <DropdownMenu.Item
                className="hover:bg-hover text-foreground flex cursor-pointer items-center px-3 py-2 text-sm outline-none"
                onClick={onNewChat}
              >
                <ChatDots className="mr-2 text-sm" />
                New Chat
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="hover:bg-hover text-foreground flex cursor-pointer items-center px-3 py-2 text-sm outline-none"
                onClick={() =>
                  showToast(
                    "New Folder functionality not implemented yet",
                    "info",
                  )
                }
              >
                <FolderPlus className="mr-2 text-sm" />
                New Folder
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="bg-border my-1 h-px" />
            </>
          )}

          {!node.isDirectory && (
            <>
              <DropdownMenu.Item
                className="hover:bg-hover text-foreground flex cursor-pointer items-center px-3 py-2 text-sm outline-none"
                onClick={() =>
                  showToast("Open functionality not implemented yet", "info")
                }
              >
                <FileEarmark className="mr-2 text-sm" />
                Open
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="bg-border my-1 h-px" />
            </>
          )}

          <DropdownMenu.Item
            className="hover:bg-hover text-foreground flex cursor-pointer items-center px-3 py-2 text-sm outline-none"
            onClick={handleCopyPath}
          >
            <Copy className="mr-2 text-sm" />
            Copy Path
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="hover:bg-hover text-foreground flex cursor-pointer items-center px-3 py-2 text-sm outline-none"
            onClick={handleRename}
          >
            <Pencil className="mr-2 text-sm" />
            Rename
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="bg-border my-1 h-px" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center px-3 py-2 text-sm text-red-400 outline-none hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash className="mr-2 text-sm" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const TreeNode: React.FC<{
  node: FolderTreeNode;
  level: number;
  taskInfo?: TaskInfo;
}> = ({ node, level, taskInfo }) => {
  const {
    expandedNodes,
    toggleNodeExpansion,
    setSelectedChatFile,
    setSelectedPreviewFile,
    setSelectedTreeNode,
    selectedTreeNode,
    // openNewChatModal, // Removed from store, so remove from here
  } = useAppStore();
  const trpc = useTRPC(); // Get TRPC client
  const queryClient = useQueryClient(); // For potential cache updates
  const { showToast } = useToast();

  const isExpanded = expandedNodes.has(node.path);
  const isSelected = selectedTreeNode === node.path;
  const isTaskFolder = node.isDirectory && node.name.startsWith("task-");

  // Determine display name and style for the node
  const displayName = getChatDisplayName(node);
  const displayStyle = getChatDisplayStyle(node);

  const createDraftChatMutation = useMutation(
    trpc.chat.createDraftChat.mutationOptions({
      onSuccess: (newChat) => {
        showToast(`Draft chat "${newChat.metadata?.title || newChat.id}" created`, "success");
        setSelectedChatFile(newChat.absoluteFilePath);
        setSelectedTreeNode(newChat.absoluteFilePath);
        // Optionally, trigger a refetch of the folder tree for the parent directory if file watcher is slow or unreliable
        // queryClient.invalidateQueries(trpc.projectFolder.getFolderTree.queryKey({ absoluteProjectFolderPath: node.path }));
        // However, the file watcher + direct update should handle this.
      },
      onError: (error) => {
        showToast(`Failed to create draft chat: ${error.message}`, "error");
      },
    }),
  );

  const handleClick = () => {
    if (node.isDirectory) {
      toggleNodeExpansion(node.path);
    } else {
      setSelectedTreeNode(node.path);
      if (node.name.endsWith(".chat.json")) {
        setSelectedChatFile(node.path); // This will open the chat
      } else {
        setSelectedPreviewFile(node.path);
      }
    }
  };

  const handleNewChat = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!node.isDirectory) return; // Should only create chat in a directory

    setSelectedTreeNode(node.path); // Select the folder where chat will be created

    createDraftChatMutation.mutate({
      targetDirectoryAbsolutePath: node.path,
      // newTask: false, // Default is false, can be omitted
      // mode: "chat", // Default is "chat"
      // initialPromptDraft: "", // Default is undefined
      // model: "default" // Default is "default"
    });
  };

  const handleStopTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement stop task functionality
    console.log("Stop task:", taskInfo?.id);
  };

  return (
    <div>
      <div
        className={`group flex min-h-[28px] cursor-pointer items-center rounded px-1 py-0.5 text-[13px] ${
          isSelected
            ? "bg-selected text-foreground"
            : "hover:bg-hover text-foreground"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory && (
          <div className="mr-1 h-4 w-4">
            {isExpanded ? (
              <ChevronDown className="text-muted text-sm" />
            ) : (
              <ChevronRight className="text-muted text-sm" />
            )}
          </div>
        )}

        <div className="mr-2">
          {getFileIcon(node.name, node.isDirectory, isExpanded)}
        </div>

        <span className={`flex-1 truncate text-sm ${displayStyle}`}>{displayName}</span>

        {/* Context indicator for files in project context */}
        {/* This random condition should be replaced by actual logic if needed */}
        {!node.isDirectory && node.name.endsWith(".chat.json") && Math.random() > 0.7 && (
          <div className="mr-1" title="In Project Context">
            <FileEarmarkCheck className="text-accent text-xs" />
          </div>
        )}

        {/* Task status badge */}
        {isTaskFolder && taskInfo && (
          <>
            {getTaskStatusBadge(taskInfo.status)}
            {taskInfo.status === "IN_PROGRESS" && (
              <button
                onClick={handleStopTask}
                className="text-muted ml-1 opacity-0 hover:text-red-400 group-hover:opacity-100"
                title="Stop Task"
              >
                <StopFill className="text-xs" />
              </button>
            )}
          </>
        )}

        <div className="flex items-center">
          {node.isDirectory && (
            <button
              onClick={handleNewChat}
              className="hover:bg-hover mr-1 cursor-pointer rounded p-1 opacity-0 group-hover:opacity-100"
              title="New Chat"
            >
              <ChatDots className="text-muted hover:text-accent text-xs" />
            </button>
          )}

          <FileOperationsMenu node={node} onNewChat={handleNewChat} />
        </div>
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child: FolderTreeNode) => (
            <TreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to directly update folder tree based on file events
const updateTreeNodeDirectly = (
  tree: FolderTreeNode,
  fileEvent: {
    eventType: string;
    absoluteFilePath: string;
    isDirectory: boolean;
  },
): FolderTreeNode => {
  const filePath = fileEvent.absoluteFilePath;

  // Clone the tree to avoid mutating original
  const newTree = { ...tree };

  // Helper function to find parent directory and update
  const updateNode = (
    node: FolderTreeNode,
    pathSegments: string[],
  ): FolderTreeNode => {
    if (pathSegments.length === 0) return node;

    const [currentSegment, ...remainingSegments] = pathSegments;

    // If this is the target file/folder
    if (remainingSegments.length === 0) {
      if (!node.children) node.children = [];

      const existingIndex = node.children.findIndex(
        (child) => child.name === currentSegment,
      );

      if (fileEvent.eventType === "add" || fileEvent.eventType === "addDir") {
        // Add new file/folder if it doesn't exist
        if (existingIndex === -1) {
          const newChild: FolderTreeNode = {
            name: currentSegment,
            path: filePath,
            isDirectory: fileEvent.isDirectory,
            children: fileEvent.isDirectory ? [] : undefined,
          };
          node.children.push(newChild);
          // Sort children: directories first, then files
          node.children.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
        }
      } else if (
        fileEvent.eventType === "unlink" ||
        fileEvent.eventType === "unlinkDir"
      ) {
        // Remove file/folder
        if (existingIndex !== -1) {
          node.children.splice(existingIndex, 1);
        }
      }

      return { ...node, children: [...(node.children || [])] };
    }

    // Navigate deeper into the tree
    if (node.children) {
      const targetChildIndex = node.children.findIndex(
        (child) => child.name === currentSegment && child.isDirectory,
      );

      if (targetChildIndex !== -1) {
        const updatedChildren = [...node.children];
        updatedChildren[targetChildIndex] = updateNode(
          updatedChildren[targetChildIndex],
          remainingSegments,
        );
        return { ...node, children: updatedChildren };
      }
    }

    return node;
  };

  // Get relative path from tree root
  const treePath = tree.path;
  if (!filePath.startsWith(treePath)) return newTree;

  const relativePath = filePath.substring(treePath.length + 1);
  const pathSegments = relativePath.split("/");

  return updateNode(newTree, pathSegments);
};

export const ExplorerPanel: React.FC = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const {
    projectFolders,
    folderTrees,
    setProjectFolders,
    updateFolderTree,
    // openNewChatModal, // No longer needed here as TreeNode handles its own new chat logic
  } = useAppStore();

  // Track task information by directory path
  const [tasksByPath, setTasksByPath] = useState<Map<string, TaskInfo>>(
    new Map(),
  );

  // Query for project folders
  const projectFoldersQuery = useQuery(
    trpc.projectFolder.getAllProjectFolders.queryOptions(),
  );

  // Query for all tasks to get initial task status
  const allTasksQuery = useQuery(trpc.task.getAll.queryOptions());

  // Effect to handle successful project folders fetch
  useEffect(() => {
    if (projectFoldersQuery.data) {
      setProjectFolders(projectFoldersQuery.data);
    }
  }, [projectFoldersQuery.data, setProjectFolders]);

  // Effect to handle tasks data and build task mapping
  useEffect(() => {
    if (allTasksQuery.data) {
      const newTasksByPath = new Map<string, TaskInfo>();
      allTasksQuery.data.forEach((task) => {
        if (task.absoluteDirectoryPath) {
          newTasksByPath.set(task.absoluteDirectoryPath, {
            id: task.id,
            status: task.status,
            title: task.title,
            absoluteDirectoryPath: task.absoluteDirectoryPath,
          });
        }
      });
      setTasksByPath(newTasksByPath);
    }
  }, [allTasksQuery.data]);

  // Effect to show error if project folders query fails
  useEffect(() => {
    if (projectFoldersQuery.error) {
      showToast(
        `Failed to load project folders: ${projectFoldersQuery.error.message}`,
        "error",
      );
    }
  }, [projectFoldersQuery.error, showToast]);

  // Effect to load folder trees when project folders change
  useEffect(() => {
    const loadFolderTrees = async () => {
      if (projectFoldersQuery.data) {
        for (const folder of projectFoldersQuery.data) {
          try {
            const treeQueryOptions =
              trpc.projectFolder.getFolderTree.queryOptions({
                absoluteProjectFolderPath: folder.path,
              });
            const treeResult = await queryClient.fetchQuery(treeQueryOptions);
            updateFolderTree(folder.id, treeResult);
          } catch (error) {
            console.error(
              `Failed to load folder tree for ${folder.path}:`,
              error,
            );
            showToast(`Failed to load folder tree for ${folder.name}`, "error");
          }
        }
      }
    };

    loadFolderTrees();
  }, [
    projectFoldersQuery.data,
    queryClient,
    trpc,
    updateFolderTree,
    showToast,
  ]);

  // Subscribe to file watcher events and directly update folder trees
  const fileWatcherSubscription = useSubscription(
    trpc.event.fileWatcherEvents.subscriptionOptions(
      { lastEventId: null },
      {
        enabled: projectFolders.length > 0,
        onStarted: () => {
          console.log("File watcher subscription started");
        },
        onData: (event) => {
          const fileEvent = event.data;
          console.log(
            `File event: ${fileEvent.eventType} - ${fileEvent.absoluteFilePath}`,
          );

          // Find which project folder this file belongs to
          const affectedProjectFolder = projectFolders.find((folder) =>
            fileEvent.absoluteFilePath.startsWith(folder.path),
          );

          if (affectedProjectFolder) {
            // For add/delete events, directly update the folder tree
            if (
              fileEvent.eventType === "add" ||
              fileEvent.eventType === "addDir" ||
              fileEvent.eventType === "unlink" ||
              fileEvent.eventType === "unlinkDir"
            ) {
              console.log(
                `Directly updating folder tree for project: ${affectedProjectFolder.name}`,
              );

              const currentTree = folderTrees[affectedProjectFolder.id];
              if (currentTree) {
                try {
                  const updatedTree = updateTreeNodeDirectly(
                    currentTree,
                    fileEvent,
                  );
                  updateFolderTree(affectedProjectFolder.id, updatedTree);
                } catch (error) {
                  console.error(
                    `Failed to directly update folder tree for ${affectedProjectFolder.path}:`,
                    error,
                  );

                  // Fallback to refetching if direct update fails
                  const treeQueryOptions =
                    trpc.projectFolder.getFolderTree.queryOptions({
                      absoluteProjectFolderPath: affectedProjectFolder.path,
                    });

                  queryClient
                    .fetchQuery(treeQueryOptions)
                    .then((treeResult) => {
                      updateFolderTree(affectedProjectFolder.id, treeResult);
                    })
                    .catch((refetchError) => {
                      console.error(
                        `Fallback refetch also failed for ${affectedProjectFolder.path}:`,
                        refetchError,
                      );
                      showToast(
                        `Failed to update folder tree for ${affectedProjectFolder.name}`,
                        "error",
                      );
                    });
                }
              }
            }
          }
        },
        onError: (error) => {
          console.error("File watcher subscription error:", error);
          showToast(
            `File watcher error: ${error.message || "Unknown error"}`,
            "error",
          );
        },
        onConnectionStateChange: (state) => {
          console.log(`File watcher connection state: ${state}`);
        },
      },
    ),
  );

  // Subscribe to task events to update task status in real-time
  const taskEventSubscription = useSubscription(
    trpc.event.taskEvents.subscriptionOptions(
      { lastEventId: null },
      {
        enabled: true,
        onStarted: () => {
          console.log("Task event subscription started");
        },
        onData: (event) => {
          const taskEvent = event.data;
          console.log(
            `Task event: ${taskEvent.updateType} - ${taskEvent.taskId}`,
          );

          // Update the task in our local state
          const updatedTask = taskEvent.task;
          if (updatedTask.absoluteDirectoryPath) {
            setTasksByPath((prev) => {
              const newMap = new Map(prev);
              newMap.set(updatedTask.absoluteDirectoryPath!, {
                id: updatedTask.id,
                status: updatedTask.status,
                title: updatedTask.title,
                absoluteDirectoryPath: updatedTask.absoluteDirectoryPath!,
              });
              return newMap;
            });

            // Show status change notification
            if (taskEvent.updateType === "STATUS_CHANGED") {
              showToast(
                `Task "${updatedTask.title}" status changed to ${updatedTask.status}`,
                "info",
              );
            }
          }

          // Also invalidate the tasks query to keep it in sync
          queryClient.invalidateQueries({
            queryKey: trpc.task.getAll.queryKey(),
          });
        },
        onError: (error) => {
          console.error("Task event subscription error:", error);
          showToast(
            `Task event error: ${error.message || "Unknown error"}`,
            "error",
          );
        },
        onConnectionStateChange: (state) => {
          console.log(`Task event connection state: ${state}`);
        },
      },
    ),
  );

  // Add project folder mutation
  const addProjectFolderMutation = useMutation(
    trpc.projectFolder.addProjectFolder.mutationOptions({
      onSuccess: async (projectFolder) => {
        const updatedFolders = [...projectFolders, projectFolder];
        setProjectFolders(updatedFolders);
        showToast("Project folder added successfully", "success");

        // Load folder tree for new project
        try {
          const treeQueryOptions =
            trpc.projectFolder.getFolderTree.queryOptions({
              absoluteProjectFolderPath: projectFolder.path,
            });
          const treeResult = await queryClient.fetchQuery(treeQueryOptions);
          updateFolderTree(projectFolder.id, treeResult);
        } catch (error) {
          console.error(
            `Failed to load folder tree for new folder ${projectFolder.path}:`,
            error,
          );
          showToast(
            `Folder added but failed to load tree for ${projectFolder.name}`,
            "error",
          );
        }
      },
      onError: (error) => {
        showToast(`Failed to add project folder: ${error.message}`, "error");
      },
    }),
  );

  const handleAddProjectFolder = async () => {
    // In a real app, this would open a file dialog
    const folderPath = prompt("Enter project folder path:");
    if (!folderPath) return;

    addProjectFolderMutation.mutate({
      absoluteProjectFolderPath: folderPath,
    });
  };

  // Enhanced TreeNode with task info
  const EnhancedTreeNode: React.FC<{ node: FolderTreeNode; level: number }> = ({
    node,
    level,
  }) => {
    const taskInfo = tasksByPath.get(node.path);
    return <TreeNode node={node} level={level} taskInfo={taskInfo} />;
  };

  return (
    <div className="bg-surface border-border flex h-full w-64 flex-col border-r">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b p-3">
        <span className="text-muted text-xs font-semibold uppercase tracking-wide">
          Projects
        </span>
        <button
          onClick={handleAddProjectFolder}
          className="text-muted hover:text-accent p-1"
          title="Add Project"
        >
          <PlusLg className="text-base" />
        </button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1">
        {projectFoldersQuery.isLoading && (
          <div className="text-muted p-4 text-sm">
            Loading project folders...
          </div>
        )}

        {projectFoldersQuery.error && (
          <div className="p-4">
            <div className="mb-2 text-sm text-red-400">
              Failed to load project folders
            </div>
            <button
              onClick={() => projectFoldersQuery.refetch()}
              className="cursor-pointer rounded border border-red-600/40 bg-red-600/20 px-2 py-1 text-xs text-red-400 hover:bg-red-600/30"
            >
              Try Again
            </button>
          </div>
        )}

        {projectFolders.map((folder) => {
          const tree = folderTrees[folder.id];
          return (
            <div key={folder.id} className="mb-1">
              {tree && <EnhancedTreeNode node={tree} level={0} />}
            </div>
          );
        })}
      </div>

      {/* Connection Status */}
      <div className="border-border border-t p-3">
        <div className="text-muted space-y-1 text-xs">
          <div className="flex items-center">
            <div
              className={`mr-2 h-2 w-2 rounded-full ${
                fileWatcherSubscription.status === "pending"
                  ? "bg-green-500"
                  : fileWatcherSubscription.status === "connecting"
                    ? "bg-yellow-500"
                    : fileWatcherSubscription.status === "error"
                      ? "bg-red-500"
                      : "bg-muted"
              }`}
            />
            File watcher: {fileWatcherSubscription.status}
          </div>
          <div className="flex items-center">
            <div
              className={`mr-2 h-2 w-2 rounded-full ${
                taskEventSubscription.status === "pending"
                  ? "bg-green-500"
                  : taskEventSubscription.status === "connecting"
                    ? "bg-yellow-500"
                    : taskEventSubscription.status === "error"
                      ? "bg-red-500"
                      : "bg-muted"
              }`}
            />
            Task events: {taskEventSubscription.status}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="border-border border-t p-3">
        <button className="text-muted hover:text-accent flex w-full items-center justify-center px-3 py-2 text-xs font-medium">
          <Gear className="mr-2 text-sm" />
          Settings
        </button>
      </div>
    </div>
  );
};
