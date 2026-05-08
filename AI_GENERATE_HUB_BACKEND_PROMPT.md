You are an expert Node.js backend architect. Build a complete, production-ready Node.js microservices backend for an AI-powered visual generation mobile app. This is a greenfield project. Follow every specification exactly — do not substitute technologies, do not omit sections, do not add unrequested dependencies.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

App: "AI Generate Hub" — a React Native mobile app where users pick visual templates and receive AI-generated images.

User flow:
1. User opens the app and sees a grid of "Main Templates" (e.g., Victory Day, Birthday, Eid, New Year).
2. User taps one Main Template to select it (exactly one must be selected).
3. User optionally taps one or more "Object Templates" (e.g., bird, star, flag, mosque, candle, balloon).
4. User taps "Generate". The app calls the backend.
5. Backend fetches the hidden professional prompt texts for each selected template from DynamoDB, concatenates them using a defined algorithm, and calls an AI Text-to-Image API.
6. The AI image URL is returned to the app and displayed.

The hidden prompt texts are the core product IP. Users never see them — they only see friendly display names like "Victory Day" or "Bird".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — TECHNOLOGY CONSTRAINTS (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Runtime:         Node.js 20 LTS
Module system:   CommonJS (require/module.exports) throughout — no ESM, no import/export
Framework:       Express 4.x on every service
AWS SDK:         @aws-sdk/client-dynamodb AND @aws-sdk/lib-dynamodb (v3 modular) — never aws-sdk v2
DynamoDB mode:   AWS DynamoDB Local for development, real AWS for production
AI provider:     OpenAI (openai npm package v4.x) — DALL-E 3 endpoint
Auth:            JWT (jsonwebtoken package) — Bearer token in Authorization header
Validation:      Joi for all request body validation
Logging:         Winston with JSON format, level controlled by LOG_LEVEL env var
HTTP client:     Native fetch (Node 20 built-in) or axios — no node-fetch
Process manager: None (Docker handles restarts)
Test framework:  Jest with supertest for integration tests
Linter:          ESLint with eslint-config-airbnb-base rules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — MONOREPO FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create exactly this structure. Do not deviate.

aigeneratehub/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── README.md
├── services/
│   ├── prompt-builder/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── app.js
│   │       ├── routes/prompt.routes.js
│   │       ├── controllers/prompt.controller.js
│   │       ├── services/
│   │       │   ├── template.service.js
│   │       │   └── builder.service.js
│   │       ├── middleware/
│   │       │   ├── auth.middleware.js
│   │       │   ├── validate.middleware.js
│   │       │   └── rateLimiter.middleware.js
│   │       ├── config/
│   │       │   ├── db.js
│   │       │   └── env.js
│   │       ├── errors/
│   │       │   ├── AppError.js
│   │       │   └── errorHandler.js
│   │       ├── utils/logger.js
│   │       └── __tests__/
│   │           ├── prompt.routes.test.js
│   │           └── builder.service.test.js
│   │
│   ├── ai-integration/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── app.js
│   │       ├── routes/generate.routes.js
│   │       ├── controllers/generate.controller.js
│   │       ├── services/
│   │       │   ├── openai.service.js
│   │       │   └── idempotency.service.js
│   │       ├── middleware/
│   │       │   ├── auth.middleware.js
│   │       │   └── rateLimiter.middleware.js
│   │       ├── config/
│   │       │   ├── db.js
│   │       │   └── env.js
│   │       ├── errors/
│   │       │   ├── AppError.js
│   │       │   └── errorHandler.js
│   │       └── utils/
│   │           ├── logger.js
│   │           └── callService.js
│   │
│   └── user-service/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│           ├── index.js
│           ├── app.js
│           ├── routes/user.routes.js
│           ├── controllers/user.controller.js
│           ├── services/user.service.js
│           ├── middleware/
│           │   ├── auth.middleware.js
│           │   └── validate.middleware.js
│           ├── config/
│           │   ├── db.js
│           │   └── env.js
│           ├── errors/
│           │   ├── AppError.js
│           │   └── errorHandler.js
│           └── utils/logger.js
│
└── scripts/
    ├── seed-dynamodb.js
    └── create-tables.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — DYNAMODB SCHEMA (EXACT SPECIFICATIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use four separate DynamoDB tables. All tables use PAY_PER_REQUEST billing.

--- TABLE 1: MainTemplates ---
Partition key: templateId (String)
GSI: categoryIndex → partitionKey: category (String), sortKey: displayOrder (Number)

Item shape:
{
  "templateId":     "main_victory_day",
  "displayName":    "Victory Day",
  "category":       "national_holidays",
  "displayOrder":   1,
  "promptText":     "A majestic national victory celebration, golden sunlight over a grand plaza, triumphant crowds, national flags waving against a deep blue sky, cinematic composition, ultra-realistic 8K photography, warm golden-hour lighting, epic wide-angle perspective",
  "styleModifiers": ["cinematic", "ultra-realistic", "8K"],
  "aspectRatio":    "1:1",
  "isActive":       true,
  "createdAt":      "2025-01-01T00:00:00.000Z",
  "updatedAt":      "2025-01-01T00:00:00.000Z"
}

--- TABLE 2: ObjectTemplates ---
Partition key: objectId (String)
GSI: tagIndex → partitionKey: primaryTag (String), sortKey: displayOrder (Number)

Item shape:
{
  "objectId":      "obj_bird",
  "displayName":   "Bird",
  "primaryTag":    "nature",
  "displayOrder":  1,
  "promptText":    "a graceful white dove in mid-flight with wings fully spread, delicate feather detail visible, golden hour backlighting creating a halo effect",
  "promptWeight":  0.25,
  "isActive":      true,
  "createdAt":     "2025-01-01T00:00:00.000Z",
  "updatedAt":     "2025-01-01T00:00:00.000Z"
}

--- TABLE 3: GenerationRequests ---
Partition key: requestId (String, UUID v4)
GSI: userIndex → partitionKey: userId (String), sortKey: createdAt (String)
TTL attribute: expiresAt (Number, Unix epoch seconds, 30 days from creation)

Item shape:
{
  "requestId":         "uuid-v4-string",
  "idempotencyKey":    "client-uuid",
  "userId":            "user_abc123",
  "mainTemplateId":    "main_victory_day",
  "objectTemplateIds": ["obj_bird", "obj_flag"],
  "finalPrompt":       "full concatenated string",
  "status":            "pending|processing|completed|failed",
  "imageUrl":          "https://...",
  "errorMessage":      null,
  "aiModel":           "dall-e-3",
  "aiRequestId":       "openai-request-id",
  "generationMs":      1234,
  "createdAt":         "2025-01-01T00:00:00.000Z",
  "updatedAt":         "2025-01-01T00:00:00.000Z",
  "expiresAt":         1735689600
}

--- TABLE 4: Users ---
Partition key: userId (String)
GSI: emailIndex → partitionKey: email (String)

Item shape:
{
  "userId":          "user_abc123",
  "email":           "user@example.com",
  "passwordHash":    "bcrypt-hash-string",
  "displayName":     "Mert K",
  "role":            "user",
  "generationCount": 0,
  "dailyLimit":      10,
  "isActive":        true,
  "createdAt":       "2025-01-01T00:00:00.000Z",
  "updatedAt":       "2025-01-01T00:00:00.000Z"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — SEED DATA (INCLUDE VERBATIM IN seed-dynamodb.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Main Templates (5 items):

1. templateId: "main_victory_day"  | displayName: "Victory Day"    | category: "national_holidays" | displayOrder: 1
   promptText: "A majestic national victory celebration, golden sunlight over a grand plaza, triumphant crowds, national flags waving against a deep blue sky, cinematic composition, ultra-realistic 8K photography, warm golden-hour lighting, epic wide-angle perspective"
   styleModifiers: ["cinematic", "ultra-realistic", "8K"]

2. templateId: "main_birthday"     | displayName: "Birthday"       | category: "celebrations"      | displayOrder: 1
   promptText: "A joyful birthday celebration scene, colorful balloons and confetti in soft bokeh, warm candlelight, pastel color palette, dreamy and festive atmosphere, professional portrait photography style, shallow depth of field"
   styleModifiers: ["dreamy", "soft-bokeh"]

3. templateId: "main_eid"          | displayName: "Eid Mubarak"    | category: "religious"         | displayOrder: 1
   promptText: "A serene and festive Eid celebration, crescent moon and star motifs, warm lantern light, intricate geometric Islamic art patterns in background, golden and emerald color palette, cinematic composition, ultra-realistic render"
   styleModifiers: ["cinematic", "ultra-realistic"]

4. templateId: "main_new_year"     | displayName: "New Year"       | category: "celebrations"      | displayOrder: 2
   promptText: "Spectacular New Year fireworks over a city skyline at midnight, reflections in water, vibrant colors of gold silver and blue, long exposure photography effect, ultra-realistic 8K, wide cinematic shot"
   styleModifiers: ["long-exposure", "8K"]

5. templateId: "main_nature_peace" | displayName: "Nature & Peace" | category: "themes"            | displayOrder: 1
   promptText: "A tranquil natural landscape, soft morning mist over green rolling hills, golden sunrise light filtering through ancient trees, crystal clear stream, photorealistic nature photography, National Geographic style, serene and peaceful atmosphere"
   styleModifiers: ["photorealistic", "National Geographic style"]

Object Templates (6 items):

1. objectId: "obj_bird"    | displayName: "Bird"    | primaryTag: "nature"       | promptWeight: 0.25
   promptText: "a graceful white dove in mid-flight with wings fully spread, delicate feather detail visible, golden hour backlighting creating a halo effect"

2. objectId: "obj_star"    | displayName: "Star"    | primaryTag: "symbols"      | promptWeight: 0.20
   promptText: "a radiant five-pointed star with soft golden glow and subtle light rays emanating outward, elegant and symbolic"

3. objectId: "obj_flag"    | displayName: "Flag"    | primaryTag: "national"     | promptWeight: 0.30
   promptText: "a proud national flag waving gracefully in a gentle breeze, fabric texture detailed, dramatic lighting from behind"

4. objectId: "obj_mosque"  | displayName: "Mosque"  | primaryTag: "architecture" | promptWeight: 0.35
   promptText: "an elegant mosque silhouette with tall minarets against a twilight sky, intricate architectural details, warm internal lighting visible through ornate windows"

5. objectId: "obj_candle"  | displayName: "Candle"  | primaryTag: "celebration"  | promptWeight: 0.20
   promptText: "a single elegant white candle with a warm steady flame, soft wax drips, dark background with intimate bokeh glow"

6. objectId: "obj_balloon" | displayName: "Balloon" | primaryTag: "celebration"  | promptWeight: 0.20
   promptText: "clusters of colorful helium balloons tied with golden ribbon, floating upward, soft studio lighting, vibrant and cheerful"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — PROMPT CONCATENATION ALGORITHM (EXACT LOGIC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Implement exactly in builder.service.js.

STEP 1 — FETCH:
  - Fetch MainTemplate by mainTemplateId. If not found, throw NotFoundError.
  - Fetch all ObjectTemplates using BatchGetItem (not individual GetItem calls).
  - If any objectTemplateId is missing, log a warning and continue with found items.

STEP 2 — SORT OBJECTS:
  - Sort fetched object templates by promptWeight DESCENDING.
  - Highest weight = most visually important = appears first in the combined prompt.

STEP 3 — BUILD OBJECT CLAUSE:
  - First object connector: ", featuring "
  - All subsequent object connectors: ", alongside "
  - Example with bird (0.25) + flag (0.30) — flag comes first:
    ", featuring a proud national flag waving gracefully..., alongside a graceful white dove..."
  - If no objects selected: objectClause = "" (empty string, no connector appended)

STEP 4 — ASSEMBLE FINAL PROMPT:
  Template: `{mainTemplate.promptText}{objectClause}, high quality, professional digital art`
  If styleModifiers array is non-empty: also append `, ${styleModifiers.join(', ')}`
  If finalPrompt exceeds 1000 characters: remove objects from the end (lowest weight first) until
  it fits. Set truncated=true. Log a warning when truncation occurs.

STEP 5 — RETURN:
  { finalPrompt: String, truncated: Boolean, objectsUsed: String[], mainTemplateId: String }

EXAMPLE:
  Input: mainTemplateId="main_victory_day", objectTemplateIds=["obj_bird","obj_flag"]
  After sort by weight: flag(0.30) first, bird(0.25) second

  finalPrompt = "A majestic national victory celebration, golden sunlight over a grand plaza,
  triumphant crowds, national flags waving against a deep blue sky, cinematic composition,
  ultra-realistic 8K photography, warm golden-hour lighting, epic wide-angle perspective,
  featuring a proud national flag waving gracefully in a gentle breeze, fabric texture detailed,
  dramatic lighting from behind, alongside a graceful white dove in mid-flight with wings fully
  spread, delicate feather detail visible, golden hour backlighting creating a halo effect,
  high quality, professional digital art, cinematic, ultra-realistic, 8K"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — API ENDPOINT SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All services prefix all routes with /api/v1.

--- PROMPT BUILDER SERVICE (port 3001) ---

GET  /api/v1/health
  Response 200: { "status": "ok", "service": "prompt-builder", "timestamp": "<ISO8601>" }

GET  /api/v1/templates/main
  Auth: required (Bearer JWT)
  Query params: category (optional string), limit (optional int, default 20), lastKey (optional, DynamoDB pagination)
  Response 200: { "success": true, "data": { "items": [...], "count": N, "lastKey": null } }
  IMPORTANT: promptText and styleModifiers are NEVER returned to the client in this endpoint.

GET  /api/v1/templates/main/:templateId
  Auth: required
  Response 200: single item without promptText or styleModifiers

GET  /api/v1/templates/objects
  Auth: required
  Query params: primaryTag (optional), limit (optional, default 50), lastKey (optional)
  Response 200: { "success": true, "data": { "items": [...], "count": N, "lastKey": null } }
  IMPORTANT: promptText and promptWeight are NEVER returned to the client.

POST /api/v1/prompts/build
  Auth: required
  Body:
  {
    "mainTemplateId": "main_victory_day",          // required string
    "objectTemplateIds": ["obj_bird", "obj_flag"]  // optional array, max 5 items, default []
  }
  Validation: mainTemplateId required; objectTemplateIds max 5 items; each id must match /^obj_[a-z0-9_]+$/
  
  Response 200 (when caller role = "service" or "admin"):
  { "success": true, "data": { "finalPrompt": "...", "truncated": false, "objectsUsed": [...], "mainTemplateId": "..." } }
  
  Response 200 (when caller role = "user"):
  { "success": true, "data": { "buildId": "<uuid>", "objectsUsed": [...] } }
  // finalPrompt is NOT exposed to regular users — this is intentional IP protection

--- AI INTEGRATION SERVICE (port 3002) ---

GET  /api/v1/health
  Response 200: { "status": "ok", "service": "ai-integration", "timestamp": "..." }

POST /api/v1/generate
  Auth: required (user JWT)
  Headers: Idempotency-Key: <client UUID> (required)
  Body:
  {
    "mainTemplateId": "main_victory_day",
    "objectTemplateIds": ["obj_bird", "obj_flag"],
    "userId": "user_abc123"
  }
  
  Internal flow (implement exactly in this order):
    1. Validate body with Joi.
    2. Check Idempotency-Key in GenerationRequests table.
       - If found with status "completed": return 200 with cached imageUrl immediately.
       - If found with status "processing": return 202 with requestId.
    3. Create GenerationRequests record with status "pending".
    4. Call prompt-builder service POST /api/v1/prompts/build with service JWT.
    5. Update record status to "processing".
    6. Call OpenAI DALL-E 3 API.
    7. Update record status to "completed" with imageUrl and generationMs.
    8. Return 200 with result.
  
  Response 200:
  { "success": true, "data": { "requestId": "uuid", "imageUrl": "https://...", "generationMs": 3240, "status": "completed" } }
  
  Response 202 (still processing):
  { "success": true, "data": { "requestId": "uuid", "status": "processing" } }

GET  /api/v1/generate/:requestId
  Auth: required
  Response 200: full GenerationRequests item (omit aiRequestId field)

--- USER SERVICE (port 3003) ---

GET  /api/v1/health
  Response 200: { "status": "ok", "service": "user-service", "timestamp": "..." }

POST /api/v1/users/register
  No auth required
  Body: { "email": "valid email", "password": "min 8 chars", "displayName": "min 2 chars" }
  Response 201: { "success": true, "data": { "userId": "...", "email": "...", "displayName": "..." } }

POST /api/v1/users/login
  No auth required
  Body: { "email": "string", "password": "string" }
  Response 200: { "success": true, "data": { "token": "<JWT>", "userId": "...", "expiresIn": 86400 } }

GET  /api/v1/users/me
  Auth: required
  Response 200: user object without passwordHash field

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — ERROR HANDLING SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create AppError base class and the following subclasses in EVERY service's errors/ folder:

Base class: AppError extends Error
  constructor(message, statusCode, errorCode)
  properties: message, statusCode, errorCode, isOperational=true, timestamp

Subclasses (ClassName → statusCode → errorCode):
  ValidationError         → 400 → VALIDATION_ERROR
  NotFoundError           → 404 → NOT_FOUND
  UnauthorizedError       → 401 → UNAUTHORIZED
  ForbiddenError          → 403 → FORBIDDEN
  ConflictError           → 409 → CONFLICT
  RateLimitError          → 429 → RATE_LIMIT_EXCEEDED
  AIProviderError         → 502 → AI_PROVIDER_ERROR      (wraps OpenAI errors)
  DatabaseError           → 503 → DATABASE_ERROR         (wraps DynamoDB errors)
  ServiceUnavailableError → 503 → SERVICE_UNAVAILABLE

Global errorHandler.js middleware requirements:
  1. Log ALL errors with Winston including: errorCode, statusCode, stack (development only), req.id
  2. Operational errors (isOperational=true): return structured JSON response
  3. Programming errors (isOperational=false): log as CRITICAL, return generic 500
  4. NEVER leak stack traces to client in production (NODE_ENV === 'production')

Standard error response shape (always):
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Template main_unknown_id was not found",
    "requestId": "req-uuid"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — SECURITY SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JWT configuration:
  - Access token secret: JWT_SECRET env var (minimum 32 characters, validated at startup)
  - Expiry: 24h controlled by JWT_EXPIRES_IN env var
  - Two token roles: "user" (normal users) and "service" (inter-service calls)
  - Service tokens are generated at startup using SERVICE_JWT_SECRET env var with role: "service"
  - auth.middleware.js must: verify signature → check expiry → decode role → attach { userId, role } to req.user

Rate limiting (use express-rate-limit package):
  - POST /api/v1/generate:       10 requests per 15 minutes per req.user.userId (NOT per IP)
  - POST /api/v1/prompts/build:  30 requests per 1 minute per req.user.userId
  - POST /api/v1/users/login:    5 requests per 15 minutes per IP
  - All other endpoints:         100 requests per 1 minute per IP

Security middleware required on EVERY service:
  - helmet() with all defaults enabled
  - express.json({ limit: '10kb' }) — reject oversized bodies
  - Add X-Request-ID header to every request using uuid v4, attach as req.id
  - CORS: allow only origins listed in CORS_ORIGINS env var (comma-separated string)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 — ENVIRONMENT VARIABLES CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each service MUST validate required env vars at startup using Joi in config/env.js.
If any required variable is missing: log a FATAL message and call process.exit(1) immediately.

Shared variables (all services):
  NODE_ENV=development
  LOG_LEVEL=info
  JWT_SECRET=your-32-char-minimum-secret-here
  SERVICE_JWT_SECRET=service-32-char-minimum-secret
  CORS_ORIGINS=http://localhost:3000,http://localhost:8081
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=local
  AWS_SECRET_ACCESS_KEY=local
  DYNAMODB_ENDPOINT=http://localhost:8000    # only set in development/test

Prompt Builder specific:
  PORT=3001

AI Integration specific:
  PORT=3002
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=dall-e-3
  OPENAI_IMAGE_SIZE=1024x1024
  OPENAI_IMAGE_QUALITY=standard
  PROMPT_BUILDER_URL=http://prompt-builder:3001

User Service specific:
  PORT=3003
  BCRYPT_ROUNDS=12

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11 — DOCKER SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each service Dockerfile MUST:
  1. Use node:20-alpine as base image
  2. Set WORKDIR /app
  3. Copy package.json and package-lock.json FIRST (separate layer for Docker cache)
  4. Run npm ci --omit=dev (never npm install)
  5. Copy src/ directory
  6. Switch to non-root user: USER node
  7. EXPOSE the service port
  8. CMD ["node", "src/index.js"]
  9. Include HEALTHCHECK: CMD wget -qO- http://localhost:${PORT}/api/v1/health || exit 1

docker-compose.yml (production-like, no volume mounts):
  services:
    dynamodb-local:
      image: amazon/dynamodb-local:latest
      ports: ["8000:8000"]
      command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"]

    prompt-builder:
      build: ./services/prompt-builder
      ports: ["3001:3001"]
      env_file: .env
      depends_on: [dynamodb-local]
      restart: unless-stopped

    ai-integration:
      build: ./services/ai-integration
      ports: ["3002:3002"]
      env_file: .env
      depends_on: [dynamodb-local, prompt-builder]
      restart: unless-stopped

    user-service:
      build: ./services/user-service
      ports: ["3003:3003"]
      env_file: .env
      depends_on: [dynamodb-local]
      restart: unless-stopped

docker-compose.dev.yml (development override):
  - Add volume mounts for each service's src/ directory
  - Use nodemon for hot reload: command: ["npx", "nodemon", "src/index.js"]
  - Add dynamodb-admin for local DB inspection:
      dynamodb-admin:
        image: aaronshaf/dynamodb-admin
        ports: ["8001:8001"]
        environment:
          DYNAMO_ENDPOINT: http://dynamodb-local:8000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 12 — NAMING CONVENTIONS AND CODE STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File names:      kebab-case        (prompt.controller.js, template.service.js)
Variables:       camelCase         (mainTemplateId, objectTemplateIds)
Classes:         PascalCase        (AppError, TemplateService)
Constants:       SCREAMING_SNAKE   (MAX_OBJECT_TEMPLATES, DEFAULT_LIMIT)
Route paths:     kebab-case        (/main-templates, /object-templates)
DynamoDB keys:   camelCase         (templateId, displayName, promptText)
Env variables:   SCREAMING_SNAKE   (OPENAI_API_KEY, JWT_SECRET)

Mandatory code rules:
  - Every async Express route handler MUST use an asyncHandler HOF wrapper.
    Create this utility in every service's utils/asyncHandler.js:
    const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    Import and wrap every controller method with it.

  - All DynamoDB operations MUST use DynamoDBDocumentClient from @aws-sdk/lib-dynamodb.
    Never use raw DynamoDBClient directly in service files.

  - Table names MUST be read from environment variables or a constants file.
    Never hardcode table name strings in service files.

  - All exported functions MUST have JSDoc comments describing @param and @returns.

  - Every service's package.json scripts section must include:
    "start": "node src/index.js"
    "dev": "nodemon src/index.js"
    "test": "jest --coverage"
    "lint": "eslint src/"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 13 — INTER-SERVICE COMMUNICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Services communicate over HTTP REST. No message queues in Phase 1.

AI Integration → Prompt Builder communication:
  - URL: ${PROMPT_BUILDER_URL}/api/v1/prompts/build
  - Authorization: Bearer <service JWT> (role: "service")
  - Retry policy: 3 attempts with exponential backoff (100ms, 200ms, 400ms delays)
  - Per-attempt timeout: 5000ms
  - On all retries exhausted: throw ServiceUnavailableError("Prompt builder unavailable")

Implement callService(url, options) utility in utils/callService.js for every service that makes outbound HTTP calls:
  - Parameters: url (string), method (string), body (object), headers (object)
  - Automatically sets Content-Type: application/json
  - Automatically adds service JWT Authorization header
  - Throws AIProviderError for OpenAI failures, ServiceUnavailableError for inter-service failures
  - Implements retry with exponential backoff using a recursive async function (no external retry library)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 14 — TESTING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write the following tests for the prompt-builder service using Jest and Supertest.
Provide full implementations — no placeholder comments like "// TODO: implement".

services/prompt-builder/src/__tests__/prompt.routes.test.js:
  Test 1: GET /api/v1/health returns 200 with { status, service, timestamp } shape
  Test 2: GET /api/v1/templates/main without Authorization header returns 401
  Test 3: GET /api/v1/templates/main with valid JWT returns 200 with items array (mock DynamoDB)
  Test 4: POST /api/v1/prompts/build with missing mainTemplateId returns 400 ValidationError
  Test 5: POST /api/v1/prompts/build with valid body returns 200 (mock DynamoDB + builder.service)

services/prompt-builder/src/__tests__/builder.service.test.js:
  Test 1: Returns correct finalPrompt structure when no objectTemplateIds are provided
  Test 2: Sorts objects by promptWeight descending before building objectClause
  Test 3: Appends styleModifiers to finalPrompt when array is non-empty
  Test 4: Truncates prompt at 1000 characters and returns truncated: true
  Test 5: Uses ", featuring " connector for first object and ", alongside " for subsequent objects
  Test 6: Throws NotFoundError when mainTemplateId does not exist in DynamoDB

Use jest.mock() to mock the DynamoDB DocumentClient. Provide full mock return values matching the item shapes defined in Section 4.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 15 — SCRIPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

scripts/create-tables.js:
  - Read DynamoDB endpoint from DYNAMODB_ENDPOINT env var (default: http://localhost:8000)
  - Create all 4 tables (MainTemplates, ObjectTemplates, GenerationRequests, Users)
  - Use exact schemas, GSIs, and key definitions from Section 4
  - Enable TTL on GenerationRequests table using expiresAt attribute
  - Handle ResourceInUseException by logging "Table X already exists" — do NOT throw or crash
  - Log the result of each table creation

scripts/seed-dynamodb.js:
  - Call/import create-tables.js first to ensure tables exist
  - Insert all 5 Main Templates and 6 Object Templates from Section 5
  - Use BatchWriteItem for efficiency (not individual PutItem calls)
  - Idempotency: PutItem overwrites existing items, so re-running is safe
  - Log the total number of items inserted per table

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 16 — README.md REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write a README.md in the project root. Include all of the following sections:

  1. Architecture diagram in ASCII art showing:
     React Native App → [prompt-builder :3001] → DynamoDB Local
                      → [ai-integration :3002] → OpenAI DALL-E 3
                      → [user-service :3003]

  2. Prerequisites: Node.js 20, Docker, Docker Compose

  3. Quick start (exact commands):
     git clone ...
     cp .env.example .env       # fill in OPENAI_API_KEY and JWT_SECRET
     docker-compose up -d
     node scripts/seed-dynamodb.js

  4. API reference table with columns: Method | Path | Service | Auth Required | Description

  5. Environment variables table: Variable | Service | Required | Default | Description

  6. How to run tests: cd services/prompt-builder && npm test

  7. How to add a new Main Template (step-by-step DynamoDB PutItem example)

  8. Future roadmap section mentioning: AWS Cognito integration, S3 for image storage,
     social sharing feature, image history with pagination, Kubernetes deployment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 17 — AWS API GATEWAY INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All three microservices are exposed through a single AWS API Gateway (HTTP API type, not REST API).
API Gateway acts as the single entry point for the React Native app — it routes requests to the
correct service, handles CORS centrally, and enforces JWT authorization.

--- ARCHITECTURE ---

React Native App
      │
      ▼
AWS API Gateway (HTTP API)  ←── single public URL
      │
      ├── /api/v1/templates/*  ──►  prompt-builder  (port 3001)
      ├── /api/v1/prompts/*    ──►  prompt-builder  (port 3001)
      ├── /api/v1/generate/*   ──►  ai-integration  (port 3002)
      └── /api/v1/users/*      ──►  user-service    (port 3003)

--- INTEGRATION TYPE ---

Use HTTP integration (not Lambda proxy). Each route forwards directly to the
corresponding service's URL via VPC Link (for production) or public URL (for development).

Integration target URLs:
  prompt-builder targets:  ${PROMPT_BUILDER_URL}
  ai-integration targets:  ${AI_INTEGRATION_URL}
  user-service targets:    ${USER_SERVICE_URL}

--- ROUTE MAPPING ---

Define the following routes in API Gateway and map to the correct backend service:

  ANY /api/v1/health                      → prompt-builder /api/v1/health
  GET /api/v1/templates/main              → prompt-builder /api/v1/templates/main
  GET /api/v1/templates/main/{templateId} → prompt-builder /api/v1/templates/main/{templateId}
  GET /api/v1/templates/objects           → prompt-builder /api/v1/templates/objects
  POST /api/v1/prompts/build              → prompt-builder /api/v1/prompts/build
  POST /api/v1/generate                   → ai-integration /api/v1/generate
  GET /api/v1/generate/{requestId}        → ai-integration /api/v1/generate/{requestId}
  POST /api/v1/users/register             → user-service /api/v1/users/register
  POST /api/v1/users/login                → user-service /api/v1/users/login
  GET /api/v1/users/me                    → user-service /api/v1/users/me

--- JWT AUTHORIZER ---

Configure a JWT authorizer on API Gateway level:
  - Issuer: the URL of the user-service (or AWS Cognito issuer URL in the future)
  - Audience: ["aigeneratehub-api"]
  - Token source: $request.header.Authorization (Bearer token)
  - The authorizer validates the JWT before the request ever reaches a microservice.

Attach the JWT authorizer to ALL routes EXCEPT:
  - POST /api/v1/users/register  (no auth needed)
  - POST /api/v1/users/login     (no auth needed)
  - GET /api/v1/health routes    (no auth needed)

Each service's auth.middleware.js still performs its own JWT check as a second layer of defense.
The API Gateway authorizer is the first line, the service middleware is the second.

--- CORS CONFIGURATION ---

Configure CORS at the API Gateway level (do NOT rely solely on Express helmet/cors middleware):
  AllowOrigins:  value of CORS_ORIGINS env var
  AllowMethods:  GET, POST, PUT, DELETE, OPTIONS
  AllowHeaders:  Content-Type, Authorization, Idempotency-Key, X-Request-ID
  ExposeHeaders: X-Request-ID
  MaxAge:        300

--- PASSTHROUGH HEADERS ---

API Gateway must pass through the following headers to backend services unchanged:
  - Authorization
  - Idempotency-Key
  - X-Request-ID
  - Content-Type

--- INFRASTRUCTURE-AS-CODE (IaC) ---

Create a new top-level directory: infrastructure/

Create infrastructure/api-gateway.json — an AWS CloudFormation template (JSON format) that defines:

  1. AWS::ApiGatewayV2::Api
     - ProtocolType: HTTP
     - Name: aigeneratehub-api
     - CorsConfiguration: as specified above

  2. AWS::ApiGatewayV2::Authorizer
     - AuthorizerType: JWT
     - IdentitySource: $request.header.Authorization
     - JwtConfiguration:
         Audience: ["aigeneratehub-api"]
         Issuer: !Sub "https://${UserServiceDomain}"  (parameterized)

  3. AWS::ApiGatewayV2::Integration (one per service)
     - IntegrationType: HTTP_PROXY
     - IntegrationMethod: ANY
     - PayloadFormatVersion: "1.0"
     - IntegrationUri: parameterized (PROMPT_BUILDER_URL, AI_INTEGRATION_URL, USER_SERVICE_URL)

  4. AWS::ApiGatewayV2::Route (one per route listed in ROUTE MAPPING above)
     - RouteKey: "METHOD /path"
     - AuthorizationType: JWT (for protected routes) or NONE (for public routes)
     - AuthorizerId: !Ref JwtAuthorizer

  5. AWS::ApiGatewayV2::Stage
     - StageName: "$default" (auto-deploy enabled)

  6. CloudFormation Parameters:
     - PromptBuilderUrl (String)
     - AiIntegrationUrl (String)
     - UserServiceUrl (String)
     - CorsOrigins (String)

Also create infrastructure/deploy.sh — a shell script that deploys the CloudFormation stack:
  aws cloudformation deploy \
    --template-file infrastructure/api-gateway.json \
    --stack-name aigeneratehub-api-gateway \
    --parameter-overrides \
      PromptBuilderUrl=$PROMPT_BUILDER_URL \
      AiIntegrationUrl=$AI_INTEGRATION_URL \
      UserServiceUrl=$USER_SERVICE_URL \
      CorsOrigins=$CORS_ORIGINS

--- LOCAL DEVELOPMENT PROXY ---

For local development (when API Gateway is not available), create infrastructure/local-proxy.js
using http-proxy-middleware to replicate the same routing table locally:
  - Run on port 4000
  - Route /api/v1/templates/* and /api/v1/prompts/* → http://localhost:3001
  - Route /api/v1/generate/* → http://localhost:3002
  - Route /api/v1/users/* → http://localhost:3003
  - Pass through all headers including Authorization and Idempotency-Key

Add to docker-compose.dev.yml:
  local-proxy:
    build:
      context: ./infrastructure
      dockerfile: Dockerfile.proxy
    ports: ["4000:4000"]
    depends_on: [prompt-builder, ai-integration, user-service]

The React Native app should point to http://localhost:4000 in development and the
API Gateway URL in production. Manage this via an API_BASE_URL env var.

--- ENVIRONMENT VARIABLES ADDITIONS ---

Add to .env.example:
  API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
  AI_INTEGRATION_URL=http://ai-integration:3002     # used by API Gateway integration
  USER_SERVICE_URL=http://user-service:3003          # used by API Gateway integration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 18 — DELIVERY CHECKLIST (UPDATED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Produce ALL files listed below. Do not skip any. If a file would be long, prioritize
correctness and completeness over brevity.

Root level:
[ ] docker-compose.yml
[ ] docker-compose.dev.yml
[ ] .env.example
[ ] .gitignore
[ ] README.md

services/prompt-builder/:
[ ] Dockerfile
[ ] package.json
[ ] src/index.js
[ ] src/app.js
[ ] src/config/env.js
[ ] src/config/db.js
[ ] src/utils/logger.js
[ ] src/utils/asyncHandler.js
[ ] src/errors/AppError.js
[ ] src/errors/errorHandler.js
[ ] src/middleware/auth.middleware.js
[ ] src/middleware/validate.middleware.js
[ ] src/middleware/rateLimiter.middleware.js
[ ] src/routes/prompt.routes.js
[ ] src/controllers/prompt.controller.js
[ ] src/services/template.service.js
[ ] src/services/builder.service.js
[ ] src/__tests__/prompt.routes.test.js
[ ] src/__tests__/builder.service.test.js

services/ai-integration/:
[ ] Dockerfile
[ ] package.json
[ ] src/index.js
[ ] src/app.js
[ ] src/config/env.js
[ ] src/config/db.js
[ ] src/utils/logger.js
[ ] src/utils/asyncHandler.js
[ ] src/utils/callService.js
[ ] src/errors/AppError.js
[ ] src/errors/errorHandler.js
[ ] src/middleware/auth.middleware.js
[ ] src/middleware/rateLimiter.middleware.js
[ ] src/routes/generate.routes.js
[ ] src/controllers/generate.controller.js
[ ] src/services/openai.service.js
[ ] src/services/idempotency.service.js

services/user-service/:
[ ] Dockerfile
[ ] package.json
[ ] src/index.js
[ ] src/app.js
[ ] src/config/env.js
[ ] src/config/db.js
[ ] src/utils/logger.js
[ ] src/utils/asyncHandler.js
[ ] src/errors/AppError.js
[ ] src/errors/errorHandler.js
[ ] src/middleware/auth.middleware.js
[ ] src/middleware/validate.middleware.js
[ ] src/routes/user.routes.js
[ ] src/controllers/user.controller.js
[ ] src/services/user.service.js

Scripts:
[ ] scripts/create-tables.js
[ ] scripts/seed-dynamodb.js

Infrastructure (API Gateway):
[ ] infrastructure/api-gateway.json        (CloudFormation template)
[ ] infrastructure/deploy.sh               (deployment script)
[ ] infrastructure/local-proxy.js          (local dev proxy, port 4000)
[ ] infrastructure/Dockerfile.proxy        (Docker image for local-proxy)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
