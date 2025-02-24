"use client";

import React from "react";
import { eventBus } from "@/lib/event-bus";
import { FileTreeNode } from "@/lib/file-explorer-store";
import { FileSystemChangeEvent } from "@/lib/file-explorer-events";
import FileExplorer from "@/app//explorer/file-explorer";
import FileExplorerEventHandlersProvider from "@/app//explorer/file-explorer-event-handlers-provider";

const TestPanel = () => {
  // 模擬新增檔案
  const handleCreateFile = () => {
    const newTree: FileTreeNode[] = [
      {
        id: "1",
        name: "src",
        type: "directory",
        path: "/src",
        children: [
          {
            id: "2",
            name: "components",
            type: "directory",
            path: "/src/components",
            children: [
              {
                id: "3",
                name: "Button.tsx",
                type: "file",
                path: "/src/components/Button.tsx",
              },
              {
                id: "4",
                name: "Input.tsx",
                type: "file",
                path: "/src/components/Input.tsx",
              },
              {
                id: "13", // 新增的檔案
                name: "NewFile.tsx",
                type: "file",
                path: "/src/components/NewFile.tsx",
              },
            ],
          },
          // ... 其他原有結構保持不變
        ],
      },
    ];

    eventBus.emit<FileSystemChangeEvent>({
      type: "FILE_SYSTEM_CHANGED",
      payload: {
        changeType: "created",
        path: "/src/components/NewFile.tsx",
        tree: newTree,
      },
    });
  };

  // 模擬刪除檔案
  const handleDeleteFile = () => {
    const newTree: FileTreeNode[] = [
      {
        id: "1",
        name: "src",
        type: "directory",
        path: "/src",
        children: [
          {
            id: "2",
            name: "components",
            type: "directory",
            path: "/src/components",
            children: [
              {
                id: "4",
                name: "Input.tsx",
                type: "file",
                path: "/src/components/Input.tsx",
              },
            ],
          },
          // ... 其他原有結構保持不變
        ],
      },
    ];

    eventBus.emit<FileSystemChangeEvent>({
      type: "FILE_SYSTEM_CHANGED",
      payload: {
        changeType: "deleted",
        path: "/src/components/Button.tsx",
        tree: newTree,
      },
    });
  };

  // 模擬重命名檔案
  const handleRenameFile = () => {
    const newTree: FileTreeNode[] = [
      {
        id: "1",
        name: "src",
        type: "directory",
        path: "/src",
        children: [
          {
            id: "2",
            name: "components",
            type: "directory",
            path: "/src/components",
            children: [
              {
                id: "3",
                name: "ButtonRenamed.tsx",
                type: "file",
                path: "/src/components/ButtonRenamed.tsx",
              },
              {
                id: "4",
                name: "Input.tsx",
                type: "file",
                path: "/src/components/Input.tsx",
              },
            ],
          },
          // ... 其他原有結構保持不變
        ],
      },
    ];

    eventBus.emit<FileSystemChangeEvent>({
      type: "FILE_SYSTEM_CHANGED",
      payload: {
        changeType: "renamed",
        path: "/src/components/Button.tsx",
        tree: newTree,
        metadata: {
          oldPath: "/src/components/Button.tsx",
          newPath: "/src/components/ButtonRenamed.tsx",
        },
      },
    });
  };

  return (
    <div className="flex h-screen">
      <FileExplorerEventHandlersProvider>
        <FileExplorer />
      </FileExplorerEventHandlersProvider>
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold mb-4">File System Operations</h2>
        <div className="space-y-2">
          <button
            onClick={handleCreateFile}
            className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Create New File
          </button>
          <button
            onClick={handleDeleteFile}
            className="w-full px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
          >
            Delete Button.tsx
          </button>
          <button
            onClick={handleRenameFile}
            className="w-full px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
          >
            Rename Button.tsx
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestPanel;
