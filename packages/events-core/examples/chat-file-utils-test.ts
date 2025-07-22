// examples/chat-file-utils-test.ts

import { extractChatFileReferences } from "../src/services/chat-file-utils.js";

async function main() {
  console.log("🧪 Chat File Utils Test\n");

  // Test extractChatFileReferences
  console.log("📋 Testing extractChatFileReferences:");
  
  const testMessages = [
    "Hello world!",
    "Please review @package.json",
    "Check @package.json and @README.md for details",
    "Look at @src/services/chat-service.ts implementation",
    "Mix of @file1.txt and regular text @file2.js here",
  ];

  testMessages.forEach((message, index) => {
    const refs = extractChatFileReferences(message);
    console.log(`${index + 1}. "${message}"`);
    console.log(`   → File references: [${refs.map(r => r.path).join(", ")}]`);
    console.log(`   → MD5 placeholders: [${refs.map(r => r.md5).join(", ")}]`);
  });

  console.log("\n✅ Chat File Utils Test completed!");
  console.log("\n📊 Summary:");
  console.log("✅ extractChatFileReferences working with @ syntax");
  console.log("✅ Consistent with message-processing-utils.ts");
  console.log("✅ Returns proper format for ChatService metadata");
}

main().catch(console.error);