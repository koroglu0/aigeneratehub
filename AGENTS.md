# AI Generate Hub — Agent Instructions

React Native mobile app + Node.js microservices backend generating AI images via DALL-E 3.

## Architecture

```
Android/iOS App (Expo)
  └─► local-proxy :4000
        ├─ /api/v1/templates, /api/v1/prompts  → prompt-builder :3001
        ├─ /api/v1/generate                    → ai-integration  :3002
        └─ /api/v1/users                       → user-service    :3003
```

All services connect to **AWS DynamoDB** (region: `eu-north-1`). No local DynamoDB — do not add `DYNAMODB_ENDPOINT` back to `.env`.

## Running the backend

```bash
# Development (hot-reload via nodemon)
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs <service-name> -f

# Rebuild a single service after code changes
docker-compose -f docker-compose.dev.yml up -d --build <service-name>
```

## Running the frontend

```bash
cd frontend/aigeneratehub-app
npx expo start --clear      # --clear resets Metro cache (use when code changes aren't picked up)
```

Android emulator connects to host via `http://10.0.2.2:4000` (set in `frontend/aigeneratehub-app/.env`).

## Prompt concatenation algorithm (builder.service.js)

The core IP — never exposed to users:
1. Fetch `MainTemplate` (throw `NotFoundError` if missing), batch-fetch `ObjectTemplate`s
2. Sort objects by `promptWeight` **descending** (highest = most important = appears first)
3. Build object clause: first object uses `", featuring "` connector, rest use `", alongside "`
4. Final: `{mainTemplate.promptText}{objectClause}, high quality, professional digital art, {styleModifiers.join(', ')}`
5. If > 1000 chars: drop lowest-weight objects until it fits, set `truncated: true`

## Generation flow (ai-integration — exact order)

`POST /api/v1/generate` internal steps:
1. Validate body (Joi)
2. Check `Idempotency-Key` in `GenerationRequests` — if `completed` return 200 cached; if `processing` return 202
3. Create record with `status: "pending"`
4. Call `POST /api/v1/prompts/build` on prompt-builder with **service JWT** (`role: "service"`)
5. Update record → `status: "processing"`, return **202** to client immediately
6. Call OpenAI DALL-E 3 asynchronously
7. Update record → `status: "completed"`, `imageUrl`

Frontend polls `GET /api/v1/generate/:requestId` every 3s until `status` is `completed` or `failed`.

## Inter-service communication

- AI-integration → prompt-builder uses `SERVICE_JWT_SECRET` (role: `"service"`) in Authorization header
- Retry: 3 attempts, exponential backoff 100ms → 200ms → 400ms, 5000ms per-attempt timeout
- Rate limit on `POST /api/v1/generate`: 10 req / 15 min **per userId** (not per IP)

## Critical conventions

### API response envelope
Every backend response uses this shape — the frontend must unwrap accordingly:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "requestId": "..." } }
```

Paginated list endpoints return `data: { items: [], count: N, lastKey: null }`, not a bare array.

### Frontend API layer
All API functions in `src/api/*.ts` must unwrap the envelope before returning:
```ts
// Correct — paginated list
apiClient.get('/api/v1/templates/main').then(r => r.data.data.items)
// Correct — single object
apiClient.get('/api/v1/users/me').then(r => r.data.data)
// Wrong — returns { success, data } object
apiClient.get('/...').then(r => r.data)
```

### Backend field names vs frontend types
| Backend | Frontend (`src/types/`) |
|---|---|
| `templateId` | `id` |
| `objectId` | `id` |
| `displayName` | `name` |
| `userId` | `id` |
| `register` body field: `displayName` | `RegisterRequest.displayName` |

### GeneratingScreen — polling behavior
- `POST /api/v1/generate` with `Idempotency-Key` header (required, UUID v4)
- Response `200` → navigate directly to Result (no polling)
- Response `202` → start polling `GET /api/v1/generate/:requestId` every 3s
- Android hardware back button must be disabled while generating

### Environment variables — PORT conflict
All services share the same `.env` via `env_file: .env`, and `.env` has `PORT=3001`. Docker Compose overrides PORT per service with `environment: PORT: "3002"` / `"3003"`. Never remove these overrides.

### Proxy path rewriting
`infrastructure/local-proxy.js` uses `http-proxy-middleware`. Express strips the path prefix before the middleware sees it. Each proxy rule uses `pathRewrite: (p) => '/api/v1/<route>' + p` to restore the full path.

### Authentication
- JWT Bearer token, signed with `JWT_SECRET`
- Frontend stores token in `expo-secure-store`, attaches via axios interceptor
- Backend: `authMiddleware.js` verifies token, attaches `req.user = { userId, role }`
- 401 response → frontend auto-clears token and redirects to login

## DynamoDB tables

| Table | PK | GSI |
|---|---|---|
| `Users` | `userId` | `emailIndex` on `email` |
| `MainTemplates` | `templateId` | `categoryIndex` on `category + displayOrder` |
| `ObjectTemplates` | `objectId` | `tagIndex` on `primaryTag + displayOrder` |
| `GenerationRequests` | `requestId` | `userIndex` on `userId + createdAt`; TTL on `expiresAt` |

Create/recreate tables: `node scripts/create-tables.js` (targets real AWS, no `DYNAMODB_ENDPOINT` needed).

## Backend service structure

All three services follow the same layout:
```
src/
├── config/env.js          # Joi-validated env vars — add new vars here first
├── config/db.js           # DynamoDB DocumentClient + TABLE_NAMES
├── controllers/           # HTTP layer: parse → call service → respond
├── services/              # Business logic + DynamoDB queries
├── middleware/            # auth, validate, rateLimiter
├── routes/
├── errors/AppError.js     # Custom error classes (NotFoundError, ConflictError, …)
└── errors/errorHandler.js # Global error handler (last middleware in app.js)
```

All async route handlers are wrapped with `asyncHandler(fn)` — never use try/catch in controllers.

## Key files

- [`infrastructure/local-proxy.js`](infrastructure/local-proxy.js) — dev proxy, pathRewrite logic
- [`docker-compose.dev.yml`](docker-compose.dev.yml) — dev containers with PORT overrides
- [`.env`](.env) — shared env (never commit real secrets)
- [`scripts/create-tables.js`](scripts/create-tables.js) — DynamoDB table definitions
- [`scripts/seed-dynamodb.js`](scripts/seed-dynamodb.js) — seed template data
- [`frontend/aigeneratehub-app/src/api/`](frontend/aigeneratehub-app/src/api/) — all HTTP calls, envelope unwrapping
- [`frontend/aigeneratehub-app/src/store/`](frontend/aigeneratehub-app/src/store/) — Zustand stores (auth + selection)
