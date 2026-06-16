# ADK Tutor Agent: Research + Architecture Proposal

Status: RESEARCH COMPLETE, awaiting an architecture decision before any code is written.
Date: 2026-06-16. Author: Claude (Opus) for Lindsay.

Goal (Lindsay's words, paraphrased): replace the ad-hoc "just speak Spanish at me"
live prompt with a real, structured Spanish-tutor agent built on Google ADK best
practices and the agent CLI, with consistent/persistent session state and long-term
memory with compaction, so returning after a gap resumes where the learner left off
and the experience evolves as fluency grows.

---

## 1. The single most important finding (the integration seam)

The current voice tutor bakes its system instruction into the **ephemeral Live token**
at mint time, server-side:

- `server/index.mjs` -> `handleLiveToken()` (~line 356) calls
  `client.authTokens.create({ config: { liveConnectConstraints: { config: {
  systemInstruction: { parts: [{ text: buildLiveSystemInstruction() }] } } } } })`.
- `buildLiveSystemInstruction()` (~line 108) returns the static "You are El Pinguino..."
  persona. The token endpoint takes no user identity today.
- The audio itself streams **browser <-> Google directly** over
  `wss://generativelanguage.googleapis.com/...BidiGenerateContentConstrained`
  (model `gemini-3.1-flash-live-preview`). The server is never in the audio path; it
  only mints the token.
- Transcripts are captured client-side from `inputTranscription` / `outputTranscription`
  frames (`TutorChat.tsx` ~line 289), grouped into turns by `appendChunk`, and saved
  once per session via `onSaveSession -> saveUserDoc -> Firestore users/<uid>.tutorSessions`.

**Consequence:** continuity and personalization can be delivered with NO change to the
audio protocol. We inject the learner's memory + state into the system instruction at
token-mint time, and we feed the post-session transcript into a memory store. Two seams,
both already exist:

| Seam | Where | What changes |
|---|---|---|
| Inject memory + state at session start | `server/index.mjs` `buildLiveSystemInstruction(userId)` + `/api/live-token` accepting a uid/idToken | Compose the persona dynamically from the learner model |
| Persist + learn after session | `TutorChat.saveCurrentSession` / `persistence.saveUserDoc` | Send transcript to the memory/summarization layer |

The cost of this seam: memory is a **snapshot at session start** (no mid-call retrieval).
For a conversational tutor that is fine. Mid-call tool use would require routing audio
through the server (see Option C), which is a much bigger change.

---

## 2. What ADK gives us (from the installed google-agents-cli skills + current docs)

**Language reality.** ADK is Python-first. There is an official TypeScript SDK
(`@google/adk`, ~v1.2.0, Node >= 24.13) but as of mid-2026 it ships only
`InMemorySessionService` and (since v0.4.0) a database session service. It does **not**
yet expose `VertexAiSessionService` / `VertexAiMemoryBankService`. So managed Vertex
memory from our Node server must go via **REST/SDK against an Agent Engine instance**,
or via a small **Python** service. (Our `server/index.mjs` is Node + `@google/genai`.)

**Sessions & state.** A `SessionService` persists a conversation thread (`Session` =
id, userId, state dict, events). Implementations: `InMemorySessionService` (dev),
`DatabaseSessionService` (Cloud SQL / Postgres), `VertexAiSessionService` (managed,
backed by Vertex AI Agent Engine Sessions). State uses prefix scopes:
`user:` keys persist across all of a learner's sessions/days, `app:` global, `temp:`
in-invocation only, no-prefix = session. **`user:`-prefixed state is the cross-day
learner model** (e.g. `user:cefr_level`, `user:weak_tenses`, `user:known_vocab`,
`user:goals`, `user:last_session_summary`).

**Long-term memory + compaction.** `MemoryService` is the searchable long-term store,
separate from state. The managed option is **Vertex AI Memory Bank**
(`VertexAiMemoryBankService`):
- **Generation:** Gemini analyzes a finished conversation and extracts compact facts /
  preferences asynchronously (`GenerateMemories`).
- **Compaction = consolidation:** when new info arrives, Memory Bank uses Gemini to
  **merge it with existing memories, resolve contradictions, and keep them current**,
  storing compact facts rather than raw transcripts. This IS the long-term-memory
  compaction Lindsay asked for, handled by the service. (No documented hard cap; the
  bound is the consolidation behavior. Based on a Google Research method, ACL 2025.)
- **Retrieval:** `PreloadMemoryTool` (auto-injects relevant memories at the start of a
  turn) or `LoadMemoryTool` (model calls on demand); both wrap a per-`user_id`
  similarity search (`RetrieveMemories` over REST).
- **Standalone path (key for Node):** you do NOT have to deploy agent code to use it.
  Create an empty Agent Engine instance (`client.agent_engines.create()`) as a namespace
  (`projects/p/locations/l/reasoningEngine/<id>`), then call Sessions + Memory Bank via
  REST from any runtime, including our Node server.
- **Status/pricing:** public preview moving toward GA; ~$0.25 per 1k memories stored/mo,
  ~$0.50 per 1k retrieved (first 1k retrievals/mo free), plus Gemini generation cost.
  New billing for Sessions/Memory Bank starts in 2026, verify before committing.
- **Account note:** the live token uses the AI Studio key (`gemini-api-key`,
  generativelanguage endpoint); Memory Bank is a Vertex AI service on project
  `both-stacks`. Reconcile via Vertex (Memory Bank Express Mode accepts an API key) or
  run both under the same project/identity. Flag to confirm during build.

There is also a separate **context-window compaction** at run time
(`RunConfig.context_window_compression`, plus ADK's `EventsCompactionConfig` /
`ContextCacheConfig`) for keeping a single long conversation within the model window.
That is distinct from Memory Bank's cross-session consolidation.

**ADK + Live.** ADK natively supports the Gemini Live API via `Runner.run_live` +
`LiveRequestQueue` (`RunConfig(streaming_mode=BIDI, response_modalities=["AUDIO"], ...)`),
and tools + state + memory DO compose during a live audio session. BUT using `run_live`
means the server sits in the audio path (browser -> our server -> Google), which our app
currently avoids. The skills barely cover Live and warn: use a plain `Agent`, never a
`Workflow`, for live/bidi.

**Agent CLI (what Lindsay wants to drive it).** `agents-cli` (wraps `adk`):
`scaffold create <name> --agent adk --prototype`, `playground` (local web chat, wraps
`adk web`), `run "prompt"` (one-shot or `--start-server --session-id` to resume), `eval`
(esp. `eval dataset synthesize` = LLM user-simulator for multi-turn tutor testing),
`deploy` (Agent Engine or Cloud Run, human approval required). The canonical starting
sample is `adk-samples/python/agents/memory-bank`. Caveat: cross-session memory recall
can't be checked by `eval` (fresh session per case), test continuity with pytest.

---

## 3. Three architecture options

### Option A: Memory-augmented voice (Node only, no Python service)  [recommended first]
Keep the audio path exactly as-is (browser <-> Google direct). Add an empty Agent Engine
instance for managed Sessions + Memory Bank, called via **REST from `server/index.mjs`**.
- `/api/live-token` accepts the Firebase ID token -> resolves uid -> `RetrieveMemories`
  for that user + reads the `user:`-scoped learner model -> `buildLiveSystemInstruction(uid)`
  composes the persona with that context -> bakes it into the token.
- After a session, the transcript (already captured) is POSTed to a new
  `/api/tutor-memory` route that writes the session and triggers `GenerateMemories`
  (consolidation/compaction happens server-side in Memory Bank).
- Learner model (`cefr_level`, weak areas, goals, last-summary) lives in Vertex Sessions
  state and/or Firestore.
- Pros: smallest change, keeps low audio latency, stays in Node, cheap, delivers
  resume-where-you-left-off + evolve-over-time immediately.
- Cons: no real "agent.py" artifact and no agent-CLI workflow yet (the "agent" is the
  persona + REST calls); no mid-call memory retrieval.

### Option B: Real ADK agent as the brain + direct voice  [recommended target]
Option A's audio path, PLUS a real ADK **Python** tutor agent (`agent.py`, `root_agent`,
Memory Bank tools, `user:` state, `before_agent_callback` to init state, `output_key` for
the session summary) built and iterated via the **agent CLI** (`scaffold` -> `playground`
-> `eval dataset synthesize`) and deployed to Agent Engine. The agent owns two operations
the Node server calls around each voice session:
1. "prepare session context" -> returns the composed persona + retrieved memory + state
   snapshot, which Node bakes into the live token.
