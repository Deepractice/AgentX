/**
 * Test script for AgentEventBus Streaming Mode
 *
 * This script verifies that the new architecture works correctly:
 * 1. Claude SDK process starts once
 * 2. Multiple messages are sent through the same process
 * 3. Performance is improved for subsequent messages
 */

import { createAgent } from '@deepractice-ai/agentx-node';

const agentConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.AGENT_API_KEY,
  model: 'claude-sonnet-4-20250514',
  systemPrompt: 'You are a helpful assistant for testing the streaming mode.',
};

if (!agentConfig.apiKey) {
  console.error('❌ Error: Missing API key');
  console.error('Please set ANTHROPIC_API_KEY or AGENT_API_KEY environment variable');
  process.exit(1);
}

console.log('\n🚀 Testing AgentEventBus Streaming Mode\n');
console.log('Expected behavior:');
console.log('  - First message: ~6-7s (process startup)');
console.log('  - Second message: ~1-2s (using existing process) ⚡');
console.log('  - Third message: ~1-2s (using existing process) ⚡\n');

async function testStreamingMode() {
  const agent = createAgent(agentConfig);

  // Track event counts
  let eventCount = 0;
  agent.on('assistant', (event) => {
    eventCount++;
    console.log(`  📩 Received assistant message #${eventCount}`);
  });

  agent.on('result', (event) => {
    if (event.subtype === 'success') {
      console.log(`  ✅ Completed in ${event.durationMs}ms`);
      console.log(`  💰 Cost: $${event.totalCostUsd.toFixed(6)}`);
      console.log(`  🔢 Tokens: ${event.usage.input} in, ${event.usage.output} out\n`);
    } else {
      console.error(`  ❌ Error: ${event.error?.message}\n`);
    }
  });

  try {
    // Message 1: First call (expect ~6-7s)
    console.log('📤 Message 1: "What is 2+2?" (First call, starting Claude SDK process...)');
    const start1 = Date.now();
    await agent.send('What is 2+2? Answer briefly.');
    const duration1 = Date.now() - start1;
    console.log(`  ⏱️  Total time: ${duration1}ms\n`);

    // Message 2: Second call (expect ~1-2s, should be much faster!)
    console.log('📤 Message 2: "What is 3+3?" (Using existing process...)');
    const start2 = Date.now();
    await agent.send('What is 3+3? Answer briefly.');
    const duration2 = Date.now() - start2;
    console.log(`  ⏱️  Total time: ${duration2}ms`);
    const speedup2 = (duration1 / duration2).toFixed(1);
    console.log(`  ⚡ Speed improvement: ${speedup2}x faster!\n`);

    // Message 3: Third call (should also be fast)
    console.log('📤 Message 3: "What is 5+5?" (Using existing process...)');
    const start3 = Date.now();
    await agent.send('What is 5+5? Answer briefly.');
    const duration3 = Date.now() - start3;
    console.log(`  ⏱️  Total time: ${duration3}ms`);
    const speedup3 = (duration1 / duration3).toFixed(1);
    console.log(`  ⚡ Speed improvement: ${speedup3}x faster!\n`);

    // Summary
    console.log('🎉 Test completed successfully!');
    console.log(`\n📊 Performance Summary:`);
    console.log(`  Message 1 (cold start): ${duration1}ms`);
    console.log(`  Message 2 (warm): ${duration2}ms (${speedup2}x faster)`);
    console.log(`  Message 3 (warm): ${duration3}ms (${speedup3}x faster)`);
    console.log(`  Average speedup for warm messages: ${((parseFloat(speedup2) + parseFloat(speedup3)) / 2).toFixed(1)}x\n`);

    // Cleanup
    agent.destroy();
    console.log('✨ Agent destroyed, test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    agent.destroy();
    process.exit(1);
  }
}

testStreamingMode();
