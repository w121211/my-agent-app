// examples/file-search-simple-test.ts

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../src/server/root-router.js";
import superjson from "superjson";

async function quickTest() {
  console.log("🔍 Quick File Search Test\n");

  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3333/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  try {
    // Get project folders
    const projects = await client.projectFolder.getAllProjectFolders.query();
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      console.log("❌ No projects found");
      return;
    }

    const project = projects[0];
    console.log(`Using project: ${project.name}`);

    // Test basic search
    const allFiles = await client.projectFolder.searchFiles.query({
      query: "",
      projectId: project.id,
      limit: 5
    });
    
    console.log(`\n📁 Found ${allFiles.length} files:`);
    allFiles.forEach(file => {
      console.log(`  - ${file.name} (${file.relativePath})`);
    });

    // Test fuzzy search
    const searchResults = await client.projectFolder.searchFiles.query({
      query: "json",
      projectId: project.id,
      limit: 3
    });
    
    console.log(`\n🔎 Search for "json" found ${searchResults.length} files:`);
    searchResults.forEach(file => {
      console.log(`  - ${file.name} (score: ${file.score})`);
    });

    console.log("\n✅ File search test completed!");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

quickTest();