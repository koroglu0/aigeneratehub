# AI Generate Hub — Copilot Instructions

Before doing any work, read [AGENTS.md](../AGENTS.md) for the full project architecture, conventions, service layout, API contracts, and development instructions.

Key facts:
- React Native (Expo) frontend + Node.js microservices (prompt-builder :3001, ai-integration :3002, user-service :3003) behind local-proxy :4000
- AWS DynamoDB (eu-north-1) — no local DynamoDB
- All backend responses use `{ success, data }` envelope
- Backend field names differ from frontend types (e.g. `templateId` → `id`, `displayName` → `name`)
- Docker dev stack: `docker-compose -f docker-compose.dev.yml up -d --build`
- Shared suggestion file: `docs/suggestions.md` (written by Project Advisor, consumed by other agents)
