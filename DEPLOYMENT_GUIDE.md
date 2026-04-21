# Production Deployment Guide

## 1. Environment Setup

1. Backend: copy `server/.env.production` to your platform env settings.
2. Frontend: copy `client/.env.production` to Vercel/Netlify env settings.
3. Never expose backend secrets in frontend variables.
4. Use `server/.env.development` and `client/.env.development` for local work; keep production secrets out of source control.

## 2. Backend Deployment (Render/Railway/AWS)

1. Build command: `npm install --prefix server`
2. Start command: `npm start --prefix server`
3. Required env vars:
- `NODE_ENV=production`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `DEFAULT_CURRENCY`
- `DEFAULT_TAX_RATE`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SENTRY_DSN` if monitoring is enabled

## 3. Frontend Deployment (Vercel/Netlify)

1. Build command: `npm install --prefix client && npm run build --prefix client`
2. Publish directory: `client/dist`
3. Required env vars:
- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_DEFAULT_CURRENCY`
- `VITE_DEFAULT_LOCALE`
- `VITE_SENTRY_DSN` if monitoring is enabled

## 4. Realtime Sync Requirements

1. Ensure backend Socket.io uses the same domain as API (or a trusted dedicated WS domain).
2. Set frontend `VITE_WS_URL` to backend base URL (without `/api`).
3. Keep `CLIENT_URL` strict in backend env so only trusted frontend domains can connect.

## 5. Offline Queue Behavior

1. POS offline checkout queues sales in IndexedDB (falls back to localStorage if needed).
2. On reconnect, queued operations auto-sync to backend.
3. Keep authentication valid; queued requests still require valid JWT when syncing.

## 6. Desktop Deployment (Electron)

1. Build renderer: `npm run build --prefix client`
2. Build desktop installers:
- Windows: `npm run desktop:build:win`
- macOS: `npm run desktop:build:mac`
3. Artifacts are generated in `desktop-dist/`.

## 7. Docker Deployment

Use one command for local production-like stack:

```bash
docker compose up --build
```

Services:
- Client: `http://localhost:5173`
- API: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`

## 8. Monitoring and Logs

- Health check endpoint: `GET /api/health`
- Structured logs via Winston + Morgan.
- Suggested external monitoring: uptime checks + log aggregation (Datadog/ELK).
- Backend health includes uptime and memory metadata for liveness/readiness checks.

## 9. Security Checklist

- HTTPS enabled on frontend/backend domains.
- Strict `CLIENT_URL` configured.
- Strong JWT secrets configured.
- Rate limiting enabled.
- Request sanitization enabled.
- Cloudinary/SMTP secrets stored only in backend env.
- Frontend env files only contain `VITE_` variables that are safe to expose.

## 10. Load Testing

Run k6 smoke load test:

```bash
k6 run scripts/load-test.k6.js
```

Override target URL:

```bash
k6 run -e BASE_URL=https://your-api-domain.com scripts/load-test.k6.js
```

## 11. GitHub Actions Auto Deployment

Two workflows are included:

- `.github/workflows/deploy-frontend-vercel.yml`
- `.github/workflows/deploy-backend-render.yml`

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_URL`

Behavior:

- Frontend deploy runs on changes under `client/**` and manual dispatch.
- Backend deploy runs on changes under `server/**`, `render.yaml`, and manual dispatch.
