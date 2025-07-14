// packages/events-core/src/chat-engine/core/next-speaker-checker.ts

import type { Content } from '../config/types.js';
import type { ChatSession } from './chat-session.js';
import type { ChatEngineConfig } from '../config/config.js';

export interface NextSpeakerResponse {
  reasoning: string;
  next_speaker: 'user' | 'model';
}

export async function checkNextSpeakerWithAI(
  chatSession: ChatSession,
  config: ChatEngineConfig,
  abortSignal: AbortSignal
): Promise<NextSpeakerResponse | null> {
  
  const curatedHistory = chatSession.getHistory(true);

  if (curatedHistory.length === 0) {
    return null;
  }

  const lastMessage = curatedHistory[curatedHistory.length - 1];
  if (!lastMessage || lastMessage.role !== 'model') {
    return null;
  }

  if (isFunctionResponse(lastMessage)) {
    return {
      reasoning: 'The last message was a function response, so the model should speak next.',
      next_speaker: 'model',
    };
  }

  if (isEmptyModelResponse(lastMessage)) {
    return {
      reasoning: 'The last message was empty, model should speak next.',
      next_speaker: 'model',
    };
  }

  const analysisPrompt = buildNextSpeakerPrompt();
  const contents = [
    ...curatedHistory,
    { role: 'user', parts: [{ text: analysisPrompt }] }
  ];

  try {
    const response = await config.getContentGenerator().generateJson(
      contents,
      NEXT_SPEAKER_SCHEMA,
      abortSignal
    );

    if (isValidNextSpeakerResponse(response)) {
      return response as NextSpeakerResponse;
    }

    return null;

  } catch (error) {
    console.warn('Failed to analyze next speaker:', error);
    return null;
  }
}

function buildNextSpeakerPrompt(): string {
  return `Analyze *only* the content and structure of your immediately preceding response (your last turn in the conversation history). Based *strictly* on that response, determine who should logically speak next: the 'user' or the 'model' (you).

**Decision Rules (apply in order):**
1. **Model Continues:** If your last response explicitly states an immediate next action *you* intend to take (e.g., "Next, I will...", "Now I'll process...", "Moving on to analyze...", indicates an intended tool call that didn't execute), OR if the response seems clearly incomplete (cut off mid-thought without a natural conclusion), then the **'model'** should speak next.
2. **Question to User:** If your last response ends with a direct question specifically addressed *to the user*, then the **'user'** should speak next.
3. **Waiting for User:** If your last response completed a thought, statement, or task *and* does not meet the criteria for Rule 1 (Model Continues) or Rule 2 (Question to User), it implies a pause expecting user input or reaction. In this case, the **'user'** should speak next.

**Output Format:**
Respond *only* in JSON format according to the following schema. Do not include any text outside the JSON structure.`;
}

function isFunctionResponse(content: Content): boolean {
  return !!(
    content.role === 'user' &&
    content.parts?.some(part => part.functionResponse)
  );
}

function isEmptyModelResponse(content: Content): boolean {
  return !!(
    content.role === 'model' &&
    (!content.parts || content.parts.length === 0)
  );
}

function isValidNextSpeakerResponse(response: unknown): boolean {
  return !!(
    response &&
    typeof response === 'object' &&
    'next_speaker' in response &&
    'reasoning' in response &&
    ['user', 'model'].includes((response as any).next_speaker)
  );
}

const NEXT_SPEAKER_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: {
      type: 'string',
      description: "Brief explanation justifying the 'next_speaker' choice based *strictly* on the applicable rule and the content/structure of the preceding turn.",
    },
    next_speaker: {
      type: 'string',
      enum: ['user', 'model'],
      description: 'Who should speak next based *only* on the preceding turn and the decision rules',
    },
  },
  required: ['reasoning', 'next_speaker'],
};