2. "ingest transcript" -> writes events to the Session and runs memory generation, and
   can decide the next focus (curriculum logic lives in the agent, not ad-hoc in Node).
- Pros: this is the actual ADK agent + agent CLI + best practices Lindsay asked for;
  curriculum/memory logic is testable via eval user-simulation; keeps the working voice
  loop and its latency.
- Cons: introduces a Python deployable (Agent Engine); the voice model still can't call
  agent tools mid-utterance (memory is injected per session, not per turn).

### Option C: Full `run_live` through ADK  [defer]
Route the realtime audio through the ADK agent's `run_live` so tools + memory + state
compose DURING the conversation (mid-call `load_memory`, live state writes).
- Pros: maximal adaptivity; transcripts persist to the ADK session automatically.
- Cons: server sits in the audio path (latency, bandwidth, cost), substantial rewrite of
  the working voice loop, the skills barely cover Live audio plumbing. Only worth it if
  per-turn in-call adaptivity proves necessary.

**Recommendation:** ship **A** to get continuity live fast, then grow into **B** for the
real agent + CLI workflow. Hold **C** unless mid-call adaptivity becomes a felt need.

---

## 4. Proposed phased plan (no code until approved)

- **Phase 0 (substrate + schema):** decide memory store (Vertex AI Memory Bank vs
  roll-your-own on Firestore). If Memory Bank: create the Agent Engine namespace instance,
  confirm Vertex/AI-Studio account reconciliation, set IAM. Define the learner-model
  schema (`user:` state keys: cefr_level, weak_tenses, known_vocab, goals,
  last_session_summary, session_count).
