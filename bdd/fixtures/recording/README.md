# Recorded Fixtures (VCR Mode)

This directory contains recorded LLM API responses for BDD tests.

**All BDD tests MUST use VCR recording.** No test should hit the real LLM API in CI. If a test doesn't have a fixture, the first run records it; subsequent runs play back.

## How it works

1. **First run** → Calls real API, records response, saves to `{scenario-name}.json`
2. **Subsequent runs** → Plays back from fixtures, no API calls

## Directory structure

```
fixtures/recording/
├── agentx/                 # agentx feature fixtures (remote mode)
├── journey/                # journey test fixtures (local mode)
├── mono-driver/            # mono-driver feature fixtures
└── devtools/               # devtools feature fixtures
```

## Committing fixtures

These fixtures **must** be committed to git:

- Enables CI without API keys
- Ensures consistent test behavior
- Speeds up local development

## Re-recording

To re-record a fixture, either:

- Delete the fixture file and run test
- Use `forceRecord: true` option

## Adding VCR to new tests

Both remote mode (test server) and local mode (`createAgentX`) support VCR via `createVcrCreateDriver`. Local mode injects VCR through the `createDriver` option:

```typescript
const vcrCreateDriver = createVcrCreateDriver({ fixturesDir, ... });
const agentx = await createAgentX({ createDriver: vcrCreateDriver });
```
