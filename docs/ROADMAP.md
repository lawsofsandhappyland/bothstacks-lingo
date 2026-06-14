# BothLingo — Production Roadmap

Driven autonomously through the Sonnet (impl) → Haiku (mechanical) → Codex (review) rail,
one feature branch at a time, each gated by `build + test` and an independent Codex pass
before merge to `main`.

## Phase 0 — Foundation (regression safety net)
- [ ] Component tests: PathView, SettingsView
- [ ] Component tests: TutorChat (WebSocket lifecycle), App bootstrap/migration
- [ ] Shared test fixtures + helpers
- [ ] Error boundary + graceful Gemini/Firestore failure states

## Phase 1 — Core product depth
- [ ] Achievements / badges system (definitions + evaluation + view)
- [ ] Streak freeze mechanic (protect a streak on a missed day)
- [ ] Hearts regeneration over time
- [ ] Daily XP goal + progress ring
- [ ] Stats / progress view (history, charts)
- [ ] Spaced-repetition review queue for completed lessons
- [ ] Onboarding flow for first-time users
- [ ] More lessons + lesson categories / difficulty tiers

## Phase 2 — Quality & accessibility
- [ ] Accessibility pass (ARIA, keyboard nav, focus management, reduced motion)
- [ ] Loading / empty / offline states
- [ ] Replace native confirm()/alert() with in-app modals
- [ ] Performance: code-split the >500 kB bundle

## Phase 3 — Mobile
- [ ] PWA: manifest, service worker, installable, offline shell
- [ ] Responsive / touch-target audit
- [ ] Capacitor wrapper → Android APK (adb install for on-device testing)

## Phase 4 — Production hygiene
- [ ] CI: GitHub Actions (lint + typecheck + test + build on PR)
- [ ] SEO / social meta tags
- [ ] Privacy-respecting analytics
- [ ] Deployment pipeline (Firebase Hosting + Cloud Run server)

---
Status is updated as features merge. Items are intentionally open-ended; new ideas get appended.
