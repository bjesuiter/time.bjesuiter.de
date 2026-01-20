---
# time.bjesuiter.de-mu1r
title: Switch to Cloudflare deployment
status: in-progress
type: task
created_at: 2026-01-20T18:58:54Z
updated_at: 2026-01-20T18:58:54Z
---

Railway deployment has issues with migrations and native modules. Switch to Cloudflare Pages/Workers for deployment.

## Checklist
- [ ] Research TanStack Start + Cloudflare deployment
- [ ] Update nitro preset to cloudflare-pages or cloudflare
- [ ] Update/remove Railway-specific config
- [ ] Add wrangler.toml if needed
- [ ] Configure build output for Cloudflare
- [ ] Test build locally
- [ ] Document deployment steps