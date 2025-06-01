// apps/my-app-trpc/src/app/chat/three-column-layout.tsx
"use client";

import { Suspense } from "react";
import { EventSubscriptions } from "./event-subscriptions";
import { ExplorerPanel } from "./explorer-panel";
import { PreviewPanel } from "./preview-panel";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <EventSubscriptions />
      <div className="flex flex-1 overflow-hidden">
        {/* Explorer Panel - 280px fixed width */}
        <div className="w-80 border-r bg-white dark:border-gray-800 dark:bg-gray-900">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">Loading explorer...</div>
              </div>
            }
          >
            <ExplorerPanel />
          </Suspense>
        </div>

        {/* Chat Panel - Flexible width */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">Loading chat...</div>
              </div>
            }
          >
            {children}
          </Suspense>
        </div>

        {/* Preview Panel - 360px fixed width */}
        <div className="w-90 border-l bg-white dark:border-gray-800 dark:bg-gray-900">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">Loading preview...</div>
              </div>
            }
          >
            <PreviewPanel />
          </Suspense>
        </div>
      </div>
    </>
  );
}
