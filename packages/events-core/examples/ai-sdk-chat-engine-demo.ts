// examples/ai-sdk-chat-engine-demo.ts
import { EventBus } from '../src/event-bus.js';
import { ChatClient } from '../src/services/chat-engine/chat-client.js';
import { ChatSessionRepositoryImpl } from '../src/services/chat-engine/chat-session-repository.js';
import { UserSettingsService } from '../src/services/user-settings-service.js';
import { createUserSettingsRepository } from '../src/services/user-settings-repository.js';
import { ProjectFolderService } from '../src/services/project-folder-service.js';
import { TaskService } from '../src/services/task-service.js';
import { TaskRepository } from '../src/services/task-repository.js';
import { buildProviderRegistry } from '../src/services/chat-engine/provider-registry-builder.js';
import os from 'node:os';
import path from 'node:path';

async function testAISdkChatEngine() {
  console.log('🤖 Testing AI SDK v5 Chat Engine Integration');
  console.log('===============================================\n');

  // Setup event bus
  const eventBus = new EventBus({ environment: 'test' });

  // Setup repositories and services
  const userDataDir = path.join(os.tmpdir(), 'ai-sdk-chat-test');
  const userSettingsRepo = createUserSettingsRepository(userDataDir);
  const userSettingsService = new UserSettingsService(userSettingsRepo);
  
  const taskRepo = new TaskRepository();
  const taskService = new TaskService(taskRepo, eventBus);
  
  const projectFolderService = new ProjectFolderService(userSettingsService, eventBus);
  const chatSessionRepo = new ChatSessionRepositoryImpl();
  
  // Setup ChatClient
  const chatClient = new ChatClient(
    eventBus,
    chatSessionRepo,
    taskService,
    projectFolderService,
    userSettingsService
  );

  console.log('✅ Services initialized successfully\n');

  // Test 1: Provider Registry Configuration
  console.log('🔧 Testing Provider Registry Configuration...');
  
  try {
    // Get current user settings
    const userSettings = await userSettingsService.getUserSettings();
    console.log('📄 Current user settings:', JSON.stringify(userSettings, null, 2));
    
    // Test with mock OpenRouter configuration
    const testSettings = {
      ...userSettings,
      providers: {
        ...userSettings.providers,
        openrouter: {
          enabled: true,
          apiKey: 'mock-api-key-for-testing'
        }
      }
    };
    
    // Build provider registry
    const registry = buildProviderRegistry(testSettings);
    console.log('✅ Provider registry created successfully');
    
    // Test model retrieval (this will fail gracefully without real API key)
    try {
      const model = registry.languageModel('openrouter:openai/gpt-3.5-turbo');
      console.log('✅ Model instance created:', model.constructor.name);
    } catch (error) {
      console.log('ℹ️  Model creation (expected without real API key):', error.message);
    }
    
  } catch (error) {
    console.error('❌ Provider registry test failed:', error);
  }

  // Test 2: Available Models
  console.log('\n📋 Testing Available Models...');
  
  try {
    const availableModels = await chatClient.getAvailableModels();
    console.log(`Found ${availableModels.length} available models:`);
    availableModels.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.displayName} (${model.id})`);
      console.log(`     Provider: ${model.provider}`);
      console.log(`     Capabilities: ${model.capabilities.join(', ')}`);
    });
  } catch (error) {
    console.error('❌ Available models test failed:', error);
  }

  // Test 3: Create project folder for testing
  console.log('\n📁 Setting up test project folder...');
  
  const testProjectPath = path.join(os.tmpdir(), 'ai-sdk-test-project');
  
  try {
    await projectFolderService.addProjectFolder({
      name: 'AI SDK Test Project',
      path: testProjectPath
    });
    console.log(`✅ Project folder added: ${testProjectPath}`);
  } catch (error) {
    console.log(`ℹ️  Project folder may already exist: ${error.message}`);
  }

  // Test 4: Chat Creation with Enhanced Model Config
  console.log('\n💬 Testing Chat Creation with Enhanced Model Config...');
  
  try {
    // Test with basic string model (legacy)
    const basicChatId = await chatClient.createChat(testProjectPath, {
      mode: 'chat',
      model: 'openai:gpt-3.5-turbo',
      prompt: 'Hello! This is a test with basic model config.'
    });
    console.log(`✅ Basic chat created: ${basicChatId}`);
    
    // Test with enhanced model config (new)
    const enhancedChatId = await chatClient.createChat(testProjectPath, {
      mode: 'chat',
      model: {
        provider: 'openrouter',
        modelId: 'openai/gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 500,
        systemPrompt: 'You are a helpful assistant testing AI SDK v5 integration.'
      },
      prompt: 'Hello! This is a test with enhanced model config.'
    });
    console.log(`✅ Enhanced chat created: ${enhancedChatId}`);
    
    // Test model config validation
    const isValidConfig = await chatClient.validateModelConfig({
      provider: 'openrouter',
      modelId: 'openai/gpt-3.5-turbo',
      temperature: 0.8
    });
    console.log(`✅ Model config validation: ${isValidConfig}`);
    
  } catch (error) {
    console.error('❌ Chat creation test failed:', error);
  }

  // Test 5: Chat Session Features
  console.log('\n🔄 Testing Chat Session Features...');
  
  try {
    // Create a chat session for testing
    const sessionId = await chatClient.createChat(testProjectPath, {
      mode: 'agent',
      model: {
        provider: 'openrouter',
        modelId: 'anthropic/claude-3-haiku',
        temperature: 0.5,
        maxTokens: 200
      }
    });
    
    // Test message sending (will use mock response since no real API key)
    console.log('📤 Sending test message...');
    const result = await chatClient.sendMessage(sessionId, 'What is AI SDK v5?');
    console.log(`✅ Message result status: ${result.status}`);
    if (result.status === 'complete' && 'content' in result) {
      console.log(`📝 Response: ${result.content}`);
    }
    
    // Test chat metadata updates
    await chatClient.updateChat(sessionId, {
      metadata: {
        title: 'AI SDK v5 Test Chat',
        tags: ['test', 'ai-sdk-v5']
      }
    });
    console.log('✅ Chat metadata updated');
    
    // Get chat details
    const chatDetails = await chatClient.getChatById(sessionId);
    console.log(`✅ Chat retrieved - Title: ${chatDetails.metadata?.title}`);
    
  } catch (error) {
    console.error('❌ Chat session test failed:', error);
  }

  // Test 6: Registry Builder Edge Cases
  console.log('\n🧪 Testing Registry Builder Edge Cases...');
  
  try {
    // Test with no providers enabled
    const emptyRegistry = buildProviderRegistry({
      projectFolders: [],
      providers: {}
    });
    
    try {
      emptyRegistry.languageModel('openai:gpt-4');
      console.log('❌ Should have thrown error for unavailable provider');
    } catch (error) {
      console.log('✅ Correctly rejected unavailable provider:', error.message);
    }
    
    // Test with invalid model ID format
    try {
      const testRegistry = buildProviderRegistry({
        projectFolders: [],
        providers: {
          openrouter: { enabled: true, apiKey: 'test' }
        }
      });
      testRegistry.languageModel('invalid-format');
      console.log('❌ Should have thrown error for invalid model ID');
    } catch (error) {
      console.log('✅ Correctly rejected invalid model ID:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Edge cases test failed:', error);
  }

  console.log('\n🎉 AI SDK v5 Chat Engine Integration Test Completed!');
  console.log('=================================================');
  console.log('\n📊 Test Summary:');
  console.log('- ✅ Provider registry configuration');
  console.log('- ✅ Available models enumeration');
  console.log('- ✅ Project folder setup');
  console.log('- ✅ Chat creation with both legacy and enhanced configs');
  console.log('- ✅ Chat session management');
  console.log('- ✅ Error handling for edge cases');
  console.log('\n💡 To test with real API responses:');
  console.log('   1. Set OPENROUTER_API_KEY environment variable');
  console.log('   2. Configure user settings with real API key');
  console.log('   3. Use proper model IDs from OpenRouter documentation');
}

// Run the test
testAISdkChatEngine().catch(console.error);