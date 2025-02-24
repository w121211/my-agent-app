import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { FileTreeNode, useFileExplorerStore } from "@/lib/file-explorer-store";

// FileExplorerItem Component - 處理單個檔案或資料夾項目
const FileExplorerItem = ({
  node,
  level,
}: {
  node: FileTreeNode;
  // 檔案層級深度 (0=根層級)
  level: number;
}) => {
  const { expandedPaths, selectedPath, toggleDirectory, selectItem } =
    useFileExplorerStore();

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    if (node.type === "directory") {
      toggleDirectory(node.path);
    }
    selectItem(node.path);
  };

  const icon =
    node.type === "directory" ? (
      isExpanded ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )
    ) : (
      <FileText className="w-4 h-4" />
    );

  return (
    <div>
      <div
        onClick={handleClick}
        className={`
          flex items-center px-2 py-1 cursor-pointer 
          hover:bg-gray-100 
          ${isSelected ? "bg-blue-100" : ""}
        `}
        style={{ paddingLeft }}
      >
        <span className="mr-1">{icon}</span>
        <span>{node.name}</span>
      </div>

      {/* 如果是展開的目錄，則遞迴渲染子項目 */}
      {isExpanded && node.type === "directory" && node.children && (
        <div>
          {node.children.map((child) => (
            <FileExplorerItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// FileExplorer Component - 主要的檔案瀏覽器組件
const FileExplorer = () => {
  const { fileTree } = useFileExplorerStore();

  return (
    <div className="w-72 border-r overflow-y-auto">
      <div className="p-2 font-bold border-b flex items-center gap-2">
        <Folder className="w-4 h-4" />
        <span>EXPLORER</span>
      </div>
      <div>
        {fileTree.map((node) => (
          <FileExplorerItem key={node.id} node={node} level={0} />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
