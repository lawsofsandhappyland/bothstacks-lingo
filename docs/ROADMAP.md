# BothLingo — Production Roadmap

Driven autonomously through the Sonnet (impl) → Haiku (mechanical) → Codex (review) rail,
one feature branch at a time, each gated by `lint + build + test` and an independent Codex
pass before merge to `main`. Suite: 122 tests across 13 files.

## Phase 0 — Foundation (regression safety net)
- [x] Component tests: PathView, SettingsView
- [x] Component tests: TutorChat (WebSocket lifecycle), App bootstrap/migration
- [x] Error boundary + graceful fallback
- [ ] Shared test fixtures + helpers (optional; tests are self-contained)

## Phase 1 — Core product depth
- [x] Achievements / badges system (definitions + evaluation + Logros view)
- [x] Streak freeze mechanic (one freeze per missed day, earned every 7 days)
- [x] Hearts regeneration over time (1 / 4h, persisted anchor)
- [x] Daily XP goal + progress bar
- [x] Stats / progress dashboard (Progreso)
- [x] Onboarding flow for first-time users
- [ ] Spaced-repetition review queue for completed lessons (future)
- [ ] More lessons + categories / difficulty tiers (content work)

## Phase 2 — Quality & accessibility
- [x] Replace native confirm()/alert() with in-app ConfirmDialog
- [x] Code-split the route views (React.lazy)
- [x] Sound mute toggle + accessible nav labels
- [x] Offline indicator + prefers-reduced-motion
- [ ] Deeper a11y pass (keyboard focus management on view change) (future)

## Phase 3 — Mobile
- [x] PWA: manifest, offline service worker, installable
- [x] Capacitor wrapper → Android APK (installed + running on device)
- [ ] Responsive / touch-target audit (one nav-overflow fix landed; broader pass future)

## Phase 4 — Production hygiene
- [x] SEO / social meta tags (Open Graph + Twitter card)
- [~] CI: GitHub Actions — written; **blocked**: gh token needs `workflow` scope
      (`gh auth refresh -h github.com -s workflow`)
- [ ] Deployment pipeline (Firebase Hosting + Cloud Run) — **needs**: deploy target +
      `GEMINI_API_KEY` secret + go-ahead (outward-facing / billable)
- [ ] Privacy-respecting analytics (future)

---
Status updated as features merge. 15 features shipped across 23 commits.
Remaining items are either user-gated (CI scope, deploy approval) or optional
content/polish. New ideas get appended.
