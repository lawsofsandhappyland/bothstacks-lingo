# BothLingo — Design Polish Handover

**Live app:** https://bothlingo-831930974109.australia-southeast1.run.app
**Stack:** React 19 + Vite, Tailwind v4, TypeScript. Dark "retro arcade" theme.
**Aesthetic intent:** retro/pixel arcade, dark canvas, neon accents, a pixel penguin mascot ("El Pingüino"). The *intent* is good; the *execution* reads amateurish in the spots below.

**Design tokens** (CSS vars in `src/index.css`): `--color-void` (near-black bg), `--color-deep-violet` (card bg), `--color-flame-orange`, `--color-fuchsia-accent`, `--color-electric-blue`, `--color-ghost-white`, `--color-slate-grey`. Heavy use of `.ui-label` (uppercase mono, letter-spaced) and `.retro-card`, `.pill-button`, `.nav-pill`.

This is a **functional, fully-working** app (lessons, achievements, streak/freezes, hearts-regen, daily goal, live Gemini voice tutor). It does not need rebuilding, it needs a **visual polish + UX-copy pass**. Everything below is presentation, not behavior; keep the 123-test suite green.

---

## The #1 issue: there is no desktop layout

Every view is a single ~440px mobile-width card (`max-w-lg` / `max-w-2xl`) centered in a vast empty black canvas. On a 1440px+ screen, ~70% of the viewport is dead space. This is the single biggest "amateurish" tell, the app looks like a phone screenshot floating in the void.

**Fix direction:** introduce a real responsive layout for `md:`+ breakpoints. Options: a centered app-frame with a subtle bordered "device"/panel and decorative side rails; OR a genuine two-column desktop layout (e.g. persistent left sidebar nav + stats, content center, a right rail for daily goal / streak / next-achievement). The bottom `floating-navbar` should become a left/side nav on desktop. Constrain the path to a pleasing column but fill the canvas with structure, not emptiness.

Files: `src/App.tsx` (shell, header, `<main>`, nav), `src/index.css` (`.floating-navbar`), every view component.

---

## Per-screen findings

### Path (`src/components/PathView.tsx`)
- The lesson nodes are a thin centered snake on a black void; huge empty L/R margins on desktop.
- The lesson popover is `md:absolute md:-bottom-4`, so on a tall path it lands far down the page and its **"Start Lesson" button sits below the fold / under the bottom nav** (had to scroll to reach it). Popover should anchor near the tapped node (or center as a modal on desktop) and never be occluded by the nav.
- Header "LINGO ROAD" card overlaps the very top; the top stat row (🔥/❄️/XP/❤️) and the full-width **Daily Goal bar are jammed into the extreme top corners** and read as disconnected chrome rather than a designed header.
- Node label text is tiny uppercase mono; locked vs unlocked vs completed states are subtle.

### Lesson popover / exercises (`src/components/LessonRunner.tsx`)
- Popover composition is okay but cramped; "REWARD +20 XP" row and CTA feel stacked/utilitarian.
- (Exercise screens, multiple-choice / matching / word-bank / fill-blank — worth a dedicated polish pass for option-button states, spacing, correct/incorrect feedback, and the confetti/level-up moment.)

### Achievements (`src/components/AchievementsView.tsx`)
- With 0 unlocked, the grid is a **wall of dim grey `opacity-40 grayscale` cards** — the empty state looks broken/washed-out rather than aspirational.
- Tiny icons + tiny mono captions; low contrast.
- **Fix:** make locked badges feel like *locked treasure* (clearer silhouette, a crisp lock chip, maybe a subtle progress hint "2/3 lessons") rather than greyed-out noise. Add a celebratory unlock state.

### Progress (`src/components/ProgressView.tsx`)
- The Lessons / Achievements / Daily-Goal rows render **progress bars that are invisible at 0%**, so they look like bare text rows with a number. Give empty bars a visible track + a "0%"/"start your first lesson" affordance.
- Stat cards (XP/Streak/Lives) are fine but small and centered in emptiness.

### Settings (`src/components/SettingsView.tsx`)
- **Developer language leaks to end users:** "The Penguin uses the server-side `GEMINI_API_KEY` environment variable. The browser never stores or receives your API key" and "exposing a client-side secret." Consumers should never see this. Replace with friendly product copy or remove.
- **Raw "Gemini Model Selection" dropdown** (gemini-2.5-flash, etc.) is a developer control exposed to users. Hide it (pick the best model server-side) or reframe as a simple "Tutor voice/style" choice.
- **"Sound Effects" toggle is a bare icon button** (just a 🔊/🔇 glyph) with no switch affordance or clear on/off state — looks unfinished. Use a real toggle switch.
- Copy: "CONFIGURE YOUR BRAND TUTOR" ("brand tutor"?) and "DANGER ZONE" are engineer-y; soften to consumer voice.

### Tutor (`src/components/TutorChat.tsx`)
- **Developer reassurance copy shown to users:** "The real Gemini key stays on the server. Your browser receives a one-use Live API token for this session." Remove/replace with warm, simple guidance.
- The model id **"gemini-3.1-flash-live-preview" is printed as a subtitle** — leak a dev detail; drop it.
- The idle state is an **empty outline circle** in a big bordered box — reads unfinished. Design a proper idle → listening → speaking visualization (animated mic orb / waveform) and make the penguin mascot part of the moment.

---

## Cross-cutting polish themes
1. **Desktop layout / use of space** (see top) — highest impact.
2. **Strip developer/technical language** everywhere (API keys, model names, "Live API token", "client-side secret", model picker). A consumer learning app hides all infrastructure.
3. **Empty states** — achievements (grey wall), progress (invisible bars), tutor (empty circle) all look broken when empty. Design intentional, encouraging empties.
4. **Controls** — the sound toggle (and any future toggles) need real switch affordances.
5. **Typography & contrast** — near-everything is tiny uppercase letter-spaced mono. Establish a clearer type scale (display / heading / body / caption), reserve all-caps mono for labels, and lift contrast on muted/grey text (some fails WCAG on the dark bg).
6. **Header density** — the top bar (logo + 4 stat chips + full-width daily-goal bar) is cramped at the screen edges; give it real structure/padding and group related info.
7. **Mascot art** — the pixel penguin pixelates at the sizes used; provide crisper assets or lean into deliberate pixel-art at exact multiples.
8. **Micro-interactions** — lean into the arcade theme with deliberate motion (node-unlock, XP gain, streak, achievement unlock) while respecting the existing `prefers-reduced-motion` rule.

---

## Suggested priority
- **P0:** Desktop layout/shell; strip dev language from Settings + Tutor; fix the off-screen "Start Lesson" CTA.
- **P1:** Empty states (achievements, progress, tutor idle); real sound toggle; type scale + contrast.
- **P2:** Header restructure; mascot assets; micro-interactions; exercise-screen polish.

## Constraints for whoever implements
- Behavior must not change; the 123-test suite (`npm run test`) must stay green, and `npm run lint && npm run build` must pass. CI enforces this on every PR.
- Keep the retro-arcade identity, this is a polish pass, not a rebrand.
- Component map: shell/header/nav `src/App.tsx`; path `PathView.tsx`; lesson `LessonRunner.tsx`; tutor `TutorChat.tsx`; settings `SettingsView.tsx`; achievements `AchievementsView.tsx`; progress `ProgressView.tsx`; daily goal `DailyGoal.tsx`; onboarding `Onboarding.tsx`; tokens/utilities `src/index.css`.
