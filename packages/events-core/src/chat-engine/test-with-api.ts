// packages/events-core/src/chat-engine/test-with-api.ts

import { ChatClient } from './core/chat-client.js';
import { ChatEngineConfig } from './config/config.js';
import type { SystemConfig, ChatConfig } from './config/types.js';

async function testWithRealAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No GEMINI_API_KEY found. Set it and run again to test with real Google AI.');
    console.log('Example: GEMINI_API_KEY=your_key_here pnpm test-with-api');
    return;
  }

  console.log('🧪 Testing with real Google Gemini API...');

  const systemConfig: SystemConfig = {
    apiKey,
    authType: 'api-key',
    debugMode: false,
    enableTools: false,
    maxRetries: 3,
    timeout: 30000,
    workingDir: process.cwd()
  };

  const chatConfig: ChatConfig = {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    mode: 'chat',
    systemPrompt: 'You are a helpful assistant. Be concise.',
  };

  try {
    const config = new ChatEngineConfig(systemConfig, chatConfig);
    await config.initialize();
    
    const chatClient = new ChatClient(config);
    const sessionConfig = config.createSessionConfig(
      `test-${Date.now()}`,
      new AbortController().signal
    );

    console.log('User: What is the capital of France?');
    console.log('Assistant: ', { flush: true });

    for await (const event of chatClient.sendMessageStream(
      'What is the capital of France?',
      chatConfig,
      sessionConfig
    )) {
      if (event.type === 'content') {
        process.stdout.write(event.value);
      }
    }
    
    console.log('\n\n✅ Real API test successful!');

  } catch (error) {
    console.error('❌ Real API test failed:', error);
  }
}

testWithRealAPI().catch(console.error);