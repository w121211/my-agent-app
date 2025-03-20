"use client";

import { type JSX } from "react";
import { ILogObj, Logger } from "tslog";
import { DIProvider } from "../../features/file-explorer-di/di-provider";
import FileExplorer from "../../features/file-explorer-di/file-explorer-components";

// Create logger
const logger: Logger<ILogObj> = new Logger({
  name: "FileExplorerDemo",
  minLevel: 2,
});

const FileExplorerDemoPage = (): JSX.Element => {
  logger.debug("FileExplorerDemoPage rendered");

  return (
    <DIProvider
      // websocketConfig={{
      //   hostname: "localhost",
      //   port: 8000,
      //   protocol: "ws:",
      // }}
      logger={logger}
    >
      <div className="flex flex-col h-screen bg-gray-100">
        <header className="bg-gray-800 text-white p-4">
          <h1 className="text-xl font-semibold">VS Code-like File Explorer</h1>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64">
            <FileExplorer />
          </div>

          <div className="flex-1 p-6 bg-white">
            <h2 className="text-xl mb-4">File Explorer Demo</h2>
            <p className="mb-4">
              This is a demonstration of a VS Code-like file explorer that:
            </p>

            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Uses an event-driven architecture</li>
              <li>Implements dependency injection with TSyringe</li>
              <li>Manages state with Zustand</li>
              <li>Supports file and folder operations</li>
              <li>Has context menus for actions</li>
            </ul>

            <div className="mt-6 p-4 bg-gray-100 rounded-md">
              <h3 className="font-medium mb-2">Instructions:</h3>
              <ul className="list-disc pl-6">
                <li>Click on files/folders to select them</li>
                <li>Click the arrows to expand/collapse folders</li>
                <li>Right-click anywhere for context menu options</li>
                <li>Right-click on a file/folder for specific actions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DIProvider>
  );
};

export default FileExplorerDemoPage;
