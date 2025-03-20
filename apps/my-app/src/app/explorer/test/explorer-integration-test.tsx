"use client";

import { JSX, useState } from "react";
import { Logger } from "tslog";
import TestFileExplorer from "./test-file-explorer";
import TestFileExplorerScenarios from "./test-file-explorer-scenarios";

// Create logger
const logger = new Logger({
  name: "ExplorerIntegrationTest",
  minLevel: 2, // INFO level
});

/**
 * Integration test page for file explorer components
 * Allows testing both simple and complex scenarios
 */
const ExplorerIntegrationTest = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<"basic" | "scenarios">("basic");

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">
        File Explorer Integration Test
      </h1>

      {/* Tab navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "basic"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("basic")}
        >
          Basic Testing
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "scenarios"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("scenarios")}
        >
          Scenario Testing
        </button>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === "basic" && <TestFileExplorer />}
        {activeTab === "scenarios" && <TestFileExplorerScenarios />}
      </div>

      {/* Test information */}
      <div className="mt-8 border-t pt-4 text-sm text-gray-600">
        <h2 className="font-semibold mb-2">Testing Information</h2>
        <p>
          This page provides comprehensive testing tools for the file explorer
          component. Use the basic testing tab for simple file operations, or
          try the scenario testing tab for more complex use cases.
        </p>
        <p className="mt-2">
          All operations are performed in-memory and use a mock event bus
          implementation to simulate the WebSocket connection to the server.
        </p>
      </div>
    </div>
  );
};

export default ExplorerIntegrationTest;
