import { create } from "zustand";
import { Logger } from "tslog";

const logger = new Logger({ name: "preview-panel-store" });

export interface PreviewFile {
  path: string;
  content: string;
  fileType: string;
  lastUpdated: Date;
}

interface PreviewPanelState {
  currentFile: PreviewFile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentFile: (file: PreviewFile) => void;
  clearCurrentFile: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePreviewPanelStore = create<PreviewPanelState>((set) => ({
  currentFile: null,
  isLoading: false,
  error: null,
  
  setCurrentFile: (file) => {
    logger.debug(`Setting preview panel file: ${file.path}`);
    set({ currentFile: file, error: null });
  },
  
  clearCurrentFile: () => {
    logger.debug("Clearing preview panel file");
    set({ currentFile: null });
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => {
    if (error) {
      logger.error(`Preview panel error: ${error}`);
    }
    set({ error });
  }
}));
