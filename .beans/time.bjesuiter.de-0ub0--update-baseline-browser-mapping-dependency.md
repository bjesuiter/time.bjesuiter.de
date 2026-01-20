---
# time.bjesuiter.de-0ub0
title: Update baseline-browser-mapping dependency
status: todo
type: task
priority: low
created_at: 2026-01-20T22:13:31Z
updated_at: 2026-01-20T22:13:31Z
---

Console warning:

```
[baseline-browser-mapping] The data in this module is over two months old. To ensure accurate Baseline data, please update: npm i baseline-browser-mapping@latest -D
```

## Fix
Run: `bun add -D baseline-browser-mapping@latest`

## Checklist
- [ ] Update baseline-browser-mapping to latest version
- [ ] Verify warning is gone