- **Phase 1 (Option A):** `/api/live-token` takes the Firebase ID token; compose persona
  from retrieved memory + state; add `/api/tutor-memory` to ingest transcripts and trigger
  generation. Wire `TutorChat` to send uid on connect and transcript on save. Result:
  the tutor greets you by what you were working on and adapts difficulty across days.
- **Phase 2 (Option B):** scaffold the ADK Python tutor agent via `agents-cli`, build the
  persona + curriculum logic + Memory Bank tools, iterate in `playground`, test with
  `eval dataset synthesize`, deploy to Agent Engine, point Node's two seams at the agent's
  operations. Result: a real, testable, evolving tutor agent driven by the agent CLI.
- **Phase 3 (optional, Option C):** migrate audio to `run_live` if in-call adaptivity is
  needed.

---

## 5. Open decisions for Lindsay (need answers before Phase 0)

1. **Memory store:** managed Vertex AI Memory Bank (does compaction for us, ADK-native,
   preview/GA + new billing, Vertex) vs roll-your-own summarization on Firestore (free,
   already wired, full control, we write the compaction with Gemini).
2. **How far now:** A first (fast continuity, no Python), or go straight to B (real ADK
   agent + CLI, adds a Python deployable).
3. **Voice path:** keep direct browser<->Google audio (A/B) for now, or commit to the
   `run_live` rewrite (C).

(Sources for the ADK/Memory Bank claims: adk.dev sessions/state/memory + streaming docs,
cloud.google.com Vertex AI Memory Bank overview + pricing, google/adk-js. Full URL list
in the research session notes.)
