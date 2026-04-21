# Deploy Now Checklist

Use this as the exact sequence for taking the app live on Render + Vercel.

For copy-paste variable values, use `DEPLOY_SECRETS_TEMPLATE.md`.

## 1) MongoDB Atlas

1. Create project and cluster.
2. Create database user.
3. Add IP access `0.0.0.0/0` (or strict allowlist for your hosts).
4. Copy connection string for `MONGO_URI`.

## 2) Render Backend Service

Use `render.yaml` from repo root.

Required environment values to fill in Render:

- `CLIENT_URL=https://<your-vercel-domain>`
- `MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`
- `JWT_SECRET=<long-random-secret>`
- `JWT_REFRESH_SECRET=<long-random-secret>`
- `SMTP_HOST=<smtp-host>`
- `SMTP_USER=<smtp-user>`
- `SMTP_PASS=<smtp-pass>`
- `SMTP_FROM=<from-email>`
- `CLOUDINARY_CLOUD_NAME=<cloud-name>`
- `CLOUDINARY_API_KEY=<api-key>`
- `CLOUDINARY_API_SECRET=<api-secret>`

Already defaulted in `render.yaml`:

- `NODE_ENV=production`
- `PORT=5000`
- `DEFAULT_CURRENCY=PKR`
- `DEFAULT_TAX_RATE=18`
- `AUTH_LOCK_MAX_ATTEMPTS=5`
- `AUTH_LOCK_MINUTES=30`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=200`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `ENABLE_DAILY_SUMMARY_SCHEDULER=true`
- `DAILY_SUMMARY_HOUR=20`

After first deploy, copy backend URL:

- `https://<render-service>.onrender.com`

## 3) Vercel Frontend Project

Set project root to `client`.

Required environment values in Vercel:

- `VITE_NODE_ENV=production`
- `VITE_APP_NAME=Mujahid Electronic Goods`
- `VITE_API_URL=https://<render-service>.onrender.com/api`
- `VITE_WS_URL=https://<render-service>.onrender.com`
- `VITE_DEFAULT_CURRENCY=PKR`
- `VITE_DEFAULT_LOCALE=en-PK`
- `VITE_DEFAULT_TAX_RATE=18`
- `VITE_SHOP_NAME=Mujahid Electronic Goods`
- `VITE_ENABLE_INVOICE_EMAIL=true`
- `VITE_SENTRY_DSN=<optional>`
- `VITE_SENTRY_TRACES_SAMPLE_RATE=0`

After deploy, copy frontend URL and update Render `CLIENT_URL` to that exact URL.

## 4) GitHub Actions Secrets

Repository -> Settings -> Secrets and variables -> Actions:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_URL`

## 5) Final Smoke Test

1. Open app, login with seeded admin.
2. Create product.
3. Perform checkout on POS.
4. Verify sale appears in sales page.
5. Click send invoice email.
6. Open dashboard and verify chart/card refresh.

## 6) If CORS Fails

- Ensure Render `CLIENT_URL` exactly matches your Vercel production URL including protocol.
- Redeploy backend after changing `CLIENT_URL`.
