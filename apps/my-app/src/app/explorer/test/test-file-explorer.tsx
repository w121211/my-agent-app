import { JSX, useState, useEffect } from "react";
import { ILogObj, Logger } from "tslog";
import { useFileExplorerStore } from "../file-explorer-store";
import FileExplorer from "../file-explorer";
import { IEventBus } from "@repo/events-core/event-bus";
import { createClientEventBus } from "@repo/events-core/event-bus";
import {
  ServerEventType,
  ServerFileSystem,
  FileSystemEventData,
} from "@repo/events-core/event-types";
import { WebSocketEventClientProvider } from "./websocket-client-provider";
import { ChevronDown, FolderPlus, FilePlus, Trash2, Edit } from "lucide-react";

// Create logger
const logger: Logger<ILogObj> = new Logger({ name: "TestFileExplorer" });

// Sample file structure
const sampleFiles = [
  { path: "/src", isDirectory: true },
  { path: "/src/index.ts", isDirectory: false },
  { path: "/src/app.ts", isDirectory: false },
  { path: "/docs", isDirectory: true },
  { path: "/docs/README.md", isDirectory: false },
  { path: "/package.json", isDirectory: false },
];

/**
 * Test component for file explorer
 */
const TestFileExplorer = (): JSX.Element => {
  const [eventBus] = useState<IEventBus>(() =>
    createClientEventBus({ logger })
  );

  // Initialize the file explorer with dummy data
  useEffect(() => {
    logger.info("Initializing with sample data");
    const { addPath } = useFileExplorerStore.getState();

    // Reset current state
    useFileExplorerStore.getState().fileSystem.children = [];

    // Add sample files
    sampleFiles.forEach((file) => {
      addPath(file.path, file.isDirectory);
    });
  }, []);

  // Function to emit file system events
  const emitFileEvent = (
    eventType: "add" | "addDir" | "unlink" | "unlinkDir" | "rename",
    srcPath: string,
    isDirectory: boolean,
    destPath?: string
  ): void => {
    logger.info(`Emitting ${eventType} event for ${srcPath}`);

    const fileData: FileSystemEventData = {
      eventType,
      srcPath,
      isDirectory,
    };

    if (destPath && eventType === "rename") {
      fileData.destPath = destPath;
    }

    const event: ServerFileSystem = {
      eventType: ServerEventType.SERVER_FILE_SYSTEM,
      timestamp: new Date(),
      data: fileData,
    };

    eventBus
      .emit(event)
      .catch((error) => logger.error("Error emitting event:", error));
  };

  // Reset explorer to initial state
  const resetExplorer = (): void => {
    logger.info("Resetting file explorer");

    // Clear current state
    useFileExplorerStore.getState().fileSystem.children = [];

    // Re-add sample files
    const { addPath } = useFileExplorerStore.getState();
    sampleFiles.forEach((file) => {
      addPath(file.path, file.isDirectory);
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test File Explorer</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* File Explorer */}
        <div className="w-full lg:w-1/3">
          <WebSocketEventClientProvider
            hostname="localhost"
            port={8000}
            protocol="ws:"
            logger={logger}
            eventBusOverride={eventBus}
          >
            <FileExplorer title="Test Workspace" />
          </WebSocketEventClientProvider>
        </div>

        {/* Test Controls */}
        <div className="w-full lg:w-2/3">
          <div className="border rounded-md shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Test Actions</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => emitFileEvent("add", "/src/test.ts", false)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <FilePlus size={16} />
                Add test.ts
              </button>

              <button
                onClick={() => emitFileEvent("addDir", "/config", true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <FolderPlus size={16} />
                Add config folder
              </button>

              <button
                onClick={() => emitFileEvent("unlink", "/package.json", false)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <Trash2 size={16} />
                Remove package.json
              </button>

              <button
                onClick={() =>
                  emitFileEvent(
                    "rename",
                    "/docs/README.md",
                    false,
                    "/docs/CONTRIBUTING.md"
                  )
                }
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                <Edit size={16} />
                Rename README.md
              </button>
            </div>

            <button
              onClick={resetExplorer}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset Explorer
            </button>
          </div>

          <div className="border rounded-md shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-3">Custom Actions</h2>

            <div className="mb-3">
              <label className="block text-sm mb-1">Add File:</label>
              <div className="flex">
                <input
                  type="text"
                  id="add-file-path"
                  className="flex-1 px-2 py-1 border rounded-l"
                  placeholder="/path/to/file.txt"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "add-file-path"
                    ) as HTMLInputElement;
                    if (input.value) {
                      emitFileEvent("add", input.value, false);
                      input.value = "";
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-r"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Add Folder:</label>
              <div className="flex">
                <input
                  type="text"
                  id="add-folder-path"
                  className="flex-1 px-2 py-1 border rounded-l"
                  placeholder="/path/to/folder"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "add-folder-path"
                    ) as HTMLInputElement;
                    if (input.value) {
                      emitFileEvent("addDir", input.value, true);
                      input.value = "";
                    }
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded-r"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Remove Path:</label>
              <div className="flex">
                <input
                  type="text"
                  id="remove-path"
                  className="flex-1 px-2 py-1 border rounded-l"
                  placeholder="/path/to/remove"
                />
                <select id="remove-type" className="px-2 border-y">
                  <option value="file">File</option>
                  <option value="dir">Directory</option>
                </select>
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "remove-path"
                    ) as HTMLInputElement;
                    const typeSelect = document.getElementById(
                      "remove-type"
                    ) as HTMLSelectElement;
                    const isDir = typeSelect.value === "dir";

                    if (input.value) {
                      emitFileEvent(
                        isDir ? "unlinkDir" : "unlink",
                        input.value,
                        isDir
                      );
                      input.value = "";
                    }
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded-r"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Rename:</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  id="rename-old-path"
                  className="px-2 py-1 border rounded"
                  placeholder="Old path"
                />
                <input
                  type="text"
                  id="rename-new-path"
                  className="px-2 py-1 border rounded"
                  placeholder="New path"
                />
              </div>
              <div className="flex items-center">
                <label className="mr-2">
                  <input
                    type="checkbox"
                    id="rename-is-directory"
                    className="mr-1"
                  />
                  Is Directory
                </label>
                <button
                  onClick={() => {
                    const oldPath = (
                      document.getElementById(
                        "rename-old-path"
                      ) as HTMLInputElement
                    ).value;
                    const newPath = (
                      document.getElementById(
                        "rename-new-path"
                      ) as HTMLInputElement
                    ).value;
                    const isDir = (
                      document.getElementById(
                        "rename-is-directory"
                      ) as HTMLInputElement
                    ).checked;

                    if (oldPath && newPath) {
                      emitFileEvent("rename", oldPath, isDir, newPath);
                      (
                        document.getElementById(
                          "rename-old-path"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "rename-new-path"
                        ) as HTMLInputElement
                      ).value = "";
                    }
                  }}
                  className="px-3 py-1 bg-purple-500 text-white rounded ml-auto"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <details className="border rounded-md shadow-sm">
              <summary className="p-3 cursor-pointer flex items-center">
                <ChevronDown size={16} className="mr-2" />
                <span className="font-medium">Current File System State</span>
              </summary>
              <div className="p-3 border-t">
                <pre className="bg-gray-50 p-3 text-xs overflow-auto max-h-64 rounded">
                  {JSON.stringify(
                    useFileExplorerStore.getState().fileSystem,
                    null,
                    2
                  )}
                </pre>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestFileExplorer;
