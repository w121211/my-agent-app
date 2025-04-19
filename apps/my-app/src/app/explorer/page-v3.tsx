"use client";

import React, { useEffect, useState } from "react";
import { ILogObj, Logger } from "tslog";
import {
  useWorkspaceTreeStore,
  TreeNode,
  FolderTreeNode,
  FileTreeNode,
  isFolderNode,
} from "../../features/workspace-tree/workspace-tree-store";
import { WorkspaceTreeService } from "../../features/workspace-tree/workspace-tree-service";
import { DIProvider } from "../../lib/di/di-provider";
import { container } from "../../lib/di/di-container";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import ExplorerHeader from "./explorer-header";
import {
  FileNodeComponent,
  FolderNodeComponent,
  TreeNodeComponent,
} from "./tree-components";

// Setup logger
const logger = new Logger<ILogObj>({ name: "workspace-explorer" });

// Explorer Panel
const WorkspaceTreeViewer = () => {
  const { root } = useWorkspaceTreeStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (root) {
      setIsLoading(false);
    }
  }, [root]);

  if (isLoading) {
    return (
      <div className="p-4 text-gray-400 flex items-center justify-center h-full">
        Loading workspace files...
      </div>
    );
  }

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
  const [isServiceInitialized, setIsServiceInitialized] = useState(false);

  useEffect(() => {
    // Add debug log at the beginning of the effect for tracking component lifecycle
    logger.debug(
      "WorkspaceExplorerPage - Component mounted, initializing workspace tree"
    );

    // Once the component is mounted, retrieve the tree service and request the workspace tree
    const initializeWorkspaceTree = () => {
      logger.debug("Initializing workspace tree service");

      try {
        const workspaceTreeService = container.resolve<WorkspaceTreeService>(
          DI_TOKENS.WORKSPACE_TREE_SERVICE
        );

        // Mark as initialized - this will be falsy until resolved from container
        if (workspaceTreeService) {
          setIsServiceInitialized(true);

          // Request the workspace tree
          logger.info("Requesting initial workspace tree");
          workspaceTreeService.requestWorkspaceTree();
        }
      } catch (error) {
        logger.error("Failed to initialize workspace tree service", error);

        // Fallback to sample data if service initialization fails
        initializeWithSampleData();
      }
    };

    // Fallback function to initialize with sample data
    const initializeWithSampleData = () => {
      logger.warn("Using sample workspace data for initialization");
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
    };

    initializeWorkspaceTree();
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
