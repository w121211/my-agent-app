/**
 * Checks if a file is a chat file based on the naming convention
 * For MVP, chat files follow the pattern: chatN.json (where N is a number)
 */
export function isChatFile(filePath: string): boolean {
  return /(?:^|\/)chat\d+\.json$/.test(filePath.toLowerCase());
}
