// examples/ai-sdk-demo.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

async function testOpenRouterIntegration() {
  console.log('🧪 Testing OpenRouter AI SDK v5 Integration');
  
  // Check if OpenRouter API key is available
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY environment variable is required');
    console.log('Set it with: export OPENROUTER_API_KEY=your_api_key');
    return;
  }
  
  try {
    const openrouter = createOpenRouter({
      apiKey: apiKey,
    });
    
    console.log('✅ OpenRouter provider created successfully');
    
    // Test with a simple completion
    const result = await streamText({
      model: openrouter('openai/gpt-3.5-turbo'),
      prompt: 'Say hello and confirm you are working with OpenRouter!',
    });
    
    console.log('📡 Streaming response:');
    let fullText = '';
    
    for await (const part of result.textStream) {
      process.stdout.write(part);
      fullText += part;
    }
    
    console.log('\n✅ OpenRouter integration test completed successfully!');
    console.log(`📝 Final response: "${fullText}"`);
    
  } catch (error) {
    console.error('❌ Error testing OpenRouter integration:', error);
  }
}

// Run the test
testOpenRouterIntegration().catch(console.error);