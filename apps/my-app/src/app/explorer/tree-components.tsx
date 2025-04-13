import React from "react";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { ILogObj, Logger } from "tslog";
import {
  useWorkspaceTreeStore,
  TreeNode,
  FolderTreeNode,
  FileTreeNode,
  isFolderNode,
} from "../../features/workspace-tree/workspace-tree-store";

const logger = new Logger<ILogObj>({ name: "tree-components" });

export const FileNodeComponent = ({
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

export const FolderNodeComponent = ({
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

export const TreeNodeComponent = ({
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
