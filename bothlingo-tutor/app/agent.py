# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""El Pingüino: the BothLingo Spanish tutor agent.

A persistent, evolving Spanish coach. Long-term memory (cross-session facts and
preferences) is handled by Vertex AI Memory Bank via PreloadMemoryTool +
add_session_to_memory. The structured learner model (CEFR level, focus areas,
goals, session summary) lives in user-scoped session state so it survives across
days and is injected into the persona on every turn.
"""

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext  # Memory Bank
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.tools.preload_memory_tool import PreloadMemoryTool  # Memory Bank
from google.adk.tools.tool_context import ToolContext
from google.genai import types

from app.app_utils.constants import APP_NAME

# --- Learner-model state keys (user:-scoped => persist across sessions/days) ---
LEVEL_KEY = "user:cefr_level"
FOCUS_KEY = "user:focus_areas"
GOALS_KEY = "user:goals"
COUNT_KEY = "user:session_count"
SUMMARY_KEY = "user:last_session_summary"

_DEFAULTS = {
    LEVEL_KEY: "A1",
    FOCUS_KEY: [],
    GOALS_KEY: "",
    COUNT_KEY: 0,
    SUMMARY_KEY: "",
}


def seed_learner_profile(callback_context: CallbackContext) -> None:
    """Initialise the learner model on first contact so the persona never sees a
    missing key. Runs before each turn; only fills gaps, never overwrites."""
    state = callback_context.state
    for key, default in _DEFAULTS.items():
        if state.get(key) is None:
            state[key] = default


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def update_learner_profile(
    tool_context: ToolContext,
    cefr_level: str = "",
    add_focus_areas: str = "",
    resolved_focus_areas: str = "",
    goals: str = "",
    session_summary: str = "",
) -> dict:
    """Persist the learner's progress to their long-term profile.

    Call this whenever you observe real progress or a persistent difficulty, and
    once near the end of a session with a short session_summary. All arguments
    are optional; pass only what changed.

    Args:
        cefr_level: New CEFR level (A1, A2, B1, B2, C1, C2). Raise it only when
            the learner clearly sustains the next level.
        add_focus_areas: Comma-separated weaknesses to start working on (e.g.
            "subjunctive, ser vs estar").
        resolved_focus_areas: Comma-separated focus areas the learner has now
            mastered, to remove from the active list.
        goals: The learner's stated learning goal, if newly learned or changed.
        session_summary: One or two sentences on what was practised this session
            and what to do next time.

    Returns:
        The updated learner profile.
    """
    state = tool_context.state

    if cefr_level.strip():
        state[LEVEL_KEY] = cefr_level.strip().upper()

    focus = list(state.get(FOCUS_KEY) or [])
    for area in _csv(add_focus_areas):
        if area not in focus:
            focus.append(area)
    resolved = {a.lower() for a in _csv(resolved_focus_areas)}
    focus = [a for a in focus if a.lower() not in resolved]
    state[FOCUS_KEY] = focus

    if goals.strip():
        state[GOALS_KEY] = goals.strip()
    if session_summary.strip():
        state[SUMMARY_KEY] = session_summary.strip()

    return {
        "cefr_level": state.get(LEVEL_KEY),
        "focus_areas": state.get(FOCUS_KEY),
        "goals": state.get(GOALS_KEY),
        "last_session_summary": state.get(SUMMARY_KEY),
    }


def tutor_instruction(ctx: ReadonlyContext) -> str:
    """Build El Pingüino's persona, injecting the current learner model."""
    state = ctx.state
    level = state.get(LEVEL_KEY, "A1")
    focus = state.get(FOCUS_KEY) or []
    goals = state.get(GOALS_KEY) or "(not stated yet, ask early)"
    count = state.get(COUNT_KEY, 0)
    last = state.get(SUMMARY_KEY) or "(this is your first session together)"
    focus_str = ", ".join(focus) if focus else "(none recorded yet)"
    returning = "a returning learner" if count else "a brand-new learner"

    return f"""You are El Pingüino, the BothStacks Spanish coach. You run ONE
ongoing, personalised Spanish course for ONE learner across many sessions. You
are warm, encouraging, patient, and concise. You are talking to {returning}.

This learner's current profile:
- CEFR level: {level}
- Focus areas (what they're working on or struggle with): {focus_str}
- Goals: {goals}
- Sessions so far: {count}
- Last session: {last}

How you teach:
- Calibrate every response to their CEFR level ({level}). Stretch them slightly
  beyond it to build fluency, but never overwhelm.
- For a returning learner, pick up from the last session and their focus areas.
  Do not start cold; reference what you did together before.
- Speak mostly in Spanish. Drop into brief English only to explain a correction
  or introduce a new concept.
- Correct gently and specifically: name the error, give the fix, then move on.
  One correction at a time.
- Ask exactly one natural follow-up question per turn to keep them talking.
- Prefer practical Spanish for daily life, travel, coffee, coding, Linux, and
  cloud work.
- As they improve, raise the bar: introduce new tenses, vocabulary, and
  connectors when they are ready.

Maintaining the course (important):
- When you notice real progress or a persistent difficulty, call
  update_learner_profile to record it: raise the CEFR level only when warranted,
  add or resolve focus areas, refine goals.
- Near the end of a session, call update_learner_profile with a one or two
  sentence session_summary capturing what you practised and what to do next.
- You also have long-term memory of past conversations; use it to personalise.
- Never ask for passwords, API keys, or secrets."""


# --- Memory Bank ---
# Sends the session's events to Memory Bank after each turn. On Agent Engine
# Runtime this calls VertexAiMemoryBankService, which extracts the learner's
# facts/preferences for retrieval in future sessions.
async def generate_memories_callback(callback_context: CallbackContext):
    """Sends the session's events to Memory Bank for memory generation."""
    await callback_context.add_session_to_memory()
    return None


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-flash-latest",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=tutor_instruction,
    tools=[
        update_learner_profile,
        # --- Memory Bank ---
        # PreloadMemoryTool retrieves relevant memories at the start of each turn
        # and injects them into the system instruction, so the model recalls past
        # sessions without an explicit tool call.
        PreloadMemoryTool(),
    ],
    before_agent_callback=seed_learner_profile,
    # --- Memory Bank ---
    after_agent_callback=generate_memories_callback,
    generate_content_config=types.GenerateContentConfig(temperature=0.7),
)

app = App(
    root_agent=root_agent,
    name=APP_NAME,
)
