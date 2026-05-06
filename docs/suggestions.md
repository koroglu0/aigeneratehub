# Project Upgrade Suggestions — Backend (All Services)

## Summary

The backend is well-structured with consistent conventions (envelope responses, `asyncHandler`, Joi validation, custom error hierarchy). The two most critical concerns are a **full-table `Scan` in the hot path** (idempotency check on every POST /generate) and **service JWT signing with the wrong secret** (`JWT_SECRET` instead of `SERVICE_JWT_SECRET`), which breaks the separation between user and service auth. Several high-impact security and reliability gaps follow.

---

## Findings

### 🔴 Critical

- **Wrong secret for inter-service JWT** — `services/ai-integration/src/utils/callService.js` line 22 signs the service token with `env.JWT_SECRET` (the user-facing secret), not `env.SERVICE_JWT_SECRET`. This means a leaked service token can be accepted as a user token and vice-versa — the secret separation is completely broken. Fix: change to `jwt.sign({ ... }, env.SERVICE_JWT_SECRET, ...)` and ensure prompt-builder's `authMiddleware` verifies `SERVICE_JWT_SECRET` for `role: "service"` tokens.

- **Full-table `ScanCommand` on every POST /generate** — `services/ai-integration/src/services/idempotency.service.js` lines 16–27 imports `ScanCommand` and scans the entire `GenerationRequests` table to find an idempotency key match. This is O(n) on table size, will cause throttling at scale, and incurs unnecessary read-unit costs. The comments even acknowledge a GSI is needed. Fix: add an `idempotencyKeyIndex` GSI on the `GenerationRequests` table (in `scripts/create-tables.js`) and replace the scan with a `QueryCommand`.

---

### 🟠 High

- **`callService` retries non-retryable 4xx errors** — `services/ai-integration/src/utils/callService.js` lines 43–47 only avoids retrying when `err.isOperational && err.name !== 'AIProviderError'`. A 4xx response is converted to a `ServiceUnavailableError` (which is operational), but then the outer catch retries it anyway because the `isOperational` guard is on `AIProviderError`. 4xx errors from prompt-builder (e.g., 400 bad template ID) should **not** be retried 3 times. Fix: throw a non-retryable operational error on 4xx responses and skip them in the retry gate.

- **`register` endpoint has no Joi validation in controller** — `services/user-service/src/controllers/user.controller.js` defines `registerSchema` and `loginSchema` but `registerHandler` (line 30) calls `register(req.body)` directly without validating — `registerSchema` is defined but never applied to the request. An attacker can send arbitrary fields. Fix: add `validate(registerSchema)` middleware on the register route, matching the pattern used for login.

- **`userId` ownership check missing on `GET /generate/:requestId`** — `services/ai-integration/src/controllers/generate.controller.js` lines 119–128 fetches any record by `requestId` and returns it to any authenticated user without verifying `record.userId === req.user.userId`. Any user can read any other user's generation result including the `imageUrl` (IDOR). Fix: add `if (record.userId !== req.user.userId) throw new ForbiddenError(...)` after the null check.

- **`s3.service.js` file extension derived from untrusted HTTP response header** — `services/ai-integration/src/services/s3.service.js` line 10 derives the S3 key extension from `contentType.split('/')[1]`, which comes from the HuggingFace upstream response header. A malicious or misconfigured upstream could inject path characters. Fix: replace with a safe whitelist map: `{ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }` with a fallback of `'png'`.

- **Pollinations `imageUrl` is an ephemeral CDN URL, not a stored asset** — `services/ai-integration/src/services/pollinations.service.js` returns the Pollinations CDN URL directly as `imageUrl`. This URL can expire or be removed at any time. The `arrayBuffer()` is already fetched (line ~42) but the result is discarded. Fix: pipe the buffer to `uploadImageBuffer` (as HuggingFace does) and return the S3 URL.

---

### 🟡 Medium

- **`getUserHistory` silently ignores invalid `lastKey` and restarts pagination** — `services/ai-integration/src/services/idempotency.service.js` catches JSON parse errors on `lastKey` with `// ignore invalid cursor` and continues with no `ExclusiveStartKey`, silently restarting pagination from the beginning. A bad cursor causes data re-delivery with no client indication. Fix: throw a `ValidationError('Invalid pagination cursor')`.

- **`SERVICE_JWT_SECRET` unused in prompt-builder auth — no service-role gate** — `services/prompt-builder/src/config/env.js` declares `SERVICE_JWT_SECRET` but prompt-builder's auth middleware verifies all tokens with `JWT_SECRET` only. There is no `role: "service"` gate on `/api/v1/prompts/build`. Any valid user token can call the internal prompt-build endpoint. Fix: verify service routes accept only `role === 'service'` tokens verified with `SERVICE_JWT_SECRET`.

