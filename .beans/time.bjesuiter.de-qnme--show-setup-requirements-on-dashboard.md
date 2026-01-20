---
# time.bjesuiter.de-qnme
title: Show setup requirements on dashboard
status: completed
type: feature
priority: normal
created_at: 2026-01-20T19:34:09Z
updated_at: 2026-01-20T19:58:34Z
---

If the application requires setup (e.g., missing environment variables, unconfigured services, or initial configuration), display this information prominently on the dashboard site so users know what steps they need to take.

## Acceptance Criteria
- [x] Detect when setup is incomplete (missing env vars, no admin user, etc.)
- [x] Display a clear setup status/checklist on the dashboard
- [x] Guide users through required setup steps
- [x] Hide setup prompts once configuration is complete

## Implementation Checklist
- [x] Enhance `checkClockifySetup` to return detailed status (API key, workspace, client, tracked projects)
- [x] Create `SetupChecklist` component showing progress with links to settings
- [x] Update dashboard to show checklist when setup is incomplete instead of redirect
- [x] Run lsp_diagnostics and verify on browser