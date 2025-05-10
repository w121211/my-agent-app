// File path: packages/events-core/src/file-helpers.ts

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Creates a directory if it doesn't exist
 */
export async function createDirectory(dirPath: string): Promise<string> {
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Writes data to a JSON file with atomic write guarantees
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T
): Promise<void> {
  // Create a temporary file path with timestamp for uniqueness
  const tempFilePath = `${filePath}.${Date.now()}.tmp`;

  // Write data to the temporary file first
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, "utf8");

  // Atomically rename the temporary file to the target file
  await fs.rename(tempFilePath, filePath);
}

/**
 * Reads and parses a JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

/**
 * Checks if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists contents of a directory
 */
export async function listDirectory(
  dirPath: string
): Promise<{ name: string; isDirectory: boolean }[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }));
}
