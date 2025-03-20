import { JSX, useCallback, useState } from "react";
import { ILogObj, Logger } from "tslog";
import {
  ServerEventType,
  ServerFileSystem,
  FileSystemEventData,
} from "@repo/events-core/event-types";
import { IEventBus } from "@repo/events-core/event-bus";
import { useFileExplorerStore } from "../file-explorer-store";
import {
  MockEventBusProvider,
  useMockEventBus,
} from "./mock-event-bus-provider";
import FileExplorer from "../file-explorer";
import {
  Play,
  Folder,
  File,
  Trash,
  RefreshCw,
  FolderPlus,
  FilePlus,
} from "lucide-react";

// Create logger
const logger: Logger<ILogObj> = new Logger({
  name: "TestFileExplorerScenarios",
});

// Scenario type definition
interface FileSystemOperation {
  type: "add" | "addDir" | "unlink" | "unlinkDir" | "rename";
  path: string;
  isDirectory: boolean;
  newPath?: string;
  description: string;
}

// Scenario definition
interface Scenario {
  name: string;
  description: string;
  operations: FileSystemOperation[];
}

// Predefined scenarios
const scenarios: Scenario[] = [
  {
    name: "Simple Project",
    description:
      "Create a basic project structure with common folders and files",
    operations: [
      {
        type: "addDir",
        path: "/src",
        isDirectory: true,
        description: "Add source folder",
      },
      {
        type: "addDir",
        path: "/src/components",
        isDirectory: true,
        description: "Add components folder",
      },
      {
        type: "addDir",
        path: "/src/utils",
        isDirectory: true,
        description: "Add utils folder",
      },
      {
        type: "add",
        path: "/src/index.ts",
        isDirectory: false,
        description: "Add index.ts",
      },
      {
        type: "add",
        path: "/src/app.ts",
        isDirectory: false,
        description: "Add app.ts",
      },
      {
        type: "add",
        path: "/package.json",
        isDirectory: false,
        description: "Add package.json",
      },
      {
        type: "add",
        path: "/tsconfig.json",
        isDirectory: false,
        description: "Add tsconfig.json",
      },
      {
        type: "add",
        path: "/README.md",
        isDirectory: false,
        description: "Add README.md",
      },
    ],
  },
  {
    name: "Deep Structure",
    description: "Test nested folder structure with files at multiple levels",
    operations: [
      {
        type: "addDir",
        path: "/project",
        isDirectory: true,
        description: "Add project root folder",
      },
      {
        type: "addDir",
        path: "/project/frontend",
        isDirectory: true,
        description: "Add frontend folder",
      },
      {
        type: "addDir",
        path: "/project/backend",
        isDirectory: true,
        description: "Add backend folder",
      },
      {
        type: "addDir",
        path: "/project/frontend/src",
        isDirectory: true,
        description: "Add frontend src folder",
      },
      {
        type: "addDir",
        path: "/project/frontend/src/components",
        isDirectory: true,
        description: "Add components folder",
      },
      {
        type: "addDir",
        path: "/project/frontend/src/pages",
        isDirectory: true,
        description: "Add pages folder",
      },
      {
        type: "addDir",
        path: "/project/frontend/src/hooks",
        isDirectory: true,
        description: "Add hooks folder",
      },
      {
        type: "addDir",
        path: "/project/backend/src",
        isDirectory: true,
        description: "Add backend src folder",
      },
      {
        type: "addDir",
        path: "/project/backend/src/controllers",
        isDirectory: true,
        description: "Add controllers folder",
      },
      {
        type: "addDir",
        path: "/project/backend/src/models",
        isDirectory: true,
        description: "Add models folder",
      },
      {
        type: "add",
        path: "/project/frontend/src/index.tsx",
        isDirectory: false,
        description: "Add index.tsx",
      },
      {
        type: "add",
        path: "/project/frontend/src/components/Button.tsx",
        isDirectory: false,
        description: "Add Button.tsx",
      },
      {
        type: "add",
        path: "/project/frontend/src/pages/Home.tsx",
        isDirectory: false,
        description: "Add Home.tsx",
      },
      {
        type: "add",
        path: "/project/backend/src/index.ts",
        isDirectory: false,
        description: "Add backend index.ts",
      },
      {
        type: "add",
        path: "/project/backend/src/controllers/UserController.ts",
        isDirectory: false,
        description: "Add UserController.ts",
      },
      {
        type: "add",
        path: "/project/.env",
        isDirectory: false,
        description: "Add .env file",
      },
    ],
  },
  {
    name: "Rename & Delete Operations",
    description: "Test renaming and deleting files and folders",
    operations: [
      {
        type: "addDir",
        path: "/temp",
        isDirectory: true,
        description: "Add temp folder",
      },
      {
        type: "add",
        path: "/temp/old-file.txt",
        isDirectory: false,
        description: "Add old-file.txt",
      },
      {
        type: "add",
        path: "/temp/to-delete.txt",
        isDirectory: false,
        description: "Add to-delete.txt",
      },
      {
        type: "addDir",
        path: "/temp/old-folder",
        isDirectory: true,
        description: "Add old-folder",
      },
      {
        type: "addDir",
        path: "/temp/to-delete-folder",
        isDirectory: true,
        description: "Add folder to delete",
      },
      {
        type: "add",
        path: "/temp/old-folder/file.txt",
        isDirectory: false,
        description: "Add file in old-folder",
      },
      {
        type: "rename",
        path: "/temp/old-file.txt",
        isDirectory: false,
        newPath: "/temp/new-file.txt",
        description: "Rename old-file.txt to new-file.txt",
      },
      {
        type: "rename",
        path: "/temp/old-folder",
        isDirectory: true,
        newPath: "/temp/new-folder",
        description: "Rename old-folder to new-folder",
      },
      {
        type: "unlink",
        path: "/temp/to-delete.txt",
        isDirectory: false,
        description: "Delete to-delete.txt",
      },
      {
        type: "unlinkDir",
        path: "/temp/to-delete-folder",
        isDirectory: true,
        description: "Delete to-delete-folder",
      },
    ],
  },
  {
    name: "Edge Cases",
    description:
      "Test edge cases like files with special characters, long names, etc.",
    operations: [
      {
        type: "addDir",
        path: "/test-edge-cases",
        isDirectory: true,
        description: "Add test folder",
      },
      {
        type: "add",
        path: "/test-edge-cases/file with spaces.txt",
        isDirectory: false,
        description: "Add file with spaces",
      },
      {
        type: "add",
        path: "/test-edge-cases/very-long-file-name-that-is-extremely-long-and-might-cause-display-issues.txt",
        isDirectory: false,
        description: "Add file with very long name",
      },
      {
        type: "add",
        path: "/test-edge-cases/special_@#$%^&()_chars.txt",
        isDirectory: false,
        description: "Add file with special characters",
      },
      {
        type: "addDir",
        path: "/test-edge-cases/folder with spaces",
        isDirectory: true,
        description: "Add folder with spaces",
      },
      {
        type: "addDir",
        path: "/test-edge-cases/nested.folder.with.dots",
        isDirectory: true,
        description: "Add folder with dots",
      },
      {
        type: "add",
        path: "/test-edge-cases/.hiddenFile",
        isDirectory: false,
        description: "Add hidden file",
      },
      {
        type: "addDir",
        path: "/test-edge-cases/.hiddenFolder",
        isDirectory: true,
        description: "Add hidden folder",
      },
    ],
  },
];

