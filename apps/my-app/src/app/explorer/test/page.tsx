"use client";

import { JSX } from "react";
import { Logger } from "tslog";
import TestFileExplorer from "./test-file-explorer";
import ExplorerIntegrationTest from "./explorer-integration-test";

// Create logger for the test page
const logger = new Logger({
  name: "TestExplorerPage",
  minLevel: 2, // INFO level
});

/**
 * Test page for file explorer
 */
const TestExplorerPage = (): JSX.Element => {
  return (
    <div className="container mx-auto">
      {/* <TestFileExplorer /> */}
      <ExplorerIntegrationTest />
    </div>
  );
};

export default TestExplorerPage;
