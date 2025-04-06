"use client";

import React, { useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  RefreshCw,
} from "lucide-react";
import { ILogObj, Logger } from "tslog";
import {
  useWorkspaceTreeStore,
  TreeNode,
  FolderTreeNode,
  FileTreeNode,
  isFolderNode,
} from "../../features/editor/workspace-tree-store";
// import { WorkspaceTreeService } from "../../features/editor/workspace-tree-service";
import { DIProvider } from "../../lib/di/di-provider";
// import { container } from "../../lib/di/di-container";
// import { DI_TOKENS } from "../../lib/di/di-tokens";

// Setup logger
const logger = new Logger<ILogObj>({ name: "workspace-explorer" });

// Common Components
const ActionButton = ({
  icon: Icon,
  onClick,
  label,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  label?: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`p-1 hover:bg-gray-100 rounded-md flex items-center ${className}`}
    title={label}
  >
    <Icon className="w-4 h-4" />
    {label && <span className="ml-1 text-sm">{label}</span>}
  </button>
);

// Tree Node Components
const FileNodeComponent = ({
  node,
  level,
}: {
  node: FileTreeNode;
  level: number;
}) => {
  const { selectedNode, setSelectedNode } = useWorkspaceTreeStore();
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    setSelectedNode(node);
    logger.debug(`Selected file: ${node.path}`);
  };

  const isSelected = selectedNode?.id === node.id;

  return (
    <div
      onClick={handleClick}
      className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 ${
        isSelected ? "bg-blue-100" : ""
      }`}
      style={{ paddingLeft }}
    >
      <FileText className="w-4 h-4 mr-1" />
      <span className="flex-grow truncate">{node.name}</span>
      {node.lastModified && (
        <span className="text-xs text-gray-500">
          {node.lastModified.toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

const FolderNodeComponent = ({
  node,
  level = 0,
}: {
  node: FolderTreeNode;
  level?: number;
}) => {
  const { isExpanded, toggleFolderExpansion } = useWorkspaceTreeStore();
  const expanded = isExpanded(node.path);
  const paddingLeft = `${level * 16}px`;

  const handleToggle = () => {
    toggleFolderExpansion(node.path);
    logger.debug(`Toggled folder: ${node.path}, expanded: ${!expanded}`);
  };

  return (
    <div>
      <div
        onClick={handleToggle}
        className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100"
        style={{ paddingLeft }}
      >
        <span className="mr-1">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <Folder className="w-4 h-4 mr-1" />
        <span className="flex-grow truncate">{node.name}</span>
      </div>

      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}

      {expanded && node.children.length === 0 && (
        <div
          className="text-gray-400 px-2 py-1"
          style={{ paddingLeft: `${(level + 1) * 16}px` }}
        >
          (Empty folder)
        </div>
      )}
    </div>
  );
};

const TreeNodeComponent = ({
  node,
  level = 0,
}: {
  node: TreeNode;
  level?: number;
}) => {
  if (isFolderNode(node)) {
    return <FolderNodeComponent node={node} level={level} />;
  }
  return <FileNodeComponent node={node} level={level} />;
};

// Explorer Header
const ExplorerHeader = () => {
  // const workspaceTreeService = container.resolve<WorkspaceTreeService>(
  //   DI_TOKENS.WORKSPACE_TREE_SERVICE
  // );

  const handleRefresh = () => {
    logger.info("Manually refreshing workspace tree");
    // This would typically trigger a refresh of the workspace tree
    // For MVP, we'll just log this action
  };

  const handleNewFolder = () => {
    logger.info("Create new folder action triggered");
    // This would typically open a dialog to create a new folder
    // For MVP, we'll just log this action
  };

  return (
    <div className="p-2 flex items-center justify-between border-b">
      <div className="text-lg font-medium">Workspace Explorer</div>
      <div className="flex gap-1">
        <ActionButton
          icon={RefreshCw}
          onClick={handleRefresh}
          label="Refresh"
        />
        <ActionButton
          icon={Plus}
          onClick={handleNewFolder}
          label="New Folder"
          className="text-green-600"
        />
      </div>
    </div>
  );
};

// Explorer Panel
const WorkspaceTreeViewer = () => {
  const { root } = useWorkspaceTreeStore();

  if (!root) {
    return (
      <div className="p-4 text-gray-400 flex items-center justify-center h-full">
        No workspace files found.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <TreeNodeComponent node={root} />
    </div>
  );
};

// File Preview Panel
const FilePreviewPanel = () => {
  const { selectedNode } = useWorkspaceTreeStore();

  if (!selectedNode || isFolderNode(selectedNode)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to view its content
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="mb-4 border-b pb-2">
        <h2 className="text-lg font-medium">{selectedNode.name}</h2>
        <div className="text-sm text-gray-500">{selectedNode.path}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded border">
        <pre className="whitespace-pre-wrap">
          {/* In a real app, we would load and display the file content here */}
          {`File content would be displayed here for: ${selectedNode.path}`}
        </pre>
      </div>
    </div>
  );
};

// Main Page Component
const WorkspaceExplorerPage = () => {
  const { setRoot } = useWorkspaceTreeStore();

  // Simulate initialization with a sample tree structure
  useEffect(() => {
    // In a real application, this would come from the WorkspaceTreeService
    const sampleRoot: FolderTreeNode = {
      id: "root",
      name: "workspace",
      type: "folder",
      path: "/",
      children: [
        {
          id: "folder-1",
          name: "src",
          type: "folder",
          path: "/src",
          children: [
            {
              id: "folder-2",
              name: "components",
              type: "folder",
              path: "/src/components",
              children: [
                {
                  id: "file-1",
                  name: "Button.tsx",
                  type: "file",
                  path: "/src/components/Button.tsx",
                  lastModified: new Date(),
                },
                {
                  id: "file-2",
                  name: "Card.tsx",
                  type: "file",
                  path: "/src/components/Card.tsx",
                  lastModified: new Date(),
                },
              ],
            },
            {
              id: "file-3",
              name: "App.tsx",
              type: "file",
              path: "/src/App.tsx",
              lastModified: new Date(),
            },
          ],
        },
        {
          id: "file-4",
          name: "package.json",
          type: "file",
          path: "/package.json",
          lastModified: new Date(),
        },
        {
          id: "file-5",
          name: "tsconfig.json",
          type: "file",
          path: "/tsconfig.json",
          lastModified: new Date(),
        },
      ],
    };

    setRoot(sampleRoot);
    logger.info("Workspace explorer initialized with sample data");
  }, [setRoot]);

  return (
    <DIProvider
      // Optional WebSocket config
      websocketConfig={{
        hostname: "localhost",
        port: 8000,
        protocol: "ws:",
      }}
      logger={logger}
    >
      <div className="flex h-screen bg-gray-50">
        <div className="w-72 bg-white border-r flex flex-col h-full">
          <ExplorerHeader />
          <div className="flex-grow overflow-hidden">
            <WorkspaceTreeViewer />
          </div>
        </div>
        <div className="flex-grow flex flex-col bg-white">
          <FilePreviewPanel />
        </div>
      </div>
    </DIProvider>
  );
};

export default WorkspaceExplorerPage;
