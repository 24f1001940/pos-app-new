# Deployment Secrets Value Template

Fill these once and paste directly into each platform.

## A) GitHub Actions Secrets

Set in: Repository -> Settings -> Secrets and variables -> Actions

- VERCEL_TOKEN=<your-vercel-token>
- VERCEL_ORG_ID=<your-vercel-org-id>
- VERCEL_PROJECT_ID=<your-vercel-project-id>
- RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-xxxxxxxx?key=xxxxxxxx

## B) Render Environment Variables (Backend)

Set in your Render service environment:

- NODE_ENV=production
- APP_NAME=Mujahid Electronic Goods API
- PORT=5000
- CLIENT_URL=https://<your-vercel-domain>
- MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
- JWT_SECRET=<generate-64-plus-char-random-string>
- JWT_EXPIRES_IN=7d
- JWT_REFRESH_SECRET=<generate-64-plus-char-random-string>
- JWT_REFRESH_EXPIRES_IN=30d
- DEFAULT_CURRENCY=PKR
- DEFAULT_TAX_RATE=18
- AUTH_LOCK_MAX_ATTEMPTS=5
- AUTH_LOCK_MINUTES=30
- RATE_LIMIT_WINDOW_MS=900000
- RATE_LIMIT_MAX_REQUESTS=200
- SMTP_HOST=<smtp-host>
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=<smtp-user>
- SMTP_PASS=<smtp-password-or-app-password>
- SMTP_FROM=<from-email-address>
- ENABLE_DAILY_SUMMARY_SCHEDULER=true
- DAILY_SUMMARY_HOUR=20
- CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
- CLOUDINARY_API_KEY=<cloudinary-api-key>
- CLOUDINARY_API_SECRET=<cloudinary-api-secret>
- STRIPE_SECRET_KEY=<optional-or-empty>

## C) Vercel Environment Variables (Frontend)

Set in Vercel project settings -> Environment Variables:

- VITE_NODE_ENV=production
- VITE_APP_NAME=Mujahid Electronic Goods
- VITE_API_URL=https://<your-render-domain>/api
- VITE_WS_URL=https://<your-render-domain>
- VITE_DEFAULT_CURRENCY=PKR
- VITE_DEFAULT_LOCALE=en-PK
- VITE_DEFAULT_TAX_RATE=18
- VITE_SHOP_NAME=Mujahid Electronic Goods
- VITE_ENABLE_INVOICE_EMAIL=true
- VITE_SENTRY_DSN=<optional-or-empty>
- VITE_SENTRY_TRACES_SAMPLE_RATE=0

## D) Domain Consistency Rules

- CLIENT_URL must exactly match your live Vercel URL, including https.
- VITE_API_URL must point to Render backend with /api suffix.
- VITE_WS_URL must point to the same Render backend without /api.

## E) Post-Deploy Quick Verification

1. Login works.
2. Product CRUD works.
3. POS checkout succeeds.
4. Sales list updates and dashboard refreshes.
5. Invoice email sends.
