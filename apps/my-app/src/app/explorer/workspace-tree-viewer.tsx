import { useEffect, useState } from "react";
import { ILogObj, Logger } from "tslog";
import {
  useWorkspaceTreeService,
  useServicesInitialized,
} from "../../lib/di/di-provider";
import { useWorkspaceTreeStore } from "../../features/workspace-tree/workspace-tree-store";
import { TreeNodeComponent } from "./tree-components";

const logger = new Logger<ILogObj>({ name: "workspace-tree-viewer" });

const WorkspaceTreeViewer = () => {
  const { root } = useWorkspaceTreeStore();
  const [isLoading, setIsLoading] = useState(true);
  const workspaceTreeService = useWorkspaceTreeService();
  const servicesInitialized = useServicesInitialized();

  useEffect(() => {
    if (root) {
      setIsLoading(false);
    }
  }, [root]);

  // Request workspace tree data after services are initialized
  useEffect(() => {
    if (servicesInitialized && workspaceTreeService) {
      logger.info("Requesting initial workspace tree");
      workspaceTreeService.requestWorkspaceTree();
    }
  }, [servicesInitialized, workspaceTreeService]);

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

export default WorkspaceTreeViewer;
