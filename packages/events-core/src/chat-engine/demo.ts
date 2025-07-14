// packages/events-core/src/chat-engine/demo.ts

import { ChatClient } from './core/chat-client.js';
import { ChatEngineConfig } from './config/config.js';
import type { SystemConfig, ChatConfig } from './config/types.js';
import type { ChatStreamEvent } from './events/types.js';

async function demonstrateChatMode() {
  console.log('\n=== Chat Mode Demo ===');
  
  // Configuration
  const systemConfig: SystemConfig = {
    apiKey: process.env.GEMINI_API_KEY || 'mock-api-key',
    authType: 'api-key',
    debugMode: true,
    enableTools: false,
    maxRetries: 3,
    timeout: 30000,
    workingDir: process.cwd()
  };

  const chatConfig: ChatConfig = {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    mode: 'chat', // Traditional Q&A mode
    systemPrompt: 'You are a helpful assistant. Answer questions concisely.',
    maxSessionTurns: 10
  };

  // Initialize chat engine
  const config = new ChatEngineConfig(systemConfig, chatConfig);
  await config.initialize();
  
  const chatClient = new ChatClient(config);

  // Create session
  const sessionConfig = config.createSessionConfig(
    `chat-demo-${Date.now()}`,
    new AbortController().signal
  );

  try {
    console.log('User: What is TypeScript?');
    
    // Send message and process stream
    for await (const event of chatClient.sendMessageStream(
      'What is TypeScript?',
      chatConfig,
      sessionConfig
    )) {
      handleStreamEvent(event);
    }
    console.log(); // Add newline after streaming

    console.log('\n--- Second message ---');
    console.log('User: Give me an example');
    
    // Second message in same session
    for await (const event of chatClient.sendMessageStream(
      'Give me an example',
      chatConfig,
      sessionConfig
    )) {
      handleStreamEvent(event);
    }
    console.log(); // Add newline after streaming

  } catch (error) {
    console.error('Chat error:', error);
  }
}

async function demonstrateAgentMode() {
  console.log('\n=== Agent Mode Demo ===');
  
  const systemConfig: SystemConfig = {
    apiKey: process.env.GEMINI_API_KEY || 'mock-api-key',
    authType: 'api-key',
    debugMode: true,
    enableTools: false,
    maxRetries: 3,
    timeout: 30000,
    workingDir: process.cwd()
  };

  const chatConfig: ChatConfig = {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    mode: 'agent', // Autonomous agent mode
    systemPrompt: 'You are an autonomous agent. Break down complex tasks into steps and execute them.',
    maxTurns: 5, // Limit recursion
    maxSessionTurns: 20
  };

  const config = new ChatEngineConfig(systemConfig, chatConfig);
  await config.initialize();
  
  const chatClient = new ChatClient(config);

  const sessionConfig = config.createSessionConfig(
    `agent-demo-${Date.now()}`,
    new AbortController().signal
  );

  try {
    console.log('User: Help me understand how to build a web application');
    
    // In agent mode, this might continue recursively
    for await (const event of chatClient.sendMessageStream(
      'Help me understand how to build a web application',
      chatConfig,
      sessionConfig
    )) {
      handleStreamEvent(event);
    }
    console.log(); // Add newline after streaming

  } catch (error) {
    console.error('Agent error:', error);
  }
}

async function demonstrateJsonGeneration() {
  console.log('\n=== JSON Generation Demo ===');
  
  const systemConfig: SystemConfig = {
    apiKey: process.env.GEMINI_API_KEY || 'mock-api-key',
    authType: 'api-key',
    debugMode: false,
    enableTools: false,
    maxRetries: 3,
    timeout: 30000,
    workingDir: process.cwd()
  };

  const chatConfig: ChatConfig = {
    model: 'gemini-2.0-flash',
    temperature: 0,
    mode: 'chat'
  };

  const config = new ChatEngineConfig(systemConfig, chatConfig);
  await config.initialize();
  
  const chatClient = new ChatClient(config);

  const sessionConfig = config.createSessionConfig(
    `json-demo-${Date.now()}`,
    new AbortController().signal
  );

  // Schema for structured output
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      skills: {
        type: 'array',
        items: { type: 'string' }
      },
      experience_years: { type: 'number' }
    },
    required: ['name', 'age', 'skills']
  };

  try {
    console.log('Generating structured data about a software developer...');
    
    const result = await chatClient.generateJson(
      'Generate information about a fictional software developer',
      schema,
      chatConfig,
      sessionConfig
    );

    console.log('Generated JSON:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('JSON generation error:', error);
  }
}

function handleStreamEvent(event: ChatStreamEvent) {
  switch (event.type) {
    case 'content':
      if (!process.stdout.isTTY) {
        console.log('Assistant:', event.value);
      } else {
        process.stdout.write(event.value);
      }
      break;
      
    case 'thought':
      console.log(`\n💭 [Thinking: ${event.value.subject}] ${event.value.description}`);
      break;
      
    case 'tool_call_request':
      console.log(`\n🔧 [Tool Call] ${event.value.name}:`, event.value.args);
      break;
      
    case 'error':
      console.error(`\n❌ [Error] ${event.value.error.message}`);
      if (event.value.isRetryable) {
        console.log('🔄 [This error is retryable]');
      }
      break;
      
    case 'user_cancelled':
      console.log('\n🚫 [Cancelled by user]');
      break;
      
    case 'max_session_turns_reached':
      console.log(`\n🛑 [Max session turns reached: ${event.value.sessionTurns}/${event.value.maxSessionTurns}]`);
      break;
      
    case 'chat_compressed':
      console.log(`\n🗜️  [Chat compressed: ${event.value.originalTokens} -> ${event.value.newTokens} tokens]`);
      break;
  }
}

async function main() {
  console.log('🚀 Chat Engine Demo');
  console.log('==================');
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  No GEMINI_API_KEY found, using mock responses');
  }

  try {
    // Demo different modes
    await demonstrateChatMode();
    await demonstrateAgentMode(); 
    await demonstrateJsonGeneration();
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);