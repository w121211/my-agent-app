"use client";

import { useEffect } from "react";
import {
  useWorkspaceTreeStore,
  FolderTreeNode,
} from "../../features/workspace-tree/workspace-tree-store";
import { DIProvider } from "../../lib/di/di-provider";
import ExplorerHeader from "./explorer-header";
import WorkspaceTreeViewer from "./workspace-tree-viewer";
import FilePreviewPanel from "./file-preview-panel";

// File Preview Panel

// Main Page Component
const WorkspaceExplorerPage = () => {
  const { setRoot } = useWorkspaceTreeStore();

  // Initialize with sample data for immediate rendering
  useEffect(() => {
    // Sample data for immediate display
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
  }, [setRoot]);

  return (
    <DIProvider>
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