/**
 * Test scenarios component for file explorer
 */
const TestFileExplorerScenarios = (): JSX.Element => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null
  );
  const [running, setRunning] = useState(false);
  const [currentOpIndex, setCurrentOpIndex] = useState(-1);

  // Wrapped within the provider component
  return (
    <MockEventBusProvider logger={logger}>
      <TestScenarioRunner
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        setSelectedScenario={setSelectedScenario}
        running={running}
        setRunning={setRunning}
        currentOpIndex={currentOpIndex}
        setCurrentOpIndex={setCurrentOpIndex}
      />
    </MockEventBusProvider>
  );
};

interface TestScenarioRunnerProps {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  setSelectedScenario: (scenario: Scenario | null) => void;
  running: boolean;
  setRunning: (running: boolean) => void;
  currentOpIndex: number;
  setCurrentOpIndex: (index: number) => void;
}

/**
 * Inner component that has access to the event bus
 */
const TestScenarioRunner = ({
  scenarios,
  selectedScenario,
  setSelectedScenario,
  running,
  setRunning,
  currentOpIndex,
  setCurrentOpIndex,
}: TestScenarioRunnerProps): JSX.Element => {
  const eventBus = useMockEventBus();
  const [delay, setDelay] = useState(500);

  // Reset file explorer
  const resetExplorer = useCallback(() => {
    logger.info("Resetting file explorer");

    // Clear current state
    const fileExplorerState = useFileExplorerStore.getState();
    fileExplorerState.fileSystem.children = [];
  }, []);

  // Emit a file system event
  const emitFileEvent = useCallback(
    (operation: FileSystemOperation): void => {
      const { type, path, isDirectory, newPath } = operation;

      logger.info(`Emitting ${type} event for ${path}`);

      const fileData: FileSystemEventData = {
        eventType: type,
        srcPath: path,
        isDirectory,
      };

      if (newPath && type === "rename") {
        fileData.destPath = newPath;
      }

      const event: ServerFileSystem = {
        eventType: ServerEventType.SERVER_FILE_SYSTEM,
        timestamp: new Date(),
        data: fileData,
      };

      eventBus
        .emit(event)
        .catch((error) => logger.error("Error emitting event:", error));
    },
    [eventBus]
  );

  // Run current scenario
  const runScenario = useCallback(async () => {
    if (!selectedScenario || running) return;

    setRunning(true);
    resetExplorer();
    setCurrentOpIndex(-1);

    for (let i = 0; i < selectedScenario.operations.length; i++) {
      setCurrentOpIndex(i);
      const operation = selectedScenario.operations[i];
      if (operation) {
        emitFileEvent(operation);
      }

      // Wait for the specified delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    setRunning(false);
    setCurrentOpIndex(-1);
  }, [
    selectedScenario,
    running,
    resetExplorer,
    emitFileEvent,
    delay,
    setRunning,
    setCurrentOpIndex,
  ]);

  // Run individual operation
  const runOperation = useCallback(
    (operation: FileSystemOperation) => {
      emitFileEvent(operation);
    },
    [emitFileEvent]
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">File Explorer Test Scenarios</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* File Explorer */}
        <div className="w-full lg:w-1/3">
          <div className="border rounded-md shadow-sm bg-white h-full">
            <div className="p-2 text-sm font-semibold border-b">
              Test Explorer
            </div>
            <div className="h-[600px] overflow-auto">
              <FileExplorer title="Test Workspace" />
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="w-full lg:w-2/3">
          {/* Scenario Selection */}
          <div className="border rounded-md shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Select Scenario</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {scenarios.map((scenario, index) => (
                <div
                  key={index}
                  className={`border rounded-md p-3 cursor-pointer transition-colors ${
                    selectedScenario === scenario
                      ? "border-blue-500 bg-blue-50"
                      : "hover:border-gray-400"
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <h3 className="font-medium">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {scenario.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={runScenario}
                disabled={!selectedScenario || running}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded ${
                  !selectedScenario || running
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                <Play size={16} />
                Run Scenario
              </button>

              <button
                onClick={resetExplorer}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                <RefreshCw size={16} />
                Reset Explorer
              </button>

              <div className="ml-auto flex items-center gap-2">
                <label className="text-sm">Delay (ms):</label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  step="100"
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value, 10))}
                  className="w-20 px-2 py-1 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Current Scenario Operations */}
          {selectedScenario && (
            <div className="border rounded-md shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold mb-3">
                {selectedScenario.name} Operations
              </h2>

              <div className="overflow-auto max-h-80">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operation
                      </th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Path
                      </th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Run
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedScenario.operations.map((op, index) => (
                      <tr
                        key={index}
                        className={
                          currentOpIndex === index && running
                            ? "bg-blue-50"
                            : ""
                        }
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="flex items-center">
                            {op.type === "add" && (
                              <FilePlus
                                size={16}
                                className="mr-1 text-blue-500"
                              />
                            )}
                            {op.type === "addDir" && (
                              <FolderPlus
                                size={16}
                                className="mr-1 text-green-500"
                              />
                            )}
                            {(op.type === "unlink" ||
                              op.type === "unlinkDir") && (
                              <Trash size={16} className="mr-1 text-red-500" />
                            )}
                            {op.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {op.path}
                          {op.newPath && (
                            <>
                              <span className="text-gray-400 mx-1">→</span>
                              {op.newPath}
                            </>
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm">{op.description}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => runOperation(op)}
                            className="p-1 rounded hover:bg-gray-100"
                            title="Run this operation"
                          >
                            <Play size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manual Operation */}
          <div className="border rounded-md shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-3">Manual Operation</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Operation Type:</label>
                <select
                  id="manual-operation-type"
                  className="w-full px-2 py-1 border rounded"
                >
                  <option value="add">Add File</option>
                  <option value="addDir">Add Directory</option>
                  <option value="unlink">Delete File</option>
                  <option value="unlinkDir">Delete Directory</option>
                  <option value="rename">Rename</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Path:</label>
                <input
                  type="text"
                  id="manual-operation-path"
                  className="w-full px-2 py-1 border rounded"
                  placeholder="/path/to/file.txt"
                />
              </div>

              <div
                className="col-span-2"
                id="rename-target-container"
                style={{ display: "none" }}
              >
                <label className="block text-sm mb-1">New Path:</label>
                <input
                  type="text"
                  id="manual-operation-new-path"
                  className="w-full px-2 py-1 border rounded"
                  placeholder="/path/to/new-file.txt"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm mb-1">Description:</label>
                <input
                  type="text"
                  id="manual-operation-description"
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Description of operation"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  const typeSelect = document.getElementById(
                    "manual-operation-type"
                  ) as HTMLSelectElement;
                  const pathInput = document.getElementById(
                    "manual-operation-path"
                  ) as HTMLInputElement;
                  const newPathInput = document.getElementById(
                    "manual-operation-new-path"
                  ) as HTMLInputElement;
                  const descriptionInput = document.getElementById(
                    "manual-operation-description"
                  ) as HTMLInputElement;

                  const type = typeSelect.value as
                    | "add"
                    | "addDir"
                    | "unlink"
                    | "unlinkDir"
                    | "rename";
                  const path = pathInput.value;
                  const newPath = newPathInput.value;
                  const description =
                    descriptionInput.value || "Manual operation";
                  const isDirectory =
                    type === "addDir" ||
                    type === "unlinkDir" ||
                    (type === "rename" &&
                      document.getElementById(
                        "manual-operation-is-directory"
                      ) instanceof HTMLInputElement &&
                      (
                        document.getElementById(
                          "manual-operation-is-directory"
                        ) as HTMLInputElement
                      ).checked);

                  if (!path) {
                    alert("Path is required");
                    return;
                  }

                  if (type === "rename" && !newPath) {
                    alert("New path is required for rename operation");
                    return;
                  }

                  const operation: FileSystemOperation = {
                    type,
                    path,
                    isDirectory,
                    description,
                  };

                  if (type === "rename") {
                    operation.newPath = newPath;
                  }

                  runOperation(operation);

                  // Clear inputs
                  pathInput.value = "";
                  if (newPathInput) newPathInput.value = "";
                  descriptionInput.value = "";
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Script for dynamic UI behavior */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              document.addEventListener('DOMContentLoaded', function() {
                const typeSelect = document.getElementById('manual-operation-type');
                const renameContainer = document.getElementById('rename-target-container');
                
                if (typeSelect && renameContainer) {
                  typeSelect.addEventListener('change', function() {
                    if (this.value === 'rename') {
                      renameContainer.style.display = 'block';
                    } else {
                      renameContainer.style.display = 'none';
                    }
                  });
                }
              });
            `,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TestFileExplorerScenarios;