- **In-memory rate limiter is per-process and breaks under horizontal scaling** — `services/ai-integration/src/middleware/rateLimiter.middleware.js` uses the default `express-rate-limit` in-memory store. In a multi-replica deployment each instance tracks limits independently, effectively multiplying the allowed rate. Fix: use a Redis-backed store (`rate-limit-redis`) for production.

- **`getHistory` `FilterExpression` after `Limit` causes under-fetching** — `services/ai-integration/src/services/idempotency.service.js` applies `FilterExpression: '#status IN (:completed, :failed)'` with a fixed `Limit`. DynamoDB applies the filter **after** the limit, so a page of 20 could return 0 items if the first 20 are all `pending`. Fix: remove the status filter (return all statuses) or implement a continuation loop that reads until `limit` filtered items are collected.

- **`listMainTemplates` without `category` falls back to full `ScanCommand`** — `services/prompt-builder/src/services/template.service.js` line ~57 performs a full scan when no `category` is provided. Fix: require `category` as a mandatory query param, or add a global sort GSI to avoid scans.

- **`OPENAI_API_KEY` validation too permissive vs. runtime routing** — `services/ai-integration/src/config/env.js` makes `OPENAI_API_KEY` required only when `AI_PROVIDER === 'openai'`. But `image.provider.js` routes to OpenAI when the user submits `model: "dall-e-3"` regardless of `AI_PROVIDER`. A deployment with `AI_PROVIDER=pollinations` but a user sending `model=dall-e-3` crashes at runtime with an unhelpful error. Fix: make `OPENAI_API_KEY` always required, or add a runtime guard in `image.provider.js` that returns a `ValidationError` when the OpenAI key is absent.

---

### 🟢 Low / Nice-to-have

- **`local-proxy.js` uses raw `console.log`/`console.error`** — `infrastructure/local-proxy.js` uses unstructured console output. Replace with a lightweight structured logger (e.g., pino) for consistent JSON output, especially useful when debugging proxy path rewrites.

- **No proxy-level health aggregator** — The proxy forwards `/api/v1/health` to prompt-builder only. There is no `GET /health` at the proxy layer that checks all three upstream services. Add a dedicated proxy-level health endpoint.

- **`asyncHandler` is duplicated across all three services** — `services/ai-integration/src/utils/asyncHandler.js`, `services/prompt-builder/src/utils/asyncHandler.js`, and user-service all contain identical code. Extract to a shared `packages/shared-utils` package if a monorepo workspace is introduced.

- **HuggingFace negative prompt is hardcoded** — `services/ai-integration/src/services/huggingface.service.js` hardcodes `'blurry, bad quality, distorted, deformed'` as the negative prompt. Expose as an env var (`HF_NEGATIVE_PROMPT`) to allow tuning without code changes.

- **Zero tests for `ai-integration` and `user-service`** — Only `prompt-builder` has tests. At minimum add unit tests for `idempotency.service.js` (pending → processing → completed/failed transitions), `callService.js` (retry logic, 4xx non-retry), and `user.service.js` (register duplicate email, login invalid password).

---

## Quick Wins

1. **Fix the service JWT secret** in `services/ai-integration/src/utils/callService.js` line 22: change `env.JWT_SECRET` → `env.SERVICE_JWT_SECRET`. One-line fix, critical security impact.
2. **Add ownership check** in `services/ai-integration/src/controllers/generate.controller.js` after `getRequest()`: 2 lines prevent IDOR on generation records.
3. **Whitelist file extension** in `services/ai-integration/src/services/s3.service.js` — replace `contentType.split('/')[1]` with a safe extension map.
4. **Apply `registerSchema` to the register route** in `services/user-service/src/routes/` — `registerSchema` is already defined in the controller but never wired as middleware.
5. **Throw `ValidationError` on bad cursor** in `getUserHistory` instead of silently restarting pagination.

---

## Recommended Next Steps

1. **Fix JWT secret mismatch** (Critical) — `callService.js` must use `SERVICE_JWT_SECRET`; prompt-builder's auth must verify service-role tokens with the same secret.
2. **Replace `ScanCommand` with a GSI query for idempotency** — Add `idempotencyKeyIndex` to `scripts/create-tables.js` and rewrite `checkIdempotency` to use `QueryCommand`.
3. **Plug the IDOR in `GET /generate/:requestId`** — Add `userId` ownership assertion before returning any generation record.
4. **Persist Pollinations images to S3** — The buffer is already fetched in `pollinations.service.js`; pipe it through `uploadImageBuffer` to make URLs durable.
5. **Add integration tests for ai-integration and user-service** — Cover the full `POST /generate` flow (idempotency states, auth, background job) and user registration/login with invalid inputs.
