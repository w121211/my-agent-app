"use client";

import { type JSX } from "react";
import { ILogObj, Logger } from "tslog";
import { WebSocketEventClientProvider } from "../websocket/websocket-client-provider";
import FileExplorer from "./file-explorer";

// Create logger for the explorer page
const logger: Logger<ILogObj> = new Logger({
  name: "ExplorerPage",
  minLevel: 2,
});

const ExplorerPage = (): JSX.Element => {
  return (
    <WebSocketEventClientProvider
      hostname="localhost"
      port={8000}
      protocol="ws:"
      logger={logger}
    >
      <div className="flex h-screen">
        <div className="h-full">
          <FileExplorer title="Workspace" />
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-xl font-bold mb-4">Workspace Explorer</h1>
          <p>Select a file from the explorer to view its contents.</p>
        </div>
      </div>
    </WebSocketEventClientProvider>
  );
};

export default ExplorerPage;
