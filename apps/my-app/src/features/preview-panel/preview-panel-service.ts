import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";

import { type IEventBus } from "@repo/events-core/event-bus";
import { ServerFileOpenedEvent } from "@repo/events-core/event-types";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import { usePreviewPanelStore, PreviewFile } from "./preview-panel-store";

@injectable()
export class PreviewPanelService {
  private logger: Logger<ILogObj>;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger<ILogObj>({ name: "PreviewPanelService" });
    this.registerEventHandlers();
    this.logger.debug("PreviewPanelService initialized");
  }

  private registerEventHandlers(): void {
    this.eventBus.subscribe<ServerFileOpenedEvent>(
      "ServerFileOpened",
      (event) => this.handleFileOpenedEvent(event)
    );
  }

  private handleFileOpenedEvent(event: ServerFileOpenedEvent): void {
    const { filePath, content, fileType } = event;
    
    // Skip chat files - they will be handled by the ChatPanelService
    if (this.isChatFile(filePath, fileType)) {
      this.logger.debug(`Skipping chat file: ${filePath}`);
      return;
    }

    this.logger.info(`Preview panel handling file: ${filePath}, type: ${fileType}`);
    
    const store = usePreviewPanelStore.getState();
    store.setLoading(true);
    
    try {
      const previewFile: PreviewFile = {
        path: filePath,
        content,
        fileType,
        lastUpdated: new Date()
      };
      
      store.setCurrentFile(previewFile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      store.setError(`Failed to process file: ${errorMessage}`);
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * Determines if a file is a chat file based on fileType and path
   */
  private isChatFile(filePath: string, fileType: string): boolean {
    if (fileType === "chat" || fileType === "application/json") {
      return (
        filePath.endsWith(".chat.json") ||
        filePath.includes("/chats/") ||
        filePath.endsWith(".v1.json") ||
        filePath.endsWith(".v2.json")
      );
    }
    return false;
  }

  /**
   * Manually open a file in the preview panel
   */
  public openFile(filePath: string, content: string, fileType: string): void {
    const previewFile: PreviewFile = {
      path: filePath,
      content,
      fileType,
      lastUpdated: new Date()
    };
    
    usePreviewPanelStore.getState().setCurrentFile(previewFile);
  }

  /**
   * Clear the current file from the preview panel
   */
  public clearFile(): void {
    usePreviewPanelStore.getState().clearCurrentFile();
  }
}
