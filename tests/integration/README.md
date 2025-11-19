# Integration Tests

Tests Clockify API client functions against the real API.

## Setup

Create `.env.test.local` (add to `.gitignore`):

```bash
CLOCKIFY_TEST_API_KEY=your_test_api_key
CLOCKIFY_TEST_WORKSPACE_ID=your_test_workspace_id
```

Use a test workspace only - never production data.

## Running Tests

```bash
# All integration tests
bun test tests/integration

# Specific test file
bun test tests/integration/clockify-api.test.ts

# Watch mode
bun test --watch tests/integration
```

## Coverage

Tests all Clockify API functions with real API calls:
- API key validation
- Workspaces, clients, projects
- Summary and detailed reports

## Best Practices

- Real API only (no mocking)
- Read-only operations
- Independent tests
- Clear test names

## Troubleshooting

**401 errors**: Check API key validity and permissions
**404 errors**: Verify workspace ID exists
**Rate limiting**: Run tests less frequently
