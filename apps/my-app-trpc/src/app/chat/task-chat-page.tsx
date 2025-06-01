// apps/my-app-trpc/src/app/chat/task-chat-page.tsx
"use client";

import { Suspense } from "react";
import { ChatInterface } from "./chat-interface";

export default async function TaskChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="text-sm text-gray-500">Loading chat...</div>
        </div>
      }
    >
      <ChatInterface chatId="dev-chat-id" />
    </Suspense>
  );
}
