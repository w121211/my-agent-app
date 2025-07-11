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
interface FolderTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
}

interface TaskInfo {
  id: string;
  status: "CREATED" | "INITIALIZED" | "IN_PROGRESS" | "COMPLETED";
  title: string;
  absoluteDirectoryPath: string;
}

// Unified sorting function for tree nodes
const sortTreeNodes = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
  return nodes.sort((a, b) => {
    // Directories first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    // Same type sorted by name
    return a.name.localeCompare(b.name);
  });
};

// Recursively sort entire tree
const sortTreeRecursively = (node: FolderTreeNode): FolderTreeNode => {
  if (node.children) {
    const sortedChildren = sortTreeNodes(
      node.children.map(sortTreeRecursively),
    );
    return { ...node, children: sortedChildren };
  }
  return node;
};

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

// Updated function to use unified sorting
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
          // Use unified sorting function
          node.children = sortTreeNodes(node.children);
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

const TreeNode: React.FC<{
  node: FolderTreeNode;
  level: number;
  taskInfo?: TaskInfo;
  projectFolders: Array<{ id: string; name: string; path: string }>;
  folderTrees: Record<string, FolderTreeNode>;
  updateFolderTree: (id: string, tree: FolderTreeNode) => void;
}> = ({
  node,
  level,
  taskInfo,
  projectFolders,
  folderTrees,
  updateFolderTree,
}) => {
  const {
    expandedNodes,
    toggleNodeExpansion,
    setSelectedChatFile,
    setSelectedPreviewFile,
    setSelectedTreeNode,
    selectedTreeNode,
  } = useAppStore();

  const trpc = useTRPC();
  const { showToast } = useToast();

  const isExpanded = expandedNodes.has(node.path);
  const isSelected = selectedTreeNode === node.path;
  const isTaskFolder = node.isDirectory && node.name.startsWith("task-");

  // Create empty chat mutation with enhanced optimistic updates
  const createEmptyChatMutation = useMutation(
    trpc.chat.createEmptyChat.mutationOptions({
      onSuccess: (newChat) => {
        console.log("🎯 Chat created successfully:", newChat.absoluteFilePath);

        // 1. Find the affected project folder
        const affectedProjectFolder = projectFolders.find((folder) =>
          newChat.absoluteFilePath.startsWith(folder.path),
        );

        if (!affectedProjectFolder) {
          console.error(
            "❌ No affected project folder found for:",
            newChat.absoluteFilePath,
          );
          setSelectedTreeNode(newChat.absoluteFilePath);
          setSelectedChatFile(newChat.absoluteFilePath);
          showToast("Chat created successfully", "success");
          return;
        }

        console.log("📁 Affected project folder:", affectedProjectFolder.name);

        // 2. Get current tree
        const currentTree = folderTrees[affectedProjectFolder.id];
        if (!currentTree) {
          console.error(
            "❌ No current tree found for folder:",
            affectedProjectFolder.id,
          );
          setSelectedTreeNode(newChat.absoluteFilePath);
          setSelectedChatFile(newChat.absoluteFilePath);
          showToast("Chat created successfully", "success");
          return;
        }

        console.log("🌳 Current tree found, applying optimistic update...");

        // 3. Optimistically update folder tree
        const fileEvent = {
          eventType: "add" as const,
          absoluteFilePath: newChat.absoluteFilePath,
          isDirectory: false,
        };

        try {
          const updatedTree = updateTreeNodeDirectly(currentTree, fileEvent);
          console.log("✅ Tree updated optimistically");

          // Immediately update the store
          updateFolderTree(affectedProjectFolder.id, updatedTree);
          console.log("✅ Store updated");

          // 4. Set selection state (now that the node exists in tree)
          setSelectedTreeNode(newChat.absoluteFilePath);
          setSelectedChatFile(newChat.absoluteFilePath);
          console.log("✅ Selection state set to new chat file");

          showToast("Chat created successfully", "success");
        } catch (error) {
          console.error(
            "❌ Failed to optimistically update folder tree:",
            error,
          );
          // Still set selection even if optimistic update fails
          setSelectedTreeNode(newChat.absoluteFilePath);
          setSelectedChatFile(newChat.absoluteFilePath);
          showToast("Chat created successfully", "success");
        }
      },
      onError: (error) => {
        console.error("❌ Failed to create chat:", error);
        showToast(
          `Failed to create chat: ${error.message || "Unknown error"}`,
          "error",
        );
      },
    }),
  );

  const handleClick = () => {
    if (node.isDirectory) {
      toggleNodeExpansion(node.path);
    } else {
      setSelectedTreeNode(node.path);
      if (node.name.endsWith(".chat.json")) {
        setSelectedChatFile(node.path);
      } else {
        setSelectedPreviewFile(node.path);
      }
    }
  };

  const handleNewChat = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    console.log("🚀 Creating new chat in directory:", node.path);
    createEmptyChatMutation.mutate({
      targetDirectoryAbsolutePath: node.path,
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

        <span className="flex-1 truncate text-sm">{node.name}</span>

        {/* Context indicator for files in project context */}
        {/* {!node.isDirectory && Math.random() > 0.7 && (
          <div className="mr-1" title="In Project Context">
            <FileEarmarkCheck className="text-accent text-xs" />
          </div>
        )} */}

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
              disabled={createEmptyChatMutation.isPending}
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
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              projectFolders={projectFolders}
              folderTrees={folderTrees}
              updateFolderTree={updateFolderTree}
            />
          ))}
        </div>
      )}
    </div>
  );
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
    setSelectedChatFile,
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

  // Effect to load folder trees when project folders change - with protection against overwrites
  useEffect(() => {
    const loadFolderTrees = async () => {
      if (projectFoldersQuery.data) {
        for (const folder of projectFoldersQuery.data) {
          // Skip if we already have a tree for this folder (avoid overwriting optimistic updates)
          if (folderTrees[folder.id]) {
            console.log(
              `⏭️ Skipping initial load for ${folder.name} - tree already exists`,
            );
            continue;
          }

          try {
            const treeQueryOptions =
              trpc.projectFolder.getFolderTree.queryOptions({
                absoluteProjectFolderPath: folder.path,
              });
            const treeResult = await queryClient.fetchQuery(treeQueryOptions);
            // Apply unified sorting to initial data
            const sortedTree = sortTreeRecursively(treeResult);
            updateFolderTree(folder.id, sortedTree);
            console.log(`✅ Loaded initial tree for ${folder.name}`);
          } catch (error) {
            console.error(
              `❌ Failed to load folder tree for ${folder.path}:`,
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
    folderTrees,
  ]);

  // Subscribe to file watcher events with enhanced handling
  const fileWatcherSubscription = useSubscription(
    trpc.event.fileWatcherEvents.subscriptionOptions(
      { lastEventId: null },
      {
        enabled: projectFolders.length > 0,
        onStarted: () => {
          console.log("📡 File watcher subscription started");
        },
        onData: (event) => {
          const fileEvent = event.data;
          console.log(
            `📁 File event: ${fileEvent.eventType} - ${fileEvent.absoluteFilePath}`,
          );

          // Find which project folder this file belongs to
          const affectedProjectFolder = projectFolders.find((folder) =>
            fileEvent.absoluteFilePath.startsWith(folder.path),
          );

          if (!affectedProjectFolder) {
            console.log("⏭️ File event not for any tracked project folder");
            return;
          }

          // For add/delete events, directly update the folder tree
          if (
            fileEvent.eventType === "add" ||
            fileEvent.eventType === "addDir" ||
            fileEvent.eventType === "unlink" ||
            fileEvent.eventType === "unlinkDir"
          ) {
            console.log(
              `🔄 Processing file event for project: ${affectedProjectFolder.name}`,
            );

            const currentTree = folderTrees[affectedProjectFolder.id];
            if (currentTree) {
              try {
                const updatedTree = updateTreeNodeDirectly(
                  currentTree,
                  fileEvent,
                );
                updateFolderTree(affectedProjectFolder.id, updatedTree);
                console.log(`✅ Successfully updated tree via file event`);
              } catch (error) {
                console.error(
                  `❌ Failed to directly update folder tree for ${affectedProjectFolder.path}:`,
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
                    // Apply unified sorting to refetched data
                    const sortedTree = sortTreeRecursively(treeResult);
                    updateFolderTree(affectedProjectFolder.id, sortedTree);
                    console.log(`✅ Fallback refetch successful`);
                  })
                  .catch((refetchError) => {
                    console.error(
                      `❌ Fallback refetch also failed for ${affectedProjectFolder.path}:`,
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
        },
        onError: (error) => {
          console.error("❌ File watcher subscription error:", error);
          showToast(
            `File watcher error: ${error.message || "Unknown error"}`,
            "error",
          );
        },
        onConnectionStateChange: (state) => {
          console.log(`📡 File watcher connection state: ${state}`);
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
          console.log("📋 Task event subscription started");
        },
        onData: (event) => {
          const taskEvent = event.data;
          console.log(
            `📋 Task event: ${taskEvent.updateType} - ${taskEvent.taskId}`,
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
          console.error("❌ Task event subscription error:", error);
          showToast(
            `Task event error: ${error.message || "Unknown error"}`,
            "error",
          );
        },
        onConnectionStateChange: (state) => {
          console.log(`📋 Task event connection state: ${state}`);
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

        // Load folder tree for new project with unified sorting
        try {
          const treeQueryOptions =
            trpc.projectFolder.getFolderTree.queryOptions({
              absoluteProjectFolderPath: projectFolder.path,
            });
          const treeResult = await queryClient.fetchQuery(treeQueryOptions);
          // Apply unified sorting to initial data
          const sortedTree = sortTreeRecursively(treeResult);
          updateFolderTree(projectFolder.id, sortedTree);
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

  // Enhanced TreeNode with task info and optimistic update support
  const EnhancedTreeNode: React.FC<{ node: FolderTreeNode; level: number }> = ({
    node,
    level,
  }) => {
    const taskInfo = tasksByPath.get(node.path);
    return (
      <TreeNode
        node={node}
        level={level}
        taskInfo={taskInfo}
        projectFolders={projectFolders}
        folderTrees={folderTrees}
        updateFolderTree={updateFolderTree}
      />
    );
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

      {/* Enhanced Connection Status */}
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
