import React, { memo } from 'react';
import { FileTreeNode } from '@/app/event/explorer-store';

interface FileTreeItemProps {
  node: FileTreeNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

// 單個檔案/資料夾項目組件
const FileTreeItem = memo(({ 
  node, 
  isExpanded, 
  isSelected, 
  onToggle, 
  onSelect 
}: FileTreeItemProps) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'directory') {
      onToggle(node.path);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleSelect}
        className={`flex items-center p-1 cursor-pointer ${
          isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
        }`}
      >
        <span 
          onClick={handleToggle}
          className="mr-2 w-4 text-center"
        >
          {node.type === 'directory' && (
            isExpanded ? '▼' : '▶'
          )}
        </span>
        <span>{node.name}</span>
      </div>
      
      {/* 子項目只在展開時渲染 */}
      {node.type === 'directory' && isExpanded && node.children && (
        <div className="ml-4">
          {node.children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              isExpanded={isExpanded}
              isSelected={isSelected}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// 主檔案樹組件
export const FileTree = memo(({ 
  tree, 
  expandedPaths, 
  selectedPath,
  onToggle,
  onSelect
}: {
  tree: FileTreeNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) => {
  return (
    <div className="p-2">
      {tree.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          isExpanded={expandedPaths.has(node.path)}
          isSelected={selectedPath === node.path}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

FileTree.displayName = 'FileTree';
FileTreeItem.displayName = 'FileTreeItem';