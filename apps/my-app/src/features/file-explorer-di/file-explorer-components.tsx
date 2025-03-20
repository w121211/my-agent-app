import { useEffect, useState, JSX } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { ILogObj, Logger } from "tslog";
import { useFileExplorerService } from "./di-provider";
import { useFileExplorerStore } from "./file-explorer-store";
import { FileSystemNode } from "./file-explorer-types";
import { DI_TOKENS } from "./di-tokens";
import { container } from "tsyringe";

const logger = container.resolve<Logger<ILogObj>>(DI_TOKENS.LOGGER);

// Node menu component
interface NodeMenuProps {
  node: FileSystemNode;
  visible: boolean;
  onClose: () => void;
}

const NodeMenu = ({ node, visible, onClose }: NodeMenuProps) => {
  const [newItemName, setNewItemName] = useState<string>("");
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const fileExplorerService = useFileExplorerService();

  useEffect(() => {
    if (!visible) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      setIsRenaming(false);
      setNewItemName("");
    }
  }, [visible]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Prevent immediate closing when first rendered
      if (isCreatingFile || isCreatingFolder || isRenaming) {
        return;
      }
      onClose();
    };

    // Delay adding the event listener to avoid immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [onClose, isCreatingFile, isCreatingFolder, isRenaming]);

  const handleCreateFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug("Creating new file");
    setIsCreatingFile(true);
    setIsCreatingFolder(false);
    setIsRenaming(false);
    setNewItemName("newFile.txt"); // Default name suggestion
  };

  const handleCreateFolder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug("Creating new folder");
    setIsCreatingFile(false);
    setIsCreatingFolder(true);
    setIsRenaming(false);
    setNewItemName("New Folder"); // Default name suggestion
  };

  const handleRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug("Renaming item");
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setIsRenaming(true);
    if (node) {
      setNewItemName(node.name);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node) {
      logger.debug(`Deleting ${node.type}: ${node.name}`);
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
        logger.debug(`Submitting create file: ${newItemName}`);
        const parentPath =
          node && node.type === "directory"
            ? node.path
            : node?.parentPath || null;
        fileExplorerService.createFile(parentPath, newItemName);
      } else if (isCreatingFolder) {
        logger.debug(`Submitting create folder: ${newItemName}`);
        const parentPath =
          node && node.type === "directory"
            ? node.path
            : node?.parentPath || null;
        fileExplorerService.createDirectory(parentPath, newItemName);
      } else if (isRenaming && node) {
        logger.debug(`Submitting rename from ${node.name} to ${newItemName}`);
        if (node.type === "directory") {
          fileExplorerService.renameDirectory(node.id, node.name, newItemName);
        } else {
          fileExplorerService.renameFile(node.id, node.name, newItemName);
        }
      }
    }

    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setIsRenaming(false);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="absolute bg-white border shadow-lg rounded-md z-10 w-56 right-2 mt-1"
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
                setIsRenaming(false);
                onClose();
              }}
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
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
            onClick={handleCreateFile}
          >
            <FileText className="w-4 h-4 mr-2" />
            New File
          </li>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
            onClick={handleCreateFolder}
          >
            <Folder className="w-4 h-4 mr-2" />
            New Folder
          </li>
          <li className="border-t my-1"></li>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
            onClick={handleRename}
          >
            <Edit className="w-4 h-4 mr-2" />
            Rename
          </li>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600 flex items-center"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </li>
        </ul>
      )}
    </div>
  );
};

// Node item component
interface FileExplorerNodeProps {
  nodeId: string;
  level: number;
}

const FileExplorerNode = ({ nodeId, level }: FileExplorerNodeProps) => {
  const node = useFileExplorerStore((state) => state.nodes[nodeId]);
  const selectedNodeId = useFileExplorerStore((state) => state.selectedNodeId);
  const expandedDirectories = useFileExplorerStore(
    (state) => state.expandedDirectories
  );
  const getChildNodes = useFileExplorerStore((state) => state.getChildNodes);
  const fileExplorerService = useFileExplorerService();

  const [isHovered, setIsHovered] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuVisible(!menuVisible);
  };

  const handleAddItemToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuVisible(!menuVisible);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const paddingLeft = level * 12; // Indent based on level

  return (
    <>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-200 relative ${
          isSelected ? "bg-blue-100" : ""
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {node.type === "directory" && (
          <span onClick={handleToggle} className="cursor-pointer mr-1">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}

        <span className="flex items-center flex-grow">
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

        {/* Node action buttons that appear on hover */}
        <div
          className={`flex items-center ${isHovered || menuVisible ? "opacity-100" : "opacity-0"}`}
        >
          {node.type === "directory" && (
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-300 rounded-md"
              onClick={handleAddItemToggle}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-300 rounded-md ml-1"
            onClick={handleMenuToggle}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {menuVisible && (
          <div className="relative">
            <NodeMenu node={node} visible={menuVisible} onClose={closeMenu} />
          </div>
        )}
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
  autoExpandDirectories = ["root1"],
}: FileExplorerProps): JSX.Element => {
  const rootNodeIds = useFileExplorerStore((state) => state.rootNodeIds);
  const loading = useFileExplorerStore((state) => state.loading);
  const error = useFileExplorerStore((state) => state.error);
  const fileExplorerService = useFileExplorerService();

  // Initialize file explorer with data
  useEffect(() => {
    // Only load if we don't already have data
    if (rootNodeIds.length === 0 && !loading) {
      logger.debug("Loading initial file tree data");
      fileExplorerService.loadFileTree(initialData);
    }
  }, [fileExplorerService, initialData, rootNodeIds.length, loading]);

  // Auto-expand directories after data is loaded
  useEffect(() => {
    if (rootNodeIds.length > 0 && autoExpandDirectories.length > 0) {
      logger.debug("Auto-expanding directories:", autoExpandDirectories);
      autoExpandDirectories.forEach((dirId) => {
        fileExplorerService.expandDirectory(dirId);
      });
    }
  }, [fileExplorerService, autoExpandDirectories, rootNodeIds.length]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className={`h-full overflow-auto bg-gray-50 border-r ${className}`}>
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
    </div>
  );
};

export default FileExplorer;
