// apps/my-app-svelte/src/services/event-service.ts
import { Logger } from "tslog";
import { trpcClient } from "../lib/trpc-client";
import { projectService } from "./project-service";
import { chatService } from "./chat-service";
import { taskService } from "./task-service";

type SubscriptionState = "idle" | "connecting" | "connected" | "error";

interface Subscription {
  unsubscribe: () => void;
  state: SubscriptionState;
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
  }

  getSubscriptionState(name: string): SubscriptionState {
    return this.subscriptions.get(name)?.state ?? "idle";
  }

  private startFileWatcherSubscription() {
    try {
      const subscription = trpcClient.event.fileWatcherEvents.subscribe(
        { lastEventId: null },
        {
          onStarted: () => {
            this.logger.info("File watcher subscription started");
            this.updateSubscriptionState("fileWatcher", "connected");
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
            this.updateSubscriptionState("fileWatcher", "error");
          },
        },
      );

      this.subscriptions.set("fileWatcher", {
        unsubscribe: subscription.unsubscribe,
        state: "connecting",
      });
    } catch (error) {
      this.logger.error("Failed to start file watcher subscription:", error);
    }
  }

  private startChatEventSubscription() {
    try {
      const subscription = trpcClient.event.chatEvents.subscribe(
        { lastEventId: null },
        {
          onStarted: () => {
            this.logger.info("Chat event subscription started");
            this.updateSubscriptionState("chatEvents", "connected");
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
            this.updateSubscriptionState("chatEvents", "error");
          },
        },
      );

      this.subscriptions.set("chatEvents", {
        unsubscribe: subscription.unsubscribe,
        state: "connecting",
      });
    } catch (error) {
      this.logger.error("Failed to start chat event subscription:", error);
    }
  }

  private startTaskEventSubscription() {
    try {
      const subscription = trpcClient.event.taskEvents.subscribe(
        { lastEventId: null },
        {
          onStarted: () => {
            this.logger.info("Task event subscription started");
            this.updateSubscriptionState("taskEvents", "connected");
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
            this.updateSubscriptionState("taskEvents", "error");
          },
        },
      );

      this.subscriptions.set("taskEvents", {
        unsubscribe: subscription.unsubscribe,
        state: "connecting",
      });
    } catch (error) {
      this.logger.error("Failed to start task event subscription:", error);
    }
  }

  private startProjectFolderEventSubscription() {
    try {
      const subscription = trpcClient.event.projectFolderEvents.subscribe(
        { lastEventId: null },
        {
          onStarted: () => {
            this.logger.info("Project folder event subscription started");
            this.updateSubscriptionState("projectFolderEvents", "connected");
          },
          onData: (event) => {
            this.logger.debug("Project folder event:", event.data.updateType);
            projectService.handleProjectFolderEvent(event.data);
          },
          onError: (error) => {
            this.logger.error(
              "Project folder event subscription error:",
              error,
            );
            this.updateSubscriptionState("projectFolderEvents", "error");
          },
        },
      );

      this.subscriptions.set("projectFolderEvents", {
        unsubscribe: subscription.unsubscribe,
        state: "connecting",
      });
    } catch (error) {
      this.logger.error(
        "Failed to start project folder event subscription:",
        error,
      );
    }
  }

  private updateSubscriptionState(name: string, state: SubscriptionState) {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.state = state;
      this.subscriptions.set(name, subscription);
    }
  }
}

export const eventService = new EventService();
