import { useEffect, useState } from "react";
import { Logger } from "tslog";
import {
  useWorkspaceTreeService,
  useServicesInitialized,
} from "../../lib/di/di-provider";
import { useWorkspaceTreeStore } from "../../features/workspace-tree/workspace-tree-store";
import { TreeNodeComponent } from "./tree-components";

const logger = new Logger({ name: "workspace-tree-viewer" });

export const WorkspaceTreeViewer = () => {
  const { root } = useWorkspaceTreeStore();
  const [isLoading, setIsLoading] = useState(true);
  const workspaceTreeService = useWorkspaceTreeService();
  const servicesInitialized = useServicesInitialized();

  // Set loading to false when root is available
  useEffect(() => {
    if (root) {
      setIsLoading(false);
    }
  }, [root]);

  // Request workspace tree data when services are initialized
  useEffect(() => {
    if (servicesInitialized && workspaceTreeService) {
      logger.info("Requesting initial workspace tree");
      workspaceTreeService.requestWorkspaceTree().catch((error) => {
        logger.error(`Failed to load workspace tree: ${error}`);
      });
    }
  }, [servicesInitialized, workspaceTreeService]);

  // Handle "New Chat" button click
  const handleNewChat = () => {
    // This would typically open a modal or redirect to the new chat form
    logger.info("New chat button clicked");
    // Implementation would depend on how new chats are created in the application
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <button
          onClick={handleNewChat}
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
        >
          <span className="mr-1">+</span> New Chat
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-gray-400 flex items-center justify-center h-full">
            Loading workspace files...
          </div>
        ) : !root ? (
          <div className="p-4 text-gray-400 flex items-center justify-center h-full">
            No workspace files found
          </div>
        ) : (
          <div className="overflow-y-auto">
            <TreeNodeComponent node={root} />
          </div>
        )}
      </div>

      <div className="p-3 border-t">
        <button className="w-full py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
};

export default WorkspaceTreeViewer;
