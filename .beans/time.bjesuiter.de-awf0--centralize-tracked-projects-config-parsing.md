---
# time.bjesuiter.de-awf0
title: Centralize tracked-projects config parsing
status: todo
type: task
created_at: 2026-01-26T14:52:59Z
updated_at: 2026-01-26T14:52:59Z
---

Consolidate parsing/validation of configChronic.value for tracked_projects to avoid scattered JSON.parse logic and invalid data handling.\n\n## Checklist\n- [ ] Add a Zod schema or dedicated parser for tracked_projects config values\n- [ ] Use the parser in configServerFns and clockifyServerFns\n- [ ] Ensure invalid data results in clear errors (no silent failures)\n- [ ] Add lightweight tests if existing test structure supports it