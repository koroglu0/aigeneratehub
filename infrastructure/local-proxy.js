'use strict';

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const PROMPT_BUILDER = process.env.PROMPT_BUILDER_URL || 'http://localhost:3001';
const AI_INTEGRATION = process.env.AI_INTEGRATION_URL || 'http://localhost:3002';
const USER_SERVICE   = process.env.USER_SERVICE_URL   || 'http://localhost:3003';

// eslint-disable-next-line no-console
console.log('Proxy targets:', { PROMPT_BUILDER, AI_INTEGRATION, USER_SERVICE });

function makeProxy(target, prefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (p) => `${prefix}${p}`,
    on: {
      proxyReq: (proxyReq, req) => {
        ['authorization', 'idempotency-key', 'x-request-id', 'content-type'].forEach((header) => {
          if (req.headers[header]) proxyReq.setHeader(header, req.headers[header]);
        });
        // eslint-disable-next-line no-console
        console.log(`[PROXY] ${req.method} ${req.originalUrl} → ${target}${proxyReq.path}`);
      },
      error: (err, req, res) => {
        // eslint-disable-next-line no-console
        console.error(`[PROXY ERROR] ${req.method} ${req.originalUrl} → ${target}`, err.message, err.code);
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: `Cannot reach upstream service at ${target}`,
            detail: err.message,
            errCode: err.code,
          },
        });
      },
    },
  });
}

app.use('/api/v1/templates', makeProxy(PROMPT_BUILDER, '/api/v1/templates'));
app.use('/api/v1/prompts',   makeProxy(PROMPT_BUILDER, '/api/v1/prompts'));
app.use('/api/v1/generate',  makeProxy(AI_INTEGRATION, '/api/v1/generate'));
app.use('/api/v1/models',    makeProxy(AI_INTEGRATION, '/api/v1/models'));
app.use('/api/v1/users',     makeProxy(USER_SERVICE,   '/api/v1/users'));

// Proxy-level health aggregator: checks all three upstream services.
app.get('/health', async (req, res) => {
  const upstreams = [
    { name: 'prompt-builder', url: `${PROMPT_BUILDER}/api/v1/health` },
    { name: 'ai-integration', url: `${AI_INTEGRATION}/api/v1/health` },
    { name: 'user-service',   url: `${USER_SERVICE}/api/v1/health` },
  ];

  const results = await Promise.all(
    upstreams.map(async ({ name, url }) => {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return { name, status: resp.ok ? 'ok' : 'degraded', httpStatus: resp.status };
      } catch (err) {
        return { name, status: 'unreachable', error: err.message };
      }
    }),
  );

  const allOk = results.every((r) => r.status === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

app.listen(4000, () => {
  // eslint-disable-next-line no-console
  console.log('Local proxy running on http://localhost:4000');
});
