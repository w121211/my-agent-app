// examples/file-references-demo.ts

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../src/server/root-router.js";
import superjson from "superjson";

async function main() {
  console.log("🚀 File References Demo Starting...\n");

  // Create tRPC client
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3333/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  try {
    // Step 1: Get all project folders
    console.log("📁 Getting project folders...");
    const projectFolders = await client.projectFolder.getAllProjectFolders.query();
    console.log(`Found ${projectFolders.length} project folders:`, projectFolders.map(p => p.name));

    if (projectFolders.length === 0) {
      console.log("❌ No project folders found. Please add a project folder first.");
      return;
    }

    const firstProject = projectFolders[0];
    console.log(`\n🎯 Using project: ${firstProject.name} (${firstProject.path})\n`);

    // Step 2: Test file search functionality
    console.log("🔍 Testing file search functionality...");
    
    // Search for all files (empty query)
    console.log("\n📋 Searching for all files:");
    const allFiles = await client.projectFolder.searchFiles.query({
      query: "",
      projectId: firstProject.id,
      limit: 10
    });
    console.log(`Found ${allFiles.length} files:`);
    allFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.relativePath})`);
    });

    // Search for specific file patterns
    const searchQueries = ["chat", "json", "ts", "md"];
    
    for (const query of searchQueries) {
      console.log(`\n🔎 Searching for "${query}":`);
      const results = await client.projectFolder.searchFiles.query({
        query,
        projectId: firstProject.id,
        limit: 5
      });
      
      if (results.length > 0) {
        results.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (score: ${file.score}) - ${file.relativePath}`);
          if (file.highlight) {
            console.log(`     Highlight: ${file.highlight}`);
          }
        });
      } else {
        console.log(`  No files found for "${query}"`);
      }
    }

    // Step 3: Test chat creation and file references
    console.log("\n💬 Testing chat with file references...");
    
    // Create a new chat
    const newChat = await client.chat.createEmptyChat.mutate({
      targetDirectoryAbsolutePath: firstProject.path
    });
    console.log(`Created chat: ${newChat.id}`);

    // Test different file reference scenarios
    const testMessages = [
      "Hello world!", // No file references
      "Please review @package.json", // Single file reference
      "Check @package.json and @README.md for details", // Multiple file references
      "Look at @nonexistent.txt file", // Non-existent file reference
      "Review @src/services/chat-service.ts implementation", // Nested file reference
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n📝 Sending message ${i + 1}: "${message}"`);
      
      try {
        const updatedChat = await client.chat.submitMessage.mutate({
          chatId: newChat.id,
          message: message
        });
        
        const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];
        console.log(`✅ Message sent successfully`);
        console.log(`   Original: ${message}`);
        console.log(`   Stored: ${lastMessage.content}`);
        
        // Show file references if any
        if (lastMessage.metadata?.fileReferences && lastMessage.metadata.fileReferences.length > 0) {
          console.log(`   File references found: ${lastMessage.metadata.fileReferences.length}`);
          lastMessage.metadata.fileReferences.forEach((ref, index) => {
            console.log(`     ${index + 1}. ${ref.path}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Error sending message: ${error}`);
      }
    }

    // Step 4: Test edge cases
    console.log("\n🧪 Testing edge cases...");
    
    const edgeCases = [
      "@", // Just @ symbol
      "@ ", // @ with space
      "@file", // @ without extension
      "@@double.txt", // Double @
      "email@domain.com", // Email (should not be treated as file reference)
      "@very/deep/nested/file.txt", // Deep nested path
    ];

    for (const edgeCase of edgeCases) {
      console.log(`\n🔬 Testing edge case: "${edgeCase}"`);
      try {
        const result = await client.chat.submitMessage.mutate({
          chatId: newChat.id,
          message: `Testing: ${edgeCase}`
        });
        console.log(`✅ Handled successfully`);
      } catch (error) {
        console.log(`❌ Error: ${error}`);
      }
    }

    // Step 5: Demonstrate fuzzy search capabilities
    console.log("\n🎯 Testing fuzzy search capabilities...");
    
    const fuzzyQueries = [
      { query: "pkg", expected: "package.json" },
      { query: "rdme", expected: "README" },
      { query: "cht", expected: "chat" },
      { query: "srv", expected: "service" },
    ];

    for (const { query, expected } of fuzzyQueries) {
      console.log(`\n🔍 Fuzzy search for "${query}" (expecting files with "${expected}"):`);
      const results = await client.projectFolder.searchFiles.query({
        query,
        projectId: firstProject.id,
        limit: 3
      });
      
      if (results.length > 0) {
        results.forEach((file, index) => {
          const matchesExpected = file.name.toLowerCase().includes(expected.toLowerCase()) ||
                                 file.relativePath.toLowerCase().includes(expected.toLowerCase());
          const icon = matchesExpected ? "✅" : "📄";
          console.log(`  ${icon} ${file.name} (score: ${file.score}) - ${file.relativePath}`);
        });
      } else {
        console.log(`  No results found`);
      }
    }

    console.log("\n🎉 File References Demo completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Tested file search in project: ${firstProject.name}`);
    console.log(`- Found ${allFiles.length} total files`);
    console.log(`- Tested ${testMessages.length} chat messages with various file reference patterns`);
    console.log(`- Tested ${edgeCases.length} edge cases`);
    console.log(`- Tested ${fuzzyQueries.length} fuzzy search scenarios`);

  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
  }
}

// Add some helper functions for testing
async function createTestFile(client: any, projectPath: string, fileName: string, content: string) {
  // This would create a test file for demonstration
  // Implementation depends on file creation API
  console.log(`Would create test file: ${fileName} in ${projectPath}`);
}

async function cleanupTestFiles(client: any, projectPath: string) {
  // This would clean up test files
  console.log(`Would cleanup test files in ${projectPath}`);
}

// Run the demo
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});