import React from "react";
import { RefreshCw, Plus } from "lucide-react";
import { ILogObj, Logger } from "tslog";
import { useWorkspaceTreeService } from "../../lib/di/di-provider";
// import { WorkspaceTreeService } from "../../features/workspace-tree/workspace-tree-service";
import { ConnectionStatusIndicator } from "./connection-status-indicator";

const logger = new Logger<ILogObj>({ name: "explorer-header" });

// Common Components
const ActionButton = ({
  icon: Icon,
  onClick,
  label,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  label?: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`p-1 hover:bg-gray-100 rounded-md flex items-center ${className}`}
    title={label}
  >
    <Icon className="w-4 h-4" />
    {label && <span className="ml-1 text-sm">{label}</span>}
  </button>
);

// Explorer Header with workspace tree service integration
const ExplorerHeader = () => {
  // const workspaceTreeService = container.resolve<WorkspaceTreeService>(
  //   DI_TOKENS.WORKSPACE_TREE_SERVICE
  // );
  const workspaceTreeService = useWorkspaceTreeService();

  // const connectionService = useConnectionService();

  const handleRefresh = () => {
    logger.info("Manually refreshing workspace tree");
    workspaceTreeService.requestWorkspaceTree();
  };

  const handleNewFolder = () => {
    logger.info("Create new folder action triggered");
    // This would typically open a dialog to create a new folder
    // For MVP, we'll just log this action
  };

  return (
    <div className="p-2 flex flex-col gap-2 border-b">
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">Workspace Explorer</div>
        <div className="flex gap-1">
          <ActionButton
            icon={RefreshCw}
            onClick={handleRefresh}
            label="Refresh"
          />
          <ActionButton
            icon={Plus}
            onClick={handleNewFolder}
            label="New Folder"
            className="text-green-600"
          />
        </div>
      </div>
      <ConnectionStatusIndicator />
    </div>
  );
};

export default ExplorerHeader;
