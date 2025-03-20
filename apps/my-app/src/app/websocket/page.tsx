"use client";

import React from "react";
import { ILogObj, Logger } from "tslog";
import { WebSocketEventClientProvider } from "./websocket-client-provider";
import WebSocketTestPanel from "./websocket-test-panel";

// Create logger
const logger: Logger<ILogObj> = new Logger({
  name: "WebSocketTestApp",
  minLevel: 2,
});

const TestPanelPage: React.FC = () => {
  return (
    <WebSocketEventClientProvider
      hostname="localhost"
      port={8000}
      protocol="ws:"
      logger={logger}
    >
      <WebSocketTestPanel />
    </WebSocketEventClientProvider>
  );
};

export default TestPanelPage;
