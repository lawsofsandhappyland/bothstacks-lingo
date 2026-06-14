# BothStacks Lingo

A Spanish learning app with a deterministic lesson path and a server-backed Gemini Live voice tutor.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Put your Gemini key in `.env.local`:

```bash
GEMINI_API_KEY=your-key-here
PORT=8787
```

Do not put Gemini keys in React state, Vite client environment variables, or localStorage. The tutor endpoint reads `GEMINI_API_KEY` from the server process only.

## Development

Run the API server in one terminal:

```bash
set -a
source .env.local
set +a
npm run dev:server
```

Run Vite in another terminal:

```bash
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:8787`.

## Production Preview

Build and serve the compiled app through the same Node server:

```bash
npm run build
set -a
source .env.local
set +a
npm start
```

Open `http://127.0.0.1:8787`.

## Architecture Notes

- Browser code never receives or stores the Gemini API key.
- `/api/tutor` validates the requested model, injects the tutor system prompt, calls Gemini with `x-goog-api-key`, and returns structured JSON.
- `/api/live-token` creates a one-use Gemini Live ephemeral token scoped to `gemini-3.1-flash-live-preview`.
- The Tutor tab uses the Gemini Live API for microphone-based Spanish speaking practice.
- The deterministic lesson path tracks completed lessons separately from XP so replaying a lesson does not farm rewards.
- Incorrect matching attempts now cost a life, instead of allowing unlimited brute-force retries.
