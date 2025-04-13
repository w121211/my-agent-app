import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useConnectionStateStore } from "../../features/connection/connection-state-store";

interface ConnectionStatusIndicatorProps {
  onRefreshClick?: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  onRefreshClick
}) => {
  const isConnected = useConnectionStateStore((state) => state.isConnected);
  const reconnectAttempts = useConnectionStateStore((state) => state.reconnectAttempts);
  const lastDisconnectTime = useConnectionStateStore((state) => state.lastDisconnectTime);
  
  const [timeSinceDisconnect, setTimeSinceDisconnect] = useState<string>("");
  
  // Update time since disconnect every second
  useEffect(() => {
    if (!isConnected && lastDisconnectTime) {
      const interval = setInterval(() => {
        const seconds = Math.floor((Date.now() - lastDisconnectTime.getTime()) / 1000);
        
        if (seconds < 60) {
          setTimeSinceDisconnect(`${seconds}s ago`);
        } else if (seconds < 3600) {
          setTimeSinceDisconnect(`${Math.floor(seconds / 60)}m ago`);
        } else {
          setTimeSinceDisconnect(`${Math.floor(seconds / 3600)}h ago`);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setTimeSinceDisconnect("");
    }
  }, [isConnected, lastDisconnectTime]);
  
  const handleRefreshClick = () => {
    if (onRefreshClick) {
      onRefreshClick();
    }
  };
  
  return (
    <div className={`flex items-center px-2 py-1 rounded-md text-sm ${
      isConnected ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
    }`}>
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 mr-1" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 mr-1" />
          <span>Disconnected{timeSinceDisconnect ? ` (${timeSinceDisconnect})` : ""}</span>
          {reconnectAttempts > 0 && (
            <span className="ml-1 text-xs">
              Retrying ({reconnectAttempts})
            </span>
          )}
          <button 
            onClick={handleRefreshClick}
            className="ml-2 p-1 hover:bg-red-100 rounded-full"
            title="Retry connection"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
};
