import { type JSX, useEffect, useState } from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import { ILogObj, Logger } from "tslog";
import { useFileExplorerService } from "./file-explorer-service-store";
import { useFileExplorerStore } from "./file-explorer-store";
import { FileSystemNode } from "./file-explorer-types";

const logger = new Logger<ILogObj>({ name: "FileExplorer" });

// Node item component
interface FileExplorerNodeProps {
  nodeId: string;
  level: number;
}

const FileExplorerNode = ({
  nodeId,
  level,
}: FileExplorerNodeProps) => {
  const node = useFileExplorerStore((state) => state.nodes[nodeId]);
  const selectedNodeId = useFileExplorerStore((state) => state.selectedNodeId);
  const expandedDirectories = useFileExplorerStore(
    (state) => state.expandedDirectories
  );
  const getChildNodes = useFileExplorerStore((state) => state.getChildNodes);

  const fileExplorerService = useFileExplorerService();

  if (!node) {
    return null;
  }

  const isSelected = selectedNodeId === nodeId;
  const isExpanded =
    node.type === "directory" && expandedDirectories.has(nodeId);
  const childNodes = isExpanded ? getChildNodes(nodeId) : [];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileExplorerService.selectNode(nodeId);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === "directory") {
      fileExplorerService.toggleDirectoryExpansion(nodeId);
    }
  };

  const paddingLeft = level * 12; // Indent based on level

  return (
    <>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-200 ${
          isSelected ? "bg-blue-100" : ""
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
      >
        {node.type === "directory" && (
          <span onClick={handleToggle} className="cursor-pointer mr-1">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}

        <span className="flex items-center">
          {node.type === "directory" ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-1" />
            ) : (
              <Folder className="w-4 h-4 mr-1" />
            )
          ) : (
            <FileText className="w-4 h-4 mr-1" />
          )}
          <span className="truncate">{node.name}</span>
        </span>
      </div>

      {isExpanded &&
        childNodes.map((childNode) => (
          <FileExplorerNode
            key={childNode.id}
            nodeId={childNode.id}
            level={level + 1}
          />
        ))}
    </>
  );
};

// Context menu component
interface ContextMenuProps {
  x: number;
  y: number;
  node: FileSystemNode | null;
  onClose: () => void;
}

