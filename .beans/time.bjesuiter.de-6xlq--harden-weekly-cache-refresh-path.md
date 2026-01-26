---
# time.bjesuiter.de-6xlq
title: Harden weekly cache refresh path
status: todo
type: task
created_at: 2026-01-26T14:58:14Z
updated_at: 2026-01-26T14:58:14Z
---

Improve cache correctness and safety in weekly refresh by scoping to client and using transactions.\n\n## Checklist\n- [ ] Filter cachedDailyProjectSums reads/writes by clientId to avoid cross-client data reuse\n- [ ] Wrap delete+insert of cachedDaily/cachedWeekly in a single transaction\n- [ ] Ensure invalidateCumulativeOvertimeAfterWeek still runs after successful commit\n- [ ] Add logging around refresh/transaction boundaries