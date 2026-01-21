1. Run all E2E tests with `bun run test:e2e`
2. When a test fails, run this specific test again with `--workers=1` to isolate:
   ```bash
   bun e2e <testfile> --workers=1
   ```
   Example: `bun e2e validation --workers=1` runs tests matching "validation".
3. Analyze the error and fix the issue. Ask the user for clarification or help
   if needed. Run this one test again as often as needed until it passes or
   until you're stuck and need user input.
4. When the test passes, run all E2E tests again with `bun run test:e2e` to make
   sure no other tests are failing.
5. If other tests are failing, repeat steps 2-4 for those tests until they pass
   or until you're stuck and need user input.