const ContextMenu = ({ x, y, node, onClose }: ContextMenuProps) => {
  const [newItemName, setNewItemName] = useState<string>("");
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const fileExplorerService = useFileExplorerService();

  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  const handleCreateFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingFile(true);
    setIsCreatingFolder(false);
    setIsRenaming(false);
  };

  const handleCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingFile(false);
    setIsCreatingFolder(true);
    setIsRenaming(false);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setIsRenaming(true);
    if (node) {
      setNewItemName(node.name);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node) {
      if (node.type === "directory") {
        fileExplorerService.deleteDirectory(node.id, node.path);
      } else {
        fileExplorerService.deleteFile(node.id, node.path);
      }
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (newItemName) {
      if (isCreatingFile) {
        const parentPath =
          node && node.type === "directory"
            ? node.path
            : node?.parentPath || null;
        fileExplorerService.createFile(parentPath, newItemName);
      } else if (isCreatingFolder) {
        const parentPath =
          node && node.type === "directory"
            ? node.path
            : node?.parentPath || null;
        fileExplorerService.createDirectory(parentPath, newItemName);
      } else if (isRenaming && node) {
        if (node.type === "directory") {
          fileExplorerService.renameDirectory(node.id, node.name, newItemName);
        } else {
          fileExplorerService.renameFile(node.id, node.name, newItemName);
        }
      }
    }

    onClose();
  };

  return (
    <div
      className="absolute bg-white border shadow-lg rounded-md z-10 w-56"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {isCreatingFile || isCreatingFolder || isRenaming ? (
        <form onSubmit={handleSubmit} className="p-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={
              isCreatingFile
                ? "File name"
                : isCreatingFolder
                  ? "Folder name"
                  : "New name"
            }
            className="w-full px-2 py-1 border rounded"
            autoFocus
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {isCreatingFile
                ? "Create"
                : isCreatingFolder
                  ? "Create"
                  : "Rename"}
            </button>
          </div>
        </form>
      ) : (
        <ul className="py-1">
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={handleCreateFile}
          >
            New File
          </li>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={handleCreateFolder}
          >
            New Folder
          </li>
          {node && (
            <>
              <li className="border-t my-1"></li>
              <li
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={handleRename}
              >
                Rename
              </li>
              <li
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600"
                onClick={handleDelete}
              >
                Delete
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
};

// Sample file structure for testing
const defaultFileTree: FileSystemNode[] = [
  {
    id: "root1",
    name: "src",
    type: "directory",
    path: "/src",
    parentPath: null,
    children: ["file1", "file2", "dir1"],
    metadata: {
      created: new Date(),
      modified: new Date(),
    },
  },
  {
    id: "file1",
    name: "index.ts",
    type: "file",
    path: "/src/index.ts",
    parentPath: "/src",
    metadata: {
      created: new Date(),
      modified: new Date(),
      size: 1024,
    },
  },
  {
    id: "file2",
    name: "app.ts",
    type: "file",
    path: "/src/app.ts",
    parentPath: "/src",
    metadata: {
      created: new Date(),
      modified: new Date(),
      size: 2048,
    },
  },
  {
    id: "dir1",
    name: "components",
    type: "directory",
    path: "/src/components",
    parentPath: "/src",
    children: ["file3", "file4"],
    metadata: {
      created: new Date(),
      modified: new Date(),
    },
  },
  {
    id: "file3",
    name: "Button.tsx",
    type: "file",
    path: "/src/components/Button.tsx",
    parentPath: "/src/components",
    metadata: {
      created: new Date(),
      modified: new Date(),
      size: 3072,
    },
  },
  {
    id: "file4",
    name: "Card.tsx",
    type: "file",
    path: "/src/components/Card.tsx",
    parentPath: "/src/components",
    metadata: {
      created: new Date(),
      modified: new Date(),
      size: 4096,
    },
  },
  {
    id: "root2",
    name: "public",
    type: "directory",
    path: "/public",
    parentPath: null,
    children: ["file5"],
    metadata: {
      created: new Date(),
      modified: new Date(),
    },
  },
  {
    id: "file5",
    name: "index.html",
    type: "file",
    path: "/public/index.html",
    parentPath: "/public",
    metadata: {
      created: new Date(),
      modified: new Date(),
      size: 512,
    },
  },
];

// Main file explorer component
interface FileExplorerProps {
  className?: string;
  initialData?: FileSystemNode[];
  autoExpandDirectories?: string[];
}

const FileExplorer = ({
  className = "",
  initialData = defaultFileTree,
  autoExpandDirectories = ["root1", "dir1"],
}: FileExplorerProps): JSX.Element => {
  const rootNodeIds = useFileExplorerStore((state) => state.rootNodeIds);
  const loading = useFileExplorerStore((state) => state.loading);
  const error = useFileExplorerStore((state) => state.error);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: FileSystemNode | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });
  const fileExplorerService = useFileExplorerService();

  useEffect(() => {
    // Load initial data
    fileExplorerService.loadFileTree(initialData);
    logger.debug("Initialized file explorer with provided data");

    // Auto-expand specified directories
    if (autoExpandDirectories.length > 0) {
      setTimeout(() => {
        autoExpandDirectories.forEach((dirId) => {
          fileExplorerService.expandDirectory(dirId);
        });
      }, 100);
    }
  }, [fileExplorerService, initialData, autoExpandDirectories]);

  const handleContextMenu = (
    e: React.MouseEvent,
    node: FileSystemNode | null = null
  ) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div
      className={`h-full overflow-auto bg-gray-50 border-r ${className}`}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      <div className="p-2 bg-gray-100 border-b font-medium">Explorer</div>

      <div className="file-tree">
        {rootNodeIds.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No files or folders
          </div>
        ) : (
          rootNodeIds.map((nodeId) => (
            <FileExplorerNode key={nodeId} nodeId={nodeId} level={0} />
          ))
        )}
      </div>

      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default FileExplorer;