// packages/events-core/examples/tool-registry-demo.ts

import { gateway } from "@ai-sdk/gateway";
import { streamText, tool } from "ai";
import { z } from "zod";
import { Logger, type ILogObj } from "tslog";
import { EventBus } from "../src/event-bus.js";
import { ToolRegistry } from "../src/services/tool-call/tool-registry.js";

const logger = new Logger<ILogObj>();
const eventBus = new EventBus({
  environment: "server",
  logger,
});

async function main() {
  logger.info("Starting tool registry example");

  logger.debug(process.env);

  // Create tool registry
  const toolRegistry = new ToolRegistry(eventBus, logger);

  // Register a simple calculator tool with confirmation logic
  const calculatorTool = tool({
    description: "Perform basic arithmetic calculations",
    inputSchema: z.object({
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("The arithmetic operation to perform"),
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
    execute: async ({ operation, a, b }) => {
      logger.info("Calculator tool executing", { operation, a, b });

      let result: number;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            throw new Error("Division by zero is not allowed");
          }
          result = a / b;
          break;
      }

      return {
        operation,
        operands: [a, b],
        result,
        calculation: `${a} ${operation} ${b} = ${result}`,
      };
    },
  });

  // Confirmation logic that asks for confirmation for certain operations
  const confirmationLogic = async (input: {
    operation: string;
    a: number;
    b: number;
  }): Promise<boolean> => {
    const { operation, a, b } = input;

    // Require confirmation for division operations or large numbers
    if (operation === "divide" || Math.abs(a) > 1000 || Math.abs(b) > 1000) {
      logger.info("Confirmation required for operation", { operation, a, b });
      // In a real scenario, this would prompt the user
      // For demo purposes, we'll simulate user approval
      return true;
    }

    return false; // No confirmation needed
  };

  // Register the tool with confirmation logic
  toolRegistry.registerTool("calculator", calculatorTool, {
    source: "built-in",
    confirmationLogic,
  });

  // Get the tool set from registry
  const tools = toolRegistry.getToolSet(["calculator"]);

  logger.info("Using streamText with OpenAI to call the calculator tool");

  // Use streamText with the registered tool
  const result = streamText({
    model: gateway("openai/gpt-4o"),
    tools,
    // stopWhen: stepCountIs(5),
    prompt:
      "Calculate 15 multiplied by 8, and then divide the result by 3. Show me the step-by-step calculation.",
  });

  logger.info("Starting to process stream results");

  // Process the stream
  for await (const part of result.fullStream) {
    // process.stdout.write(part);
    logger.info("Received stream part:", part);
  }

  // Wait for the result to complete and get steps
  const finalSteps = await result.steps;
  const finalText = await result.text;

  logger.info("Stream completed. Final result:", {
    text: finalText,
    stepCount: finalSteps.length ?? 0,
  });

  // Print detailed step results
  logger.info("=== STREAM TEXT GENERATED STEP RESULTS ===");

  if (finalSteps.length > 0) {
    finalSteps.forEach((step, index) => {
      logger.info(`--- Step ${index + 1} ---`);
      logger.info("Text:", step.text);

      step.response.messages.forEach((message, messageIndex) => {
        logger.info(`Message ${messageIndex + 1}:`, message);
      });

      logger.info("Content:");
      step.content.forEach((content, contentIndex) => {
        logger.info(`Content ${contentIndex + 1}:`, content);
      });

      logger.info("Tool Calls:");
      step.toolCalls.forEach((toolCall, callIndex) => {
        logger.info(`Tool Call ${callIndex + 1}:`, toolCall);
      });

      logger.info("Tool Results:");
      step.toolResults.forEach((toolResult, resultIndex) => {
        logger.info(`Tool Result ${resultIndex + 1}:`, toolResult);
      });

      logger.info("Finish Reason:", step.finishReason);
      logger.info("Usage:", step.usage);
    });

    // Extract all tool calls from all steps
    const allToolCalls = finalSteps.flatMap((step) => step.toolCalls || []);
    logger.info("All Tool Calls:");
    allToolCalls.forEach((toolCall, index) => {
      logger.info(`${index + 1}. ${toolCall.toolName}:`, toolCall.input);
    });
  } else {
    logger.info("No steps found in the result");
  }

  logger.info("=== FINAL SUMMARY ===");
  logger.info("Total Messages:", (await result.response).messages);
  logger.info("Total Steps:", finalSteps?.length ?? 0);
  logger.info("Final Text:", finalText);
  logger.info("Total Usage:", await result.usage);

  logger.info("Tool registry example completed successfully");

  logger.info("result.toolCalls:", await result.toolCalls);
  logger.info("result.toolResults:", await result.toolResults);
}

// Run the example
main().catch((error) => {
  logger.error("Example failed:", error);
  process.exit(1);
});
