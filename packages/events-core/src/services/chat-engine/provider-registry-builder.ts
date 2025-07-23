// packages/events-core/src/services/chat-engine/provider-registry-builder.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createProviderRegistry } from "ai";
import type { UserSettings } from "../user-settings-repository.js";

export function buildProviderRegistry(userSettings: UserSettings) {
  const providers: Record<string, any> = {};

  // OpenRouter provider setup - direct access to all OpenRouter models
  if (
    userSettings.providers.openrouter?.enabled &&
    userSettings.providers.openrouter.apiKey
  ) {
    providers.openrouter = createOpenRouter({
      apiKey: userSettings.providers.openrouter.apiKey,
    });
  }

  return createProviderRegistry(providers);
}
