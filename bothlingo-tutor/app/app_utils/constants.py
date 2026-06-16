# Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
"""Shared identifiers for the BothLingo tutor.

The voice tutor (Node: server/memory.mjs) and this text agent must read and write
the SAME long-term memory, so they share one namespace. Memory in Vertex AI
Memory Bank is scoped by (app_name, user_id); keeping APP_NAME identical on both
sides, with user_id = the learner's Firebase uid, is what makes the voice tutor
and the text agent remember the same learner.

Keep APP_NAME in sync with TUTOR_MEMORY_APP / the default in server/memory.mjs.
"""

PROJECT = "both-stacks"
LOCATION = "us-central1"
# The Agent Engine instance that backs Sessions + Memory Bank.
AGENT_ENGINE_ID = "7355757528833064960"
# The single shared memory namespace for voice + text. MUST match server/memory.mjs.
APP_NAME = "bothlingo"
