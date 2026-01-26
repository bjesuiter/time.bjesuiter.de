---
# time.bjesuiter.de-wu4r
title: Tune dashboard query caching
status: todo
type: task
created_at: 2026-01-26T14:59:10Z
updated_at: 2026-01-26T14:59:10Z
---

Reduce unnecessary refetching on the dashboard by tuning React Query settings for setup/config data.\n\n## Checklist\n- [ ] Set staleTime/refetchOnWindowFocus for setup/config queries\n- [ ] Ensure refresh button still forces refetch as intended\n- [ ] Review query keys to avoid redundant fetches per week/month\n- [ ] Add brief comment/doc to explain caching policy