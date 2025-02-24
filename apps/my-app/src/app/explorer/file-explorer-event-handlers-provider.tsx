import { ReactNode, useEffect } from "react";
import { setupExplorerEventHandlers } from "@/lib/file-explorer-events";

interface FileExplorerEventHandlersProviderProps {
  children: ReactNode;
}

const FileExplorerEventHandlersProvider = ({
  children,
}: FileExplorerEventHandlersProviderProps) => {
  useEffect(() => {
    const cleanup = setupExplorerEventHandlers();
    return cleanup;
  }, []);

  return children;
};

export default FileExplorerEventHandlersProvider;
