// apps/my-app-trpc-2/src/components/main-layout.tsx
import { ExplorerPanel } from "./explorer-panel";
import { ChatPanel } from "./chat-panel";
import { PreviewPanel } from "./preview-panel";
import { NewChatModal } from "./new-chat-modal";
import { ToastProvider } from "./toast-provider";

export const MainLayout = () => {
  return (
    <ToastProvider>
      <div className="h-screen flex bg-gray-100">
        <ExplorerPanel />
        <ChatPanel />
        <PreviewPanel />
        <NewChatModal />
      </div>
    </ToastProvider>
  );
};
