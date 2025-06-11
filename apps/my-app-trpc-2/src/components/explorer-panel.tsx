// apps/my-app-trpc-2/src/components/explorer-panel.tsx
import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";

const getFileIcon = (fileName: string, isDirectory: boolean) => {
  if (isDirectory) {
    if (fileName.startsWith("task-") || fileName.includes("task")) {
      return "📋";
    }
    return "📁";
  }

  if (fileName.endsWith(".chat.json")) {
    return "💬";
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py":
    case "ts":
    case "js":
    case "tsx":
    case "jsx":
      return "📄";
    case "md":
    case "txt":
      return "📝";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return "🖼️";
    default:
      return "📄";
  }
};

const TreeNode: React.FC<{ node: any; level: number }> = ({ node, level }) => {
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
        <span className="mr-2">{icon}</span>
        <span className="text-sm flex-1">{node.name}</span>
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
          {node.children.map((child: any) => (
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

  // Query for project folders
  const projectFoldersQuery = useQuery(
    trpc.projectFolder.getAllProjectFolders.queryOptions()
  );

  // Effect to handle successful project folders fetch
  useEffect(() => {
    if (projectFoldersQuery.data) {
      setProjectFolders(projectFoldersQuery.data);
    }
  }, [projectFoldersQuery.data, setProjectFolders]);

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

  // Subscribe to file watcher events
  useEffect(() => {
    // Note: In a real app, you'd use the proper tRPC subscription pattern
    // For now, we'll just poll for changes or use other update mechanisms
    console.log("File watcher subscription would be set up here");
  }, [projectFolders, updateFolderTree]);

  const handleAddProjectFolder = async () => {
    // In a real app, this would open a file dialog
    const folderPath = prompt("Enter project folder path:");
    if (!folderPath) return;

    addProjectFolderMutation.mutate({
      projectFolderPath: folderPath,
    });
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
              {tree && <TreeNode node={tree} level={0} />}
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
