// packages/events-core/src/services/chat-engine/ai-provider-utils.ts

import { createProviderRegistry, customProvider } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { ProviderRegistryProvider } from "ai";
import type { ProviderV2 } from "@ai-sdk/provider";
import type { UserSettings } from "../user-settings-repository.js";

export async function buildProviderRegistry(
  userSettings: UserSettings,
): Promise<ProviderRegistryProvider> {
  const providers: Record<string, ProviderV2> = {};

  // Add OpenAI provider if enabled
  if (userSettings.providers?.openai?.enabled) {
    providers.openai = customProvider({
      languageModels: {
        "gpt-4": openai("gpt-4"),
        "gpt-4-turbo": openai("gpt-4-turbo"),
        "gpt-3.5-turbo": openai("gpt-3.5-turbo"),
      },
      fallbackProvider: openai,
    });
  }

  // Add Anthropic provider if enabled
  if (userSettings.providers?.anthropic?.enabled) {
    providers.anthropic = customProvider({
      languageModels: {
        "claude-3-sonnet": anthropic("claude-3-sonnet-20240229"),
        "claude-3-opus": anthropic("claude-3-opus-20240229"),
        "claude-3-haiku": anthropic("claude-3-haiku-20240307"),
        "claude-3.5-sonnet": anthropic("claude-3-5-sonnet-20241022"),
      },
      fallbackProvider: anthropic,
    });
  }

  // Add Google provider if enabled
  if (userSettings.providers?.google?.enabled) {
    providers.google = customProvider({
      languageModels: {
        "gemini-pro": google("gemini-pro"),
        "gemini-1.5-pro": google("gemini-1.5-pro"),
      },
      fallbackProvider: google,
    });
  }

  return createProviderRegistry(providers);
}

// export function validateModelAvailability(
//   registry: ProviderRegistryProvider,
//   model: LanguageModel,
// ): boolean {
//   try {
//     // If model is a string, check if it exists in registry
//     if (typeof model === "string") {
//       registry.languageModel(model);
//       return true;
//     }
//     // If model is LanguageModelV2 object, assume it's valid
//     return true;
//   } catch {
//     return false;
//   }
// }

// export function buildModelRegistries(
//   userSettings: UserSettings,
// ): ModelRegistry[] {
//   const registries: ModelRegistry[] = [];

//   if (userSettings.providers?.openai?.enabled) {
//     registries.push({
//       provider: openai,
//       availableModels: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
//       metadata: {
//         displayName: "OpenAI",
//         capabilities: ["text", "tools", "vision"],
//         defaultModel: "gpt-4",
//       },
//     });
//   }

//   if (userSettings.providers?.anthropic?.enabled) {
//     registries.push({
//       provider: anthropic,
//       availableModels: [
//         "claude-3-sonnet",
//         "claude-3-opus",
//         "claude-3-haiku",
//         "claude-3.5-sonnet",
//       ],
//       metadata: {
//         displayName: "Anthropic",
//         capabilities: ["text", "tools", "vision"],
//         defaultModel: "claude-3.5-sonnet",
//       },
//     });
//   }

//   if (userSettings.providers?.google?.enabled) {
//     registries.push({
//       provider: google,
//       availableModels: ["gemini-pro", "gemini-1.5-pro"],
//       metadata: {
//         displayName: "Google",
//         capabilities: ["text", "tools"],
//         defaultModel: "gemini-1.5-pro",
//       },
//     });
//   }

//   return registries;
// }
