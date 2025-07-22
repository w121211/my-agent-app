// packages/events-core/src/services/message-processing-utils.ts

export function extractFileReferences(message: string): string[] {
  const fileRefRegex = /@([^\s]+)/g;
  const matches: string[] = [];
  let match;

  while ((match = fileRefRegex.exec(message)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }

  return matches;
}

export function processFileReferences(
  message: string,
  fileContentMap: Map<string, string>,
  projectPath: string
): string {
  const fileRefRegex = /@([^\s]+)/g;
  
  return message.replace(fileRefRegex, (match, filePath) => {
    const content = fileContentMap.get(filePath);
    if (content !== undefined) {
      return `<file data-path="${filePath}">${content}</file>`;
    }
    return match;
  });
}

export function processInputDataPlaceholders(
  message: string,
  inputData: Record<string, any>
): string {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  
  return message.replace(placeholderRegex, (match, key) => {
    const value = inputData[key];
    if (value !== undefined) {
      return String(value);
    }
    return match;
  });
}

export function extractInputDataPlaceholders(message: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(message)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }

  return matches;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export function extractToolCalls(message: string): ToolCall[] {
  return [];
}

export function processToolCalls(message: string): string {
  return message;
}