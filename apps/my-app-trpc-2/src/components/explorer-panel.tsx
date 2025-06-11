// apps/my-app-trpc-2/src/components/explorer-panel.tsx
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";

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

const getFileIcon = (fileName: string, isDirectory: boolean) => {
  if (isDirectory) {
    return null; // No emoji for directories, just use chevron
  }

  if (fileName.endsWith(".chat.json")) {
    return "💬";
  }

  return "📄"; // All other files get document icon
};

const getTaskStatusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "✓";
    case "IN_PROGRESS":
      return "🏃";
    case "CREATED":
    case "INITIALIZED":
    default:
      return "⚠️";
  }
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
    openNewChatModal,
  } = useAppStore();

  const isExpanded = expandedNodes.has(node.path);
  const icon = getFileIcon(node.name, node.isDirectory);
  const isTaskFolder = node.isDirectory && node.name.startsWith("task-");

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

  const handleNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTreeNode(node.path);
    openNewChatModal();
  };

  return (
    <div>
      <div
        className="group flex items-center hover:bg-gray-100 cursor-pointer py-1 px-2"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory && (
          <div className="w-4 h-4 mr-1">
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </div>
        )}

        {icon && <span className="mr-2">{icon}</span>}

        <span className="text-sm flex-1">
          {isTaskFolder && taskInfo ? (
            <>
              {node.name} {getTaskStatusIcon(taskInfo.status)}
            </>
          ) : (
            node.name
          )}
        </span>

        {node.isDirectory && (
          <button
            onClick={handleNewChat}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
            title="New Chat"
          >
            <MessageSquare size={12} />
          </button>
        )}
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.isDirectory && level === 0 && (
            <div
              className="group flex items-center hover:bg-gray-50 cursor-pointer py-1 px-2 text-blue-600"
              style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
              onClick={handleNewChat}
            >
              <MessageSquare size={14} className="mr-2" />
              <span className="text-sm">[+ New Chat]</span>
            </div>
          )}
          {node.children.map((child: FolderTreeNode) => (
            <TreeNode key={child.path} node={child} level={level + 1} />
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
    openNewChatModal,
  } = useAppStore();

  // Track task information by directory path
  const [tasksByPath, setTasksByPath] = useState<Map<string, TaskInfo>>(
    new Map()
  );

  // Query for project folders
  const projectFoldersQuery = useQuery(
    trpc.projectFolder.getAllProjectFolders.queryOptions()
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
        "error"
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
                projectFolderPath: folder.path,
              });
            const treeResult = await queryClient.fetchQuery(treeQueryOptions);
            if (treeResult.folderTree) {
              updateFolderTree(folder.id, treeResult.folderTree);
            }
          } catch (error) {
            console.error(
              `Failed to load folder tree for ${folder.path}:`,
              error
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

  // Subscribe to file watcher events to automatically update folder trees
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
            `File event: ${fileEvent.eventType} - ${fileEvent.absoluteFilePath}`
          );

          // Find which project folder this file belongs to
          const affectedProjectFolder = projectFolders.find((folder) =>
            fileEvent.absoluteFilePath.startsWith(folder.path)
          );

          if (affectedProjectFolder) {
            // For add/delete events, refetch the folder tree to reflect changes
            if (
              fileEvent.eventType === "add" ||
              fileEvent.eventType === "addDir" ||
              fileEvent.eventType === "unlink" ||
              fileEvent.eventType === "unlinkDir"
            ) {
              console.log(
                `Refreshing folder tree for project: ${affectedProjectFolder.name}`
              );

              // Refetch the folder tree for the affected project
              const treeQueryOptions =
                trpc.projectFolder.getFolderTree.queryOptions({
                  projectFolderPath: affectedProjectFolder.path,
                });

              queryClient
                .fetchQuery(treeQueryOptions)
                .then((treeResult) => {
                  if (treeResult.folderTree) {
                    updateFolderTree(
                      affectedProjectFolder.id,
                      treeResult.folderTree
                    );
                  }
                })
                .catch((error) => {
                  console.error(
                    `Failed to refresh folder tree for ${affectedProjectFolder.path}:`,
                    error
                  );
                  showToast(
                    `Failed to refresh folder tree for ${affectedProjectFolder.name}`,
                    "error"
                  );
                });
            }
          }
        },
        onError: (error) => {
          console.error("File watcher subscription error:", error);
          showToast(
            `File watcher error: ${error.message || "Unknown error"}`,
            "error"
          );
        },
        onConnectionStateChange: (state) => {
          console.log(`File watcher connection state: ${state}`);
        },
      }
    )
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
            `Task event: ${taskEvent.updateType} - ${taskEvent.taskId}`
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
                "info"
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
            "error"
          );
        },
        onConnectionStateChange: (state) => {
          console.log(`Task event connection state: ${state}`);
        },
      }
    )
  );

  // Add project folder mutation with proper error handling
  const addProjectFolderMutation = useMutation(
    trpc.projectFolder.addProjectFolder.mutationOptions({
      onSuccess: async (result) => {
        if (result.success && result.projectFolder) {
          const updatedFolders = [...projectFolders, result.projectFolder];
          setProjectFolders(updatedFolders);
          showToast("Project folder added successfully", "success");

          // Load folder tree for new project
          try {
            const treeQueryOptions =
              trpc.projectFolder.getFolderTree.queryOptions({
                projectFolderPath: result.projectFolder.path,
              });
            const treeResult = await queryClient.fetchQuery(treeQueryOptions);
            if (treeResult.folderTree) {
              updateFolderTree(result.projectFolder.id, treeResult.folderTree);
            }
          } catch (error) {
            console.error(
              `Failed to load folder tree for new folder ${result.projectFolder.path}:`,
              error
            );
            showToast(
              `Folder added but failed to load tree for ${result.projectFolder.name}`,
              "error"
            );
          }
        } else if (result.message) {
          showToast(result.message, "info");
        }
      },
      onError: (error) => {
        showToast(`Failed to add project folder: ${error.message}`, "error");
      },
    })
  );

  const handleAddProjectFolder = async () => {
    // In a real app, this would open a file dialog
    const folderPath = prompt("Enter project folder path:");
    if (!folderPath) return;

    addProjectFolderMutation.mutate({
      projectFolderPath: folderPath,
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
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg mb-3">🏠 Project Folders</h2>

        <button
          onClick={openNewChatModal}
          className="w-full mb-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
        >
          + New Chat
        </button>

        <button
          onClick={handleAddProjectFolder}
          disabled={addProjectFolderMutation.isPending}
          className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {addProjectFolderMutation.isPending
            ? "Adding..."
            : "+ Add Project Folder"}
        </button>

        {/* Connection status indicators */}
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex items-center mb-1">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                fileWatcherSubscription.status === "pending"
                  ? "bg-green-500"
                  : fileWatcherSubscription.status === "connecting"
                    ? "bg-yellow-500"
                    : fileWatcherSubscription.status === "error"
                      ? "bg-red-500"
                      : "bg-gray-400"
              }`}
            />
            File watcher: {fileWatcherSubscription.status}
          </div>
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                taskEventSubscription.status === "pending"
                  ? "bg-green-500"
                  : taskEventSubscription.status === "connecting"
                    ? "bg-yellow-500"
                    : taskEventSubscription.status === "error"
                      ? "bg-red-500"
                      : "bg-gray-400"
              }`}
            />
            Task events: {taskEventSubscription.status}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projectFoldersQuery.isLoading && (
          <div className="p-4 text-gray-500">Loading project folders...</div>
        )}

        {projectFoldersQuery.error && (
          <div className="p-4">
            <div className="text-red-500 text-sm mb-2">
              Failed to load project folders
            </div>
            <button
              onClick={() => projectFoldersQuery.refetch()}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        )}

        {projectFolders.map((folder) => {
          const tree = folderTrees[folder.id];
          return (
            <div key={folder.id}>
              {tree && <EnhancedTreeNode node={tree} level={0} />}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-200">
        <button className="text-sm text-gray-600 hover:text-gray-800">
          ⚙️ SETTINGS
        </button>
      </div>
    </div>
  );
};
