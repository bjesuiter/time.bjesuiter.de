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

# Specific test file (for example)
bun test tests/integration/clockify-api/validateApiKey.test.ts

# Watch mode
bun test --watch tests/integration
```

## Coverage

Tests all Clockify API functions with real API calls:

- API key validation
- Workspaces, clients, projects
- Summary and detailed reports

### Clockify API Functions

- ✅ `validateApiKey` - API key validation and user info
- ✅ `getWorkspaces` - Workspace listing
- ✅ `getClients` - Client listing per workspace
- [ ] `getProjects` - Project listing (with optional client filter)
- [ ] `getSummaryReport` - Summary reports (grouped by date/project)
- [ ] `getDetailedReport` - Detailed reports (individual time entries)

## Best Practices

- Real API only (no mocking)
- Read-only operations
- Independent tests
- Clear test names
- **Streamlined testing**: API key validation only tested in `validateApiKey`
  (not repeated for each function)

## Troubleshooting

**401 errors**: Check API key validity and permissions **404 errors**: Verify
workspace ID exists **Rate limiting**: Run tests less frequently
