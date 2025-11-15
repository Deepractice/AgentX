# Manual Tests for AgentX Node

This directory contains manual test scripts for testing the AgentX Node package.

## Streaming Mode Performance Test

**File**: `test-streaming-mode.mjs`

**Purpose**: Verify that the AgentEventBus streaming mode architecture works correctly and provides the expected performance improvements.

**Expected Results**:
- First message: ~6-7s (Claude SDK process startup)
- Second message: ~1-2s (3-5x faster, using existing process)
- Third message: ~1-2s (3-5x faster, using existing process)

### Prerequisites

1. Set up environment variables in `env/.env.local`:
   ```bash
   ANTHROPIC_API_KEY=your_api_key_here
   ```

2. Build the packages:
   ```bash
   pnpm build
   ```

### Run the Test

From the repository root:

```bash
node packages/agentx-node/tests/manual/test-streaming-mode.mjs
```

### What to Look For

✅ **Success indicators**:
- First message takes ~6-7 seconds
- Subsequent messages take ~1-2 seconds
- Speed improvement of 3-5x for warm messages
- All messages receive responses successfully
- No errors in the output

❌ **Failure indicators**:
- All messages take 6-7 seconds (streaming mode not working)
- Errors about missing AgentEventBus or connect() method
- Process crashes or hangs

### Troubleshooting

**Issue**: `Error: Cannot find module '@deepractice-ai/agentx-node'`
- **Solution**: Run `pnpm build` from the repository root

**Issue**: `Error: Missing API key`
- **Solution**: Set `ANTHROPIC_API_KEY` in `env/.env.local`

**Issue**: All messages take 6-7 seconds
- **Solution**: Check that ClaudeProvider is using the new `connect()` method and AgentEventBus
