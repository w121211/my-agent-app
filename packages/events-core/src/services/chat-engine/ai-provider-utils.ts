// packages/events-core/src/services/chat-engine/ai-provider-utils.ts

import {
  createProviderRegistry,
  customProvider,
  type ProviderRegistryProvider,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { ChatModelConfig, AvailableModel } from "./types.js";
import type { UserSettings } from "../user-settings-repository.js";

export async function buildProviderRegistry(
  userSettings: UserSettings,
): Promise<ProviderRegistryProvider> {
  const providers: Record<string, any> = {};

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

  return createProviderRegistry(providers, { separator: ":" });
}

export function parseModelConfig(
  modelString: string | ChatModelConfig,
): ChatModelConfig {
  if (typeof modelString === "string") {
    const [provider, modelId] = modelString.split(":");
    if (!provider || !modelId) {
      throw new Error(
        `Invalid model string format: ${modelString}. Expected format: "provider:modelId"`,
      );
    }
    return { provider, modelId };
  }
  return modelString;
}

export function validateModelAvailability(
  registry: ProviderRegistryProvider,
  modelConfig: ChatModelConfig,
): boolean {
  try {
    registry.languageModel(`${modelConfig.provider}:${modelConfig.modelId}`);
    return true;
  } catch {
    return false;
  }
}

export function getAvailableModels(
  userSettings: UserSettings,
): AvailableModel[] {
  const models: AvailableModel[] = [];

  if (userSettings.providers?.openai?.enabled) {
    models.push(
      {
        id: "openai:gpt-4",
        provider: "openai",
        modelId: "gpt-4",
        displayName: "GPT-4",
        capabilities: ["text", "tools"],
      },
      {
        id: "openai:gpt-4-turbo",
        provider: "openai",
        modelId: "gpt-4-turbo",
        displayName: "GPT-4 Turbo",
        capabilities: ["text", "tools", "vision"],
      },
    );
  }

  if (userSettings.providers?.anthropic?.enabled) {
    models.push(
      {
        id: "anthropic:claude-3-sonnet",
        provider: "anthropic",
        modelId: "claude-3-sonnet",
        displayName: "Claude 3 Sonnet",
        capabilities: ["text", "tools", "vision"],
      },
      {
        id: "anthropic:claude-3-opus",
        provider: "anthropic",
        modelId: "claude-3-opus",
        displayName: "Claude 3 Opus",
        capabilities: ["text", "tools", "vision"],
      },
    );
  }

  if (userSettings.providers?.google?.enabled) {
    models.push({
      id: "google:gemini-pro",
      provider: "google",
      modelId: "gemini-pro",
      displayName: "Gemini Pro",
      capabilities: ["text", "tools"],
    });
  }

  return models;
}

// export function getAvailableToolsForModel(
//   toolScheduler: any,
//   modelConfig: ChatModelConfig,
// ): any[] {
//   // Convert internal tool definitions to AI SDK format
//   // This will be implemented based on the tool scheduler's interface
//   return [];
// }
