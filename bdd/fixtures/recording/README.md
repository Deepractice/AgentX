# Recorded Fixtures (VCR Mode)

This directory contains recorded LLM API responses for BDD tests.

## How it works

1. **First run** → Calls real API, records response, saves to `{feature}/*.json`
2. **Subsequent runs** → Plays back from fixtures, no API calls

## Directory structure

```
fixtures/recording/
├── devtools/               # devtools feature fixtures
│   ├── simple-hello.json
│   ├── new-greeting.json
│   ├── force-test.json
│   ├── playback-test.json
│   ├── recorded-fixture.json
│   └── factory-test.json
├── client/                 # future: agentxjs client fixtures
└── server/                 # future: server fixtures
```

## Committing fixtures

These fixtures should be committed to git:

- Enables CI without API keys
- Ensures consistent test behavior
- Speeds up local development

## Re-recording

To re-record a fixture, either:

- Delete the fixture file and run test
- Use `forceRecord: true` option
