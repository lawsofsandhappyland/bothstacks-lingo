# Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
"""Create (or reuse) an empty Vertex AI Agent Engine instance that serves as the
namespace for Agent Engine Sessions + Memory Bank.

No agent code is deployed here; this is just the managed memory/session store that
the local playground (and later a deployed agent) point at via
  agentengine://<RESOURCE_NAME>

Run: uv run python scripts/create_memory_instance.py
"""

import vertexai
from vertexai._genai.types import (
    AgentEngineConfig,
    ReasoningEngineContextSpec,
)

from app.app_utils.memory_config import memory_bank_config

PROJECT = "both-stacks"
LOCATION = "us-central1"
DISPLAY_NAME = "bothlingo-tutor"
DESCRIPTION = "BothLingo Spanish tutor: Sessions + Memory Bank namespace"


def main() -> None:
    client = vertexai.Client(project=PROJECT, location=LOCATION)

    existing = [
        a
        for a in client.agent_engines.list()
        if a.api_resource.display_name == DISPLAY_NAME
    ]
    if existing:
        agent = existing[0]
        print(f"REUSING existing instance: {agent.api_resource.name}")
    else:
        config = AgentEngineConfig(
            display_name=DISPLAY_NAME,
            description=DESCRIPTION,
            context_spec=ReasoningEngineContextSpec(
                memory_bank_config=memory_bank_config,
            ),
        )
        agent = client.agent_engines.create(config=config)
        print(f"CREATED instance: {agent.api_resource.name}")

    print(f"MEMORY_SERVICE_URI=agentengine://{agent.api_resource.name}")


if __name__ == "__main__":
    main()
