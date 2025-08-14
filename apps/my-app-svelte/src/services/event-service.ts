// apps/my-app-svelte/src/services/event-service.ts
import { Logger } from "tslog";
import { trpcClient } from "../lib/trpc-client";
import { projectService } from "./project-service";
import { chatService } from "./chat-service";
import { taskService } from "./task-service";
import { setConnectionState } from "../stores/ui-store.svelte";

interface Subscription {
  unsubscribe: () => void;
}

class EventService {
  private logger = new Logger({ name: "EventService" });
  private subscriptions = new Map<string, Subscription>();
  private isStarted = false;

  start() {
    if (this.isStarted) {
      this.logger.warn("EventService already started");
      return;
    }

    this.logger.info("Starting event subscriptions...");
    this.isStarted = true;

    this.startFileWatcherSubscription();
    this.startChatEventSubscription();
    this.startTaskEventSubscription();
    this.startProjectFolderEventSubscription();
  }

  stop() {
    if (!this.isStarted) return;

    this.logger.info("Stopping event subscriptions...");

    this.subscriptions.forEach((subscription, name) => {
      this.logger.debug(`Unsubscribing from ${name}`);
      subscription.unsubscribe();
    });

    this.subscriptions.clear();
    this.isStarted = false;

    // Reset all connection states to idle
    setConnectionState("fileWatcher", "idle");
    setConnectionState("chatEvents", "idle");
    setConnectionState("taskEvents", "idle");
    setConnectionState("projectFolderEvents", "idle");
  }

  private startFileWatcherSubscription() {
    setConnectionState("fileWatcher", "connecting");

    const subscription = trpcClient.event.fileWatcherEvents.subscribe(
      { lastEventId: null },
      {
        onStarted: () => {
          this.logger.info("File watcher subscription started");
          setConnectionState("fileWatcher", "connected");
        },
        onData: (event) => {
          this.logger.debug(
            "File watcher event:",
            event.data.eventType,
            event.data.absoluteFilePath,
          );
          projectService.handleFileEvent(event.data);
        },
        onError: (error) => {
          this.logger.error("File watcher subscription error:", error);
          setConnectionState("fileWatcher", "error");
        },
      },
    );

    this.subscriptions.set("fileWatcher", {
      unsubscribe: subscription.unsubscribe,
    });
  }

  private startChatEventSubscription() {
    setConnectionState("chatEvents", "connecting");

    const subscription = trpcClient.event.chatEvents.subscribe(
      { lastEventId: null },
      {
        onStarted: () => {
          this.logger.info("Chat event subscription started");
          setConnectionState("chatEvents", "connected");
        },
        onData: (event) => {
          this.logger.debug(
            "Chat event:",
            event.data.updateType,
            event.data.chatId,
          );
          chatService.handleChatEvent(event.data);
        },
        onError: (error) => {
          this.logger.error("Chat event subscription error:", error);
          setConnectionState("chatEvents", "error");
        },
      },
    );

    this.subscriptions.set("chatEvents", {
      unsubscribe: subscription.unsubscribe,
    });
  }

  private startTaskEventSubscription() {
    setConnectionState("taskEvents", "connecting");

    const subscription = trpcClient.event.taskEvents.subscribe(
      { lastEventId: null },
      {
        onStarted: () => {
          this.logger.info("Task event subscription started");
          setConnectionState("taskEvents", "connected");
        },
        onData: (event) => {
          this.logger.debug(
            "Task event:",
            event.data.updateType,
            event.data.taskId,
          );
          taskService.handleTaskEvent(event.data);
        },
        onError: (error) => {
          this.logger.error("Task event subscription error:", error);
          setConnectionState("taskEvents", "error");
        },
      },
    );

    this.subscriptions.set("taskEvents", {
      unsubscribe: subscription.unsubscribe,
    });
  }

  private startProjectFolderEventSubscription() {
    setConnectionState("projectFolderEvents", "connecting");

    const subscription = trpcClient.event.projectFolderEvents.subscribe(
      { lastEventId: null },
      {
        onStarted: () => {
          this.logger.info("Project folder event subscription started");
          setConnectionState("projectFolderEvents", "connected");
        },
        onData: (event) => {
          this.logger.debug("Project folder event:", event.data.updateType);
          projectService.handleProjectFolderEvent(event.data);
        },
        onError: (error) => {
          this.logger.error("Project folder event subscription error:", error);
          setConnectionState("projectFolderEvents", "error");
        },
      },
    );

    this.subscriptions.set("projectFolderEvents", {
      unsubscribe: subscription.unsubscribe,
    });
  }
}

export const eventService = new EventService();
