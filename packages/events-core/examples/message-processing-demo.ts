// examples/message-processing-demo.ts

import { 
  extractFileReferences, 
  processFileReferences,
  processInputDataPlaceholders,
  extractInputDataPlaceholders
} from "../src/services/message-processing-utils.js";

async function main() {
  console.log("🛠️  Message Processing Utils Demo\n");

  // Test extractFileReferences
  console.log("📋 Testing extractFileReferences:");
  const testMessages = [
    "Hello world!",
    "Please review @package.json",
    "Check @package.json and @README.md for details",
    "Look at @src/services/chat-service.ts implementation",
    "Mix of @file1.txt and regular text @file2.js here",
    "No file references here",
    "@", // Edge case
    "@ ", // Edge case
    "email@domain.com should not match", // Should not match emails
  ];

  testMessages.forEach((message, index) => {
    const refs = extractFileReferences(message);
    console.log(`${index + 1}. "${message}"`);
    console.log(`   → File references: [${refs.join(", ")}]`);
  });

  // Test processFileReferences
  console.log("\n🔄 Testing processFileReferences:");
  
  const fileContentMap = new Map([
    ["package.json", '{\n  "name": "my-app",\n  "version": "1.0.0"\n}'],
    ["README.md", "# My Project\n\nThis is a sample project."],
    ["src/utils.ts", "export function helper() {\n  return 'Hello';\n}"],
  ]);

  const processTestMessages = [
    "Please review @package.json",
    "Check @README.md for documentation",
    "Look at @src/utils.ts and @package.json",
    "Non-existent @missing.txt file",
    "Mix @package.json with @missing.txt and @README.md",
  ];

  processTestMessages.forEach((message, index) => {
    const processed = processFileReferences(message, fileContentMap, "/project");
    console.log(`${index + 1}. Original: "${message}"`);
    console.log(`   Processed: "${processed}"`);
    console.log("");
  });

  // Test input data processing
  console.log("🔧 Testing Input Data Processing:");
  
  const inputDataTestMessages = [
    "Hello {{name}}!",
    "The user {{username}} has {{count}} items",
    "No placeholders here",
    "Mix of {{data}} and normal text",
    "{{missing}} placeholder",
  ];

  const inputData = {
    name: "John",
    username: "john_doe",
    count: 42,
    data: "important information",
  };

  inputDataTestMessages.forEach((message, index) => {
    const placeholders = extractInputDataPlaceholders(message);
    const processed = processInputDataPlaceholders(message, inputData);
    
    console.log(`${index + 1}. Original: "${message}"`);
    console.log(`   Placeholders: [${placeholders.join(", ")}]`);
    console.log(`   Processed: "${processed}"`);
    console.log("");
  });

  // Test complex scenarios
  console.log("🚀 Testing Complex Scenarios:");
  
  const complexMessages = [
    "Review @package.json for user {{username}} with {{priority}} priority",
    "Files @file1.txt and @file2.txt for project {{project_name}}",
    "No replacements needed here",
    "@config.json has {{setting_count}} settings for {{env}} environment",
  ];

  const complexInputData = {
    username: "alice",
    priority: "high",
    project_name: "MyApp",
    setting_count: 15,
    env: "production",
  };

  const complexFileMap = new Map([
    ["package.json", '{"name": "myapp", "scripts": {...}}'],
    ["file1.txt", "Content of file 1"],
    ["config.json", '{"env": "prod", "debug": false}'],
  ]);

  complexMessages.forEach((message, index) => {
    console.log(`${index + 1}. Original: "${message}"`);
    
    // First process file references
    const afterFiles = processFileReferences(message, complexFileMap, "/project");
    console.log(`   After file processing: "${afterFiles}"`);
    
    // Then process input data
    const final = processInputDataPlaceholders(afterFiles, complexInputData);
    console.log(`   Final result: "${final}"`);
    console.log("");
  });

  // Performance test
  console.log("⚡ Performance Test:");
  const largeMessage = "Check " + Array.from({length: 100}, (_, i) => `@file${i}.txt`).join(" and ") + " files";
  
  console.time("extractFileReferences-large");
  const largeRefs = extractFileReferences(largeMessage);
  console.timeEnd("extractFileReferences-large");
  console.log(`Extracted ${largeRefs.length} file references from large message`);

  console.time("processFileReferences-large");
  const processedLarge = processFileReferences(largeMessage, new Map(), "/project");
  console.timeEnd("processFileReferences-large");
  console.log(`Processed large message (${processedLarge.length} chars)`);

  console.log("\n✅ Message Processing Utils Demo completed!");
}

// Run the demo
main().catch((error) => {
  console.error("❌ Error running demo:", error);
  process.exit(1);
});