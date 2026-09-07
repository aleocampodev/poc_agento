# Observability & Security — Shirley Management Bot

*Owner: bot runtime (`src/lib/agent/`, `src/app/(app)/telegram/webhook/`). Last updated: 2026-09-06.*

## 1. Overview

Shirley operates the store from Telegram. Buyers never talk to the bot — the
web checkout is the only buyer path. All inference stays on free tiers
(Constitution Art. II, Policy #253):

```
Shirley → POST /telegram/webhook → runShirleyAgent()
  → LiteLLM :4000 → Groq free (gpt-oss-120b → 20b → qwen fallbacks)
  → Payload Local API tools → reply to Shirley
```

The app never calls paid Anthropic/OpenAI APIs.

## 2. Token budget math

| Free-tier cap (`openai/gpt-oss-120b`) | Value |
|---|---|
| RPM / RPD | 30 / 1,000 |
| TPM / TPD | 8,000 / 200,000 |

Typical Shirley message costs ~2–3k tokens (system prompt + ≤4 history
messages + tools + ≤1024 output). Heavy 4-turn runs cost up to ~10k.

- Daily capacity: **~70–100 typical messages/day** before 200K TPD.
- Burst capacity: **~3 heavy calls/minute** before 8K TPM.
- RPD (1,000) is never the binding constraint for a single admin.

Guardrail thresholds (`runShirleyAgent.ts`): lite mode at **150K**
(`DAILY_WARN_TOKENS`), parked at **190K** (`DAILY_PARK_TOKENS`).

## 3. Guardrails inventory

| Layer | Mechanism | Location | Values |
|---|---|---|---|
| Request cap | `max_tokens` per gateway call | `litellm/config.yaml`, `runShirleyAgent.ts` | 1024 |
| Loop cap | `effectiveMaxTurns` (lite: 1) | `runShirleyAgent.ts` | 4 / 1 |
| Memory cap | History messages (lite: none) | `runShirleyAgent.ts` | 4 / 0 |
| Input cap | Prompt truncation | `runShirleyAgent.ts` | 1000 chars |
| Output cap | Tool-result truncation (+ `/admin` pointer) | `runShirleyAgent.ts` | 2000 chars |
| Telegram cap | Outbound message limit respected | `src/lib/telegram.ts` | 4000 chars |
| Forced routing | Regex pre-router skips 1 LLM round-trip | `determineToolChoice()` | turn 0 only |
| Short-circuit | Direct tools reply without 2nd LLM call | `DIRECT_REPLY_TOOLS` | 23 tools |
| Burst fusion | Double-taps fused into 1 call (1s debounce) | `webhook/route.ts` | `DEBOUNCE_MS=1000` |
| Single-flight | One agent run per chat; arrivals queue + drain | `webhook/route.ts` | `MAX_DRAINS=3` |
| Retry | `retry-after` + exp backoff + jitter, model failover | `runShirleyAgent.ts` | 3 attempts, ≤12s sleep |
| Circuit breaker | Parked reply after 3 consecutive gateway failures | `runShirleyAgent.ts` | 5 min open |
| Daily budget | Lite mode ≥150K; parked ≥190K (UTC day) | `getDailyTokenUsage()` | via `agent-traces` |
| Fallback chain | LiteLLM router fallbacks (free-only) | `litellm/config.yaml` | 120b → 20b → qwen ×2 |
| Timeout | Per-attempt abort | `runShirleyAgent.ts` | 120s |

All degree-of-freedom reductions in lite mode are invisible to Shirley
(same Spanish tone, shorter reasoning). She only sees a message at the hard
park threshold or while the circuit is open.

## 4. Human-in-the-loop (destructive tools)

Covered tools (`DESTRUCTIVE_TOOLS`): `eliminarEvento`,
`eliminarFotoGaleria`, `eliminarTestimonio`, `confirmarPedido`.

Contract:

1. The model (or the forced pre-router) requests a destructive tool →
   **nothing executes**. A pending confirmation is stored (5 min TTL,
   `PENDING_TTL_MS`) and Shirley receives a one-line summary plus:
   *“Respóndeme sí para confirmar o no para cancelar.”*
2. `sí / confirmo / dale / ok` (relaxed `CONFIRM_RE`, accent-tolerant) →
   the stored call executes exactly once with the stored args.
3. `no / cancela` (`CANCEL_RE`) → cancelled, warm reply, trace
   `fallback` / `confirmation-cancelled`.
4. Any other message supersedes and clears the pending item (non-tedious:
   no stuck states). `/start` also clears it.
5. Mixed turns (safe + destructive calls together) defer **everything**
   until confirmation, so partial executions are impossible.

Traces for unconfirmed prompts use status `fallback` with
`errorMessage: HITL: awaiting Shirley confirmation` (the `status` select
only allows `success | error | fallback`).

Limitation: confirmations are plain-text replies. The webhook does not handle
Telegram `callback_query`, so inline Sí/No buttons are a future upgrade.

## 5. Webhook security

`src/app/(app)/telegram/webhook/route.ts` (deliberately outside `/api/` to
avoid the Payload catch-all, Constitution Art. IV):

- **Shared-secret auth**: `x-telegram-bot-api-secret-token` must equal
  `TELEGRAM_WEBHOOK_SECRET`, else `403`.
- **Single-admin guard**: `chat_id === Number(TELEGRAM_ADMIN_CHAT_ID)`.
  Anyone else gets silent `200 { ignored: 'unauthorized' }` — a non-200
  would trigger Telegram retry storms.
- **Dedupe**: `update_id` set (cap 1000) — a retried update never runs
  tools twice.
- **Voice policy**: voice/audio notes get a fixed zero-token reply asking
  for text or photo/video. No transcription cost exists by design.
- **Media path**: photos/video are downloaded via `getFile` and stored in
  the `media` collection before the agent turn; the `mediaId` is injected
  into tool args so gallery/product tools link the file.

## 6. Data privacy

- Checkout consent: customer contact data persists only with explicit
  `consent === 'on'` (Habeas Data, Ley 1581 de 2012, Constitution Art. V).
- `agent-messages` and `agent-traces` are `adminOnly` (create/read/update/
  delete) and live under the “Bot de Shirley” admin group.
- Telegram never receives stack traces: every failure renders
  `AGENT_FALLBACK` or a warm Spanish one-liner; technical detail goes to
  `payload.logger` + `agent-traces.errorMessage`.
- Checkout idempotency (SHA256 `cartId + buyerContact`, 5-min window)
  prevents duplicate orders and duplicate Telegram pushes.

## 7. Observability

Collections (Payload admin → “Bot de Shirley”):

- `agent-messages`: `{ chatId, role: user|assistant|tool, content,
  toolName?, toolCalls?, toolResults? }` — conversational memory, last 4
  loaded per turn.
- `agent-traces`: `{ chatId, query, responseSummary, toolsUsed,
  inputTokens, outputTokens, totalTokens, cost, executionTimeMs,
  status: success|error|fallback, errorMessage?, model? }` — one row per
  agent turn outcome, including parked/cancelled/HITL states.

Daily usage query (same predicate as `getDailyTokenUsage()`):
`agent-traces` where `createdAt >= today 00:00 UTC`, `SUM(totalTokens)`.
Alert thresholds: **150K** (degrade) / **190K** (park) of 200K TPD.

## 8. Incident playbooks

| Symptom | Cause | Response |
|---|---|---|
| `CIRCUIT_BUSY_MESSAGE` for >10 min | Groq outage or sustained 429s | Check LiteLLM `:4000` logs; work from `/admin`; circuit self-closes after 5 min of no failures |
| `DAILY_PARK_MESSAGE` before noon | Runaway loop or pasted bursts | Inspect `agent-traces` for high `totalTokens` rows; consider lowering `TOOL_RESULT_MAX_CHARS` |
| Repeated `HTTP 429` in traces | TPM burst (3+ heavy calls/min) | Already retried with backoff + smaller model; coach single messages over bursts |
| Wrong item deleted | Fuzzy title match + confirmed | Restore from DB backup / re-create; tighten tool query before re-confirming |
| Duplicate replies | Telegram retries + multi-instance | Dedupe set is per-instance; keep single instance or move `seenUpdates` to Redis/DB |

## 9. Known limitations

- All fast guards (`seenUpdates`, locks, queues, pending confirmations,
  circuit state) are **in-memory, single-instance**. A second Node instance
  would double-spend budget and lose pending confirmations. Acceptable for
  one admin; revisit if the webhook ever scales horizontally.
- `getDailyTokenUsage()` sums up to 2000 trace rows in-process — fine at
  single-admin volume.
- **Config drift**: `ADR-002` documents `llama-3.3-70b + Gemini 2.0 Flash`
  fallback, but `litellm/config.yaml` currently chains
  `gpt-oss-120b → 20b → qwen3.6 → qwen3.8` with **no second provider**.
  Still $0, but a full Groq incident has no non-Groq escape hatch. Either
  re-add Gemini or update `ADR-002`.

## 10. File reference

- `src/lib/agent/runShirleyAgent.ts` — loop, HITL, retry, budget, traces
- `src/lib/agent/tools.ts` — 23 tools, Payload Local API, deterministic copy
- `src/app/(app)/telegram/webhook/route.ts` — auth, fusion, media, replies
- `src/collections/AgentMessages.ts`, `src/collections/AgentTraces.ts`
- `src/lib/telegram.ts` — send/reply helpers, 4000-char cap
- `litellm/config.yaml` — model chain, `drop_params`, master key
- `docs/adr/ADR-002-claude-agent-sdk-litellm-groq.md` — accepted decision
