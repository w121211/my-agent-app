// apps/my-app-trpc-2/src/components/main-layout.tsx
import { ExplorerPanel } from "./explorer-panel";
import { ChatPanel } from "./chat-panel";
import { RightPanel } from "./right-panel";
import { ToastProvider } from "./toast-provider";

export const MainLayout = () => {
  return (
    <ToastProvider>
      <div className="h-screen flex bg-background text-foreground font-sans">
        <ExplorerPanel />
        <ChatPanel />
        <RightPanel />
      </div>
    </ToastProvider>
  );
};
