"""
Central inference router for Project Agent.

Every LLM call in the platform passes through here so we can:
 1. Swap models per role without touching call sites (just edit ROUTING)
 2. Direct as much traffic as possible to DCP (api.dcp.sa) — DCP becomes
    the demand engine that funds the Decentralized Compute Provider
    network. Today most closed-source models still go direct to vendor
    until DC1 builds proxy support; the call sites don't care.
 3. Measure inference cost and routing decisions in one place (for
    investor metrics + cost dashboards)
 4. Add observability, retries, fallback chains without scattering them

Usage:
    from inference import chat

    reply = await chat(
        role="customer_response_en",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=400,
        temperature=0.7,
    )

The role string (not the model name) is the contract. Models change;
roles don't.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

import httpx

log = logging.getLogger(__name__)


# ---- Provider definitions -------------------------------------------------

@dataclass(frozen=True)
class Provider:
    name: str
    base_url: str
    api_key_env: str
    # OpenAI-compatible providers can share a single chat method. Set false
    # for any provider needing a custom adapter.
    openai_compatible: bool = True


PROVIDERS: dict[str, Provider] = {
    # DCP gateway — fronts a fleet of provider GPUs. The demand thesis.
    # Closed-source models will land here once DC1 builds proxy support.
    "dcp": Provider(
        name="dcp",
        base_url="https://api.dcp.sa/v1",
        api_key_env="DCP_RENTER_API_KEY",
    ),
    # Anthropic — Claude family. Vision + tool-use for our pipelines.
    # OpenAI-compatible endpoint, not the native Anthropic one (so the same
    # client code works whether we route via DCP later or directly today).
    "anthropic": Provider(
        name="anthropic",
        base_url="https://api.anthropic.com/v1",
        api_key_env="ANTHROPIC_API_KEY",
        openai_compatible=False,  # Anthropic has its own message format
    ),
    # MiniMax — owner brain + Rami. MoE, cheap, fluent in Arabic.
    "minimax": Provider(
        name="minimax",
        base_url="https://api.minimax.io/v1",
        api_key_env="MINIMAX_API_KEY",
    ),
    # OpenRouter — escape hatch / fallback for arbitrary models without
    # adding a new provider entry. Pass model="openai/gpt-4o" style.
    "openrouter": Provider(
        name="openrouter",
        base_url="https://openrouter.ai/api/v1",
        api_key_env="OPENROUTER_API_KEY",
    ),
}


# ---- Role → model routing -------------------------------------------------
#
# Roles describe WHAT the call does, not which model serves it. Keep this
# the only place that maps roles to provider+model. To redirect a role to
# a different model (e.g., during a cost-saving experiment), edit one line.
#
# Format: role → (provider, model, default_params)
#
# A few rules of thumb baked in:
#  - Customer-facing English: Claude Sonnet (highest quality)
#  - Customer-facing Arabic: ALLaM 7B via DCP (native Arabic, free GPU time)
#  - Classification / extraction: Claude Haiku (fast, cheap, accurate)
#  - Owner brain / Rami voice: MiniMax M2.7 (cheap, fluent, large context)
#  - Vault research / batch jobs: open-source via DCP (cost optimization)

ROUTING: dict[str, dict[str, Any]] = {
    # Customer-facing WhatsApp responses
    "customer_response_en": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "max_tokens": 600,
        "temperature": 0.7,
    },
    "customer_response_ar": {
        "provider": "dcp",
        "model": "allam-7b:latest",
        "max_tokens": 600,
        "temperature": 0.7,
    },
    # Intent + booking-stage classifiers
    "intent_classification": {
        "provider": "anthropic",
        "model": "claude-haiku-4-5",
        "max_tokens": 100,
        "temperature": 0.0,
    },
    "booking_extraction": {
        "provider": "anthropic",
        "model": "claude-haiku-4-5",
        "max_tokens": 200,
        "temperature": 0.0,
    },
    # Vision (receipt OCR, photo categorization)
    "receipt_ocr": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "max_tokens": 800,
        "temperature": 0.0,
    },
    # Owner brain (the chief-of-staff agent the owner DMs)
    "owner_brain": {
        "provider": "minimax",
        "model": "MiniMax-M2.7",
        "max_tokens": 800,
        "temperature": 0.6,
    },
    # Rami CEO persona — public voice. Bigger model for thread quality.
    "rami_draft": {
        "provider": "minimax",
        "model": "MiniMax-M2.7",
        "max_tokens": 800,
        "temperature": 0.8,
    },
    # Rami's research / reflection loop — runs on cheap open-source.
    "rami_research": {
        "provider": "dcp",
        "model": "qwen/qwen3-30b-a3b-gptq-int4",
        "max_tokens": 1500,
        "temperature": 0.5,
    },
    # Content engine — social posts, captions
    "content_draft": {
        "provider": "minimax",
        "model": "MiniMax-M2.7",
        "max_tokens": 1000,
        "temperature": 0.85,
    },
    # SDR / sales rep outbound
    "sales_outbound": {
        "provider": "minimax",
        "model": "MiniMax-M2.7",
        "max_tokens": 600,
        "temperature": 0.7,
    },
    # Karpathy loop — distilling rules from many conversations
    "karpathy_distill": {
        "provider": "dcp",
        "model": "qwen/qwen3-30b-a3b-gptq-int4",
        "max_tokens": 2000,
        "temperature": 0.3,
    },
    # GEPA prompt evolution
    "gepa_evolve": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "max_tokens": 2000,
        "temperature": 0.5,
    },
    # Quality eval
    "quality_eval": {
        "provider": "anthropic",
        "model": "claude-haiku-4-5",
        "max_tokens": 400,
        "temperature": 0.0,
    },
}


# ---- Metrics tap ----------------------------------------------------------

_metrics_sink_url = os.environ.get("INFERENCE_METRICS_URL", "").strip()


async def _log_metric(role: str, provider: str, model: str, latency_ms: int,
                      input_tokens: int | None, output_tokens: int | None,
                      ok: bool, error: str | None = None) -> None:
    """Best-effort fire-and-forget metric. Never blocks the caller."""
    log.info(
        "[inference] role=%s provider=%s model=%s latency_ms=%d "
        "in_tokens=%s out_tokens=%s ok=%s%s",
        role, provider, model, latency_ms,
        input_tokens, output_tokens, ok,
        f" error={error}" if error else "",
    )
    if not _metrics_sink_url:
        return
    try:
        async with httpx.AsyncClient(timeout=2) as http:
            await http.post(_metrics_sink_url, json={
                "role": role, "provider": provider, "model": model,
                "latency_ms": latency_ms,
                "input_tokens": input_tokens, "output_tokens": output_tokens,
                "ok": ok, "error": error,
            })
    except Exception:
        pass


# ---- Core call ------------------------------------------------------------

class InferenceError(RuntimeError):
    pass


async def chat(
    role: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int | None = None,
    temperature: float | None = None,
    overrides: Mapping[str, Any] | None = None,
) -> str:
    """
    Run a chat-completion for the given role. Returns the assistant text.

    `overrides` lets a caller pin {"provider": "...", "model": "..."} to
    bypass routing for one-off experiments. Use sparingly — the whole
    point of this module is that call sites don't know about models.
    """
    cfg = dict(ROUTING.get(role) or {})
    if overrides:
        cfg.update(overrides)
    if not cfg:
        raise InferenceError(f"No routing config for role={role!r}")

    provider_name = cfg["provider"]
    model = cfg["model"]
    provider = PROVIDERS.get(provider_name)
    if not provider:
        raise InferenceError(f"Unknown provider: {provider_name!r}")

    api_key = os.environ.get(provider.api_key_env, "")
    if not api_key:
        raise InferenceError(
            f"Missing env {provider.api_key_env} for provider {provider_name!r}"
        )

    final_max_tokens = max_tokens if max_tokens is not None else cfg.get("max_tokens", 600)
    final_temp = temperature if temperature is not None else cfg.get("temperature", 0.7)

    started = time.time()
    try:
        if provider.openai_compatible:
            text, usage = await _openai_chat(
                provider, model, api_key, messages,
                final_max_tokens, final_temp,
            )
        elif provider_name == "anthropic":
            text, usage = await _anthropic_chat(
                provider, model, api_key, messages,
                final_max_tokens, final_temp,
            )
        else:
            raise InferenceError(f"No adapter for provider {provider_name!r}")
    except Exception as e:
        latency = int((time.time() - started) * 1000)
        await _log_metric(role, provider_name, model, latency, None, None, False, str(e))
        raise

    latency = int((time.time() - started) * 1000)
    await _log_metric(
        role, provider_name, model, latency,
        usage.get("prompt_tokens"), usage.get("completion_tokens"),
        True, None,
    )
    return text


# ---- Adapters -------------------------------------------------------------

async def _openai_chat(
    provider: Provider, model: str, api_key: str,
    messages: list[dict[str, Any]], max_tokens: int, temperature: float,
) -> tuple[str, dict[str, int | None]]:
    url = f"{provider.base_url}/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    async with httpx.AsyncClient(timeout=60) as http:
        r = await http.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code >= 400:
            raise InferenceError(f"HTTP {r.status_code} from {provider.name}: {r.text[:300]}")
        data = r.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage") or {}
    return text, {
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
    }


async def _anthropic_chat(
    provider: Provider, model: str, api_key: str,
    messages: list[dict[str, Any]], max_tokens: int, temperature: float,
) -> tuple[str, dict[str, int | None]]:
    """Native Anthropic Messages API. system is hoisted out of messages."""
    system_parts: list[str] = []
    user_assistant: list[dict[str, Any]] = []
    for m in messages:
        if m.get("role") == "system":
            content = m.get("content", "")
            if isinstance(content, str):
                system_parts.append(content)
            else:
                system_parts.append(json.dumps(content))
        else:
            user_assistant.append(m)
    system = "\n\n".join(p for p in system_parts if p)

    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": user_assistant,
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=60) as http:
        r = await http.post(
            f"{provider.base_url}/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code >= 400:
            raise InferenceError(f"HTTP {r.status_code} from anthropic: {r.text[:300]}")
        data = r.json()
    # Anthropic returns content as a list of blocks
    text_parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    text = "".join(text_parts)
    usage = data.get("usage") or {}
    return text, {
        "prompt_tokens": usage.get("input_tokens"),
        "completion_tokens": usage.get("output_tokens"),
    }


# ---- Introspection (used by /inference/routing dashboard) ----------------

def routing_table() -> list[dict[str, Any]]:
    """Return the current role → model mapping as a serializable list."""
    return [
        {
            "role": role,
            "provider": cfg["provider"],
            "model": cfg["model"],
            "max_tokens": cfg.get("max_tokens"),
            "temperature": cfg.get("temperature"),
        }
        for role, cfg in ROUTING.items()
    ]


__all__ = ["chat", "routing_table", "InferenceError", "ROUTING", "PROVIDERS"]
