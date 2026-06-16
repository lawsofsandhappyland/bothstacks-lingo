# Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
"""Chat with El Pinguino (the text agent) in the SHARED memory namespace.

Runs the ADK tutor agent against the real Vertex AI Sessions + Memory Bank using
the same (APP_NAME, user_id) the voice tutor uses, so this text agent and the
voice tutor read and write ONE long-term memory for the learner. Pass the
learner's Firebase uid as --user to converse against their real voice memory.

  uv run python scripts/chat.py --user <firebase-uid>
  uv run python scripts/chat.py            # default demo learner

Type 'salir' (or Ctrl-D) to end.
"""

import argparse
import asyncio
import os

# Pin the model/runtime to the both-stacks project BEFORE importing the agent
# package (app/__init__ uses setdefault, so this wins). Matches constants.PROJECT.
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "both-stacks")
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

from google.genai import types  # noqa: E402
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import VertexAiSessionService  # noqa: E402
from google.adk.memory import VertexAiMemoryBankService  # noqa: E402

from app.agent import root_agent  # noqa: E402
from app.app_utils.constants import (  # noqa: E402
    AGENT_ENGINE_ID,
    APP_NAME,
    LOCATION,
    PROJECT,
)


async def main(user_id: str) -> None:
    session_service = VertexAiSessionService(
        project=PROJECT, location=LOCATION, agent_engine_id=AGENT_ENGINE_ID
    )
    memory_service = VertexAiMemoryBankService(
        project=PROJECT, location=LOCATION, agent_engine_id=AGENT_ENGINE_ID
    )
    runner = Runner(
        agent=root_agent,
        app_name=APP_NAME,
        session_service=session_service,
        memory_service=memory_service,
    )
    session = await session_service.create_session(app_name=APP_NAME, user_id=user_id)
    loop = asyncio.get_running_loop()

    print(
        f"El Pingüino  (memoria compartida con la voz: app={APP_NAME}, user={user_id})\n"
        "Escribe 'salir' para terminar.\n"
    )
    while True:
        try:
            text = (await loop.run_in_executor(None, input, "Tú: ")).strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not text:
            continue
        if text.lower() in ("salir", "exit", "quit"):
            break

        message = types.Content(role="user", parts=[types.Part(text=text)])
        reply = ""
        async for event in runner.run_async(
            user_id=user_id, session_id=session.id, new_message=message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if getattr(part, "text", None):
                        reply += part.text
        print(f"\nEl Pingüino: {reply.strip()}\n")

    print("¡Hasta la próxima! Tu progreso queda guardado.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--user",
        default="demo-learner",
        help="user_id; use the learner's Firebase uid to share the voice tutor's memory",
    )
    asyncio.run(main(parser.parse_args().user))
