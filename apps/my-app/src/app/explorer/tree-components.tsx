import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { Logger } from "tslog";
import {
  useWorkspaceTreeStore,
  TreeNode,
  FolderTreeNode,
  FileTreeNode,
  isFolderNode,
} from "../../features/workspace-tree/workspace-tree-store";
import { useWorkspaceTreeService } from "../../lib/di/di-provider";

const logger = new Logger({ name: "tree-components" });

interface FileNodeProps {
  node: FileTreeNode;
  level: number;
}

export const FileNodeComponent = ({ node, level }: FileNodeProps) => {
  const { selectedNode } = useWorkspaceTreeStore();
  const workspaceTreeService = useWorkspaceTreeService();
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    if (workspaceTreeService) {
      workspaceTreeService.handleNodeClick(node.path);
    } else {
      logger.warn("WorkspaceTreeService not available");
    }
  };

  const isSelected = selectedNode?.path === node.path;

  // Determine if this is a chat file based on extension
  const isChatFile = node.name.endsWith(".json");

  return (
    <div
      onClick={handleClick}
      className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 ${
        isSelected ? "bg-blue-100" : ""
      }`}
      style={{ paddingLeft }}
    >
      {isChatFile ? (
        <span className="mr-1">💬</span>
      ) : (
        <FileText className="w-4 h-4 mr-1" />
      )}
      <span className="flex-grow truncate">{node.name}</span>
    </div>
  );
};

interface FolderNodeProps {
  node: FolderTreeNode;
  level?: number;
}

export const FolderNodeComponent = ({ node, level = 0 }: FolderNodeProps) => {
  const workspaceTreeService = useWorkspaceTreeService();
  const { expandedFolders } = useWorkspaceTreeStore();
  const paddingLeft = `${level * 16}px`;

  // Check if this is a task folder (starts with t + digits)
  const isTaskFolder = node.name.match(/^t\d+/);

  const expanded = expandedFolders.has(node.path);

  const handleToggle = () => {
    if (workspaceTreeService) {
      workspaceTreeService.handleNodeClick(node.path);
    } else {
      logger.warn("WorkspaceTreeService not available");
    }
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

        {isTaskFolder ? (
          <span className="mr-1">📋</span>
        ) : (
          <Folder className="w-4 h-4 mr-1" />
        )}

        <span className="flex-grow truncate">{node.name}</span>

        {isTaskFolder && <span className="ml-1 text-xs text-gray-500">🏃</span>}
      </div>

      {expanded && (
        <div>
          {node.children.length > 0 ? (
            node.children.map((child) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                level={level + 1}
              />
            ))
          ) : (
            <div
              className="text-gray-400 px-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
            >
              (Empty folder)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface TreeNodeProps {
  node: TreeNode;
  level?: number;
}

export const TreeNodeComponent = ({ node, level = 0 }: TreeNodeProps) => {
  if (isFolderNode(node)) {
    return <FolderNodeComponent node={node} level={level} />;
  }
  return <FileNodeComponent node={node} level={level} />;
};
