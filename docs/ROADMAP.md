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
- [x] Spaced-repetition review queue for completed lessons (Repaso: real decay model + closed-loop review sessions)
- [x] Learner level + rank progression (Aprendiz to Leyenda) derived from cumulative XP (`lib/levels.ts`)
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
- [x] Responsive layout (desktop shell collapses to a 5-tab bottom bar + header gear; 44px touch targets)

## Phase 5 — Design facelift (2026-06-14, F1–F10)
Implements the Claude Design handover + `docs/DESIGN-HANDOVER.md`, one feature per rail run.
- [x] F1 design tokens via Tailwind v4 `@theme` + facelift palette
- [x] F2 spaced-repetition data model (`lib/review.ts`)
- [x] F3 responsive desktop shell (sidebar + header + right rail) + Repaso wiring
- [x] F4 cross-lesson Repaso review session (closed loop)
- [x] F5 Camino polish + centered lesson modal (off-screen-CTA P0 fixed)
- [x] F6 answer-first Progreso analytics (mastery, habit heatmap, range switcher; real `activityLog`)
- [x] F7 locked-treasure achievements + progress hints
- [x] F8 consumer Ajustes (dev language stripped, tutor-style control, real toggles)
- [x] F9 Tutor voice orb (idle/listening/speaking) + warm copy
- [x] F10 mobile nav refinement + in-browser verification

## Phase 4 — Production hygiene
- [x] SEO / social meta tags (Open Graph + Twitter card)
- [~] CI: GitHub Actions — written; **blocked**: gh token needs `workflow` scope
      (`gh auth refresh -h github.com -s workflow`)
- [ ] Deployment pipeline (Firebase Hosting + Cloud Run) — **needs**: deploy target +
      `GEMINI_API_KEY` secret + go-ahead (outward-facing / billable)
- [ ] Privacy-respecting analytics (future)

---
Status updated as features merge. 15 product features + a 10-step design facelift
(F1–F10) shipped. Suite now 203 tests across 18 files. Remaining items are either
user-gated (CI scope, deploy approval) or optional content/polish.
