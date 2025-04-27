import React from "react";
import { RefreshCw, Plus, MessageSquarePlus } from "lucide-react";
import { ILogObj, Logger } from "tslog";
import { useWorkspaceTreeService, useEventBus } from "../../lib/di/di-provider";
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

const ExplorerHeader = () => {
  const workspaceTreeService = useWorkspaceTreeService();
  const eventBus = useEventBus();

  const handleRefresh = () => {
    logger.info("Manually refreshing workspace tree");
    workspaceTreeService?.requestWorkspaceTree();
  };

  const handleNewFolder = () => {
    logger.info("Create new folder action triggered");
  };

  const handleNewChat = () => {
    logger.info("New chat button clicked");
    if (!eventBus) {
      logger.error("Event bus not available");
      return;
    }

    eventBus
      .emit({
        kind: "UINewChatButtonClicked",
        timestamp: new Date(),
      })
      .catch((error) => {
        logger.error("Failed to emit new chat event:", error);
      });
  };

  return (
    <div className="p-2 flex flex-col gap-2 border-b">
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">Workspace Explorer</div>
        <div className="flex gap-1">
          <ActionButton
            icon={MessageSquarePlus}
            onClick={handleNewChat}
            label="New Chat"
            className="text-blue-600"
          />
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
