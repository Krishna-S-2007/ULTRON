"""
llm_client.py — Shared FreeLLMAPI HTTP client with model fallback.
Used by all stages. Located at backend/Stage_1/ but imported by future stages too.
"""

import httpx
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "Stage_0", ".env"))

FREELLM_BASE_URL = os.getenv("FREELLM_BASE_URL", "http://localhost:3001/v1/chat/completions")
FREELLM_API_KEY = os.getenv("FREELLM_API_KEY", "")

# Model tiers — ordered by intelligence/cost.
# Each stage picks the right tier; fallback goes down the list automatically.
MODELS = {
    "flash":     "mistral-small-4",           # Fast: planning, query gen (primary)
    "reasoning": "nemotron-3-nano-30b-reasoning",  # Deep: analysis, gap detection
    "super":     "nemotron-3-nano-30b",       # Best: final report generation (primary)
}

# Full fallback chain of all valid models
FALLBACK_CHAIN = [
    "mistral-small-4",
    "nemotron-3-nano-30b",
    "nemotron-3-nano-30b-reasoning",
    "nemotron-3-super-120b",
    "gemini-3.5-flash",
    "minimax-m2.7",
]


async def call_llm(
    messages: list[dict],
    model: str = MODELS["flash"],
    temperature: float = 0.3,
    timeout: float = 30.0,
) -> str:
    """
    Call FreeLLMAPI with automatic fallback across models.

    Args:
        messages:    OpenAI-style message list [{"role": ..., "content": ...}]
        model:       Primary model to attempt (use MODELS["flash"] etc.)
        temperature: Sampling temperature
        timeout:     Per-request timeout in seconds

    Returns:
        str: The model's response text

    Raises:
        RuntimeError: If all fallback models fail
    """
    # Build fallback order: primary first, then others in fallback chain order
    ordered = [model] + [m for m in FALLBACK_CHAIN if m != model]

    last_error = None
    for attempt_model in ordered:
        try:
            result = await _request(attempt_model, messages, temperature, timeout)
            if attempt_model != model:
                print(f"[llm_client] Fell back to {attempt_model} (primary was {model})")
            return result
        except Exception as e:
            last_error = e
            print(f"[llm_client] Model {attempt_model} failed with {type(e).__name__}: {repr(e)}. Trying next...")
            continue

    raise RuntimeError(f"All models failed. Last error: {last_error}")


async def _request(
    model: str,
    messages: list[dict],
    temperature: float,
    timeout: float,
) -> str:
    """Single HTTP request to FreeLLMAPI."""
    # Print the request
    print("\n" + "="*80)
    print(f"[LLM REQUEST] Model: {model} | Temperature: {temperature} | Timeout: {timeout}s")
    print("-"*80)
    for msg in messages:
        role = msg.get("role", "unknown").upper()
        content = msg.get("content", "")
        indented_content = "\n".join("    " + line for line in content.splitlines())
        print(f"[{role}]:\n{indented_content}")
    print("="*80 + "\n")

    headers = {
        "Authorization": f"Bearer {FREELLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(FREELLM_BASE_URL, headers=headers, json=payload)

    if response.status_code == 200:
        data = response.json()
        response_content = data["choices"][0]["message"]["content"]
        # Print the response
        print("\n" + "="*80)
        print(f"[LLM RESPONSE] Model: {model}")
        print("-"*80)
        indented_response = "\n".join("    " + line for line in response_content.splitlines())
        print(indented_response)
        print("="*80 + "\n")
        return response_content
    else:
        error_text = response.text[:1000]
        print("\n" + "!"*80)
        print(f"[LLM ERROR] Model: {model} | Status: {response.status_code}")
        print(f"Error: {error_text}")
        print("!"*80 + "\n")
        raise RuntimeError(
            f"HTTP {response.status_code}: {response.text[:300]}"
        )
