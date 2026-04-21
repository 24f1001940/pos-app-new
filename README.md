# Mujahid Electronic Goods

Full-stack retail shop management, POS, and analytics platform for electronics businesses.

## Stack

- Frontend: React + Vite + Tailwind CSS + shadcn-style UI + Recharts
- Backend: Node.js + Express REST API
- Database: MongoDB with Mongoose
- Desktop: Electron with secure preload bridge
- Auth: JWT + bcrypt
- Media: Cloudinary image uploads with local fallback for development
- Testing: Jest + Supertest

## Project Structure

```text
.
├── client
│   ├── components.json
│   ├── src
│   │   ├── components
│   │   ├── context
│   │   ├── hooks
│   │   ├── lib
│   │   └── pages
│   └── vercel.json
├── postman
│   └── mujahid-electronic-goods.postman_collection.json
├── render.yaml
├── server
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── middlewares
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   ├── utils
│   │   ├── validators
│   │   └── scripts
│   └── tests
└── package.json
```

## Step 1. Project Setup

1. Install dependencies:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. Copy environment files:

```bash
copy server\\.env.example server\\.env
copy client\\.env.example client\\.env
```

3. Start MongoDB locally or point `server/.env` to MongoDB Atlas.

4. Seed demo data:

```bash
npm run seed
```

5. Run the full stack:

```bash
npm run dev
```

6. Run desktop app in development mode:

```bash
npm run desktop:dev
```

## Step 2. Backend API

Implemented in [server/src/app.js](/c:/Users/saqib/electronic/server/src/app.js:1) with:

- JWT auth and bootstrap admin registration
- Product CRUD with search and inventory filters
- POS checkout with stock validation and automatic stock reduction
- Sales history, deletion, and stock restoration
- Dashboard analytics for revenue, top sellers, and category mix
- Settings, backup, restore, and system reset
- Cloudinary-powered image upload endpoint

Core routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/sales`
- `POST /api/sales`
- `DELETE /api/sales/:id`
- `GET /api/dashboard`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/uploads/image`

## Step 3. Frontend UI

Implemented in [client/src/App.jsx](/c:/Users/saqib/electronic/client/src/App.jsx:1) and `client/src/pages/*` with:

- Responsive dashboard shell with sidebar and dark mode
- Product management workflow with modal forms and image upload
- Fast POS billing screen with GST calculations and receipt actions
- Sales ledger with filters, PDF download, and print support
- Settings screen for shop profile, backup/restore, and reset
- LocalStorage-backed cache fallback for dashboard, products, sales, and settings

## Step 4. Integration

- Auth state is stored in LocalStorage and attached through Axios interceptors
- React Query handles fetching, mutation invalidation, and stale data
- Receipt generation uses `jsPDF` and is lazy-loaded in production builds
- The frontend expects `VITE_API_URL`; backend CORS is configured for the client origin
- Realtime sync uses Socket.io for notifications, stock updates, product updates, and sales updates
- POS supports offline sale queueing (IndexedDB with localStorage fallback) and auto-sync on reconnect

## Step 5. Desktop App (Electron)

Electron runtime files are in `electron/`:

- `electron/main.cjs`: BrowserWindow lifecycle, secure IPC, local cache/file handlers
- `electron/preload.cjs`: safe renderer bridge (`window.megDesktop`)

Desktop features:

- Wraps the same React frontend used by web
- Native print pipeline for invoices
- Local cache/file access bridge for desktop workflows

Desktop build commands:

```bash
npm run desktop:build:win
npm run desktop:build:mac
```

Installers output in `desktop-dist/`.

## Phase 1: Security, Products, Inventory

Implemented backend upgrades:

- Role expansion to `admin`, `manager`, and `staff`
- Permission-based route checks for products and inventory
- JWT access + refresh token flow with logout and logout-all support
- Login lockout after repeated failed attempts
- Activity logs for authentication events
- Auto-generated SKU and barcode fields on products
- Product metadata for tags, supplier, warranty, expiry, and variants
- Warehouse entities and warehouse-to-warehouse stock transfers
- Inventory stock records and stock movement history
- Warehouse-aware sales and sale reversals

New API routes:

- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/activity-logs`
- `GET /api/products/:id/history`
- `GET /api/inventory/summary`
- `GET /api/inventory/warehouses`
- `POST /api/inventory/warehouses`
- `POST /api/inventory/transfers`
- `GET /api/inventory/products/:productId/movements`

New environment variables:

- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `AUTH_LOCK_MAX_ATTEMPTS`
- `AUTH_LOCK_MINUTES`

## Phase 2: POS, Sales, Customers

Implemented backend and frontend upgrades:

- Customer database with profiles, purchase history, loyalty points, and credit balance
- Sales now store customer, salesperson, discount, split payments, notes, and status metadata
- POS supports customer lookup, split payments, discounts, and notes
- Held POS drafts can be saved, resumed, and deleted
- Sales history shows customer and payment status details

New API routes:

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `GET /api/customers/:id/sales`
- `GET /api/pos-drafts`
- `POST /api/pos-drafts`
- `PUT /api/pos-drafts/:id`
- `DELETE /api/pos-drafts/:id`

Checkout payload additions:

- `customerId`, `customerName`, `customerPhone`, `customerEmail`
- `salespersonId`
- `discountType`, `discountValue`
- `payments[]` and `amountPaid`
- `notes`

## Phase 3: Analytics, Notifications, Realtime

Implemented backend and frontend upgrades:

- Advanced analytics overview endpoint with revenue trends (daily/weekly/monthly/yearly)
- Profit and loss metrics, revenue growth, category performance, and inventory turnover stats
- Customer segmentation analytics and top-customer insights
- CSV export for sales and analytics summary reports
- Realtime in-app notifications via WebSocket subscriptions
- Notification center in navbar with unread badge, mark-read, and mark-all-read actions
- Automatic low-stock alerts with optional email delivery
- Sale completion notifications including pending-balance warnings
- Scheduler hook for daily summary notification generation

New API routes:

- `GET /api/analytics/overview`
- `GET /api/analytics/export?report=sales|summary`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

New environment variables:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `ENABLE_NOTIFICATION_EMAILS`
- `ENABLE_DAILY_SUMMARY_SCHEDULER`

## Phase 4: Finance, Expenses, Procurement

Implemented backend and frontend upgrades:

- Supplier management with contact details, terms, and opening balances
- Expense ledger with category/date filtering and creator attribution
- Purchase order workflow with line items, taxes, paid vs due tracking, and status transitions
- Receive-stock action for purchase orders that posts inventory movements into warehouses
- Finance summary metrics for revenue, expense, net profit, and supplier payable exposure
- New finance workspace pages for Suppliers, Expenses, and Procurement

New API routes:

- `GET /api/finance/summary`
- `GET /api/finance/suppliers`
- `POST /api/finance/suppliers`
- `PUT /api/finance/suppliers/:id`
- `GET /api/finance/expenses`
- `POST /api/finance/expenses`
- `GET /api/finance/purchase-orders`
- `POST /api/finance/purchase-orders`
- `PATCH /api/finance/purchase-orders/:id/status`

## Phase 5: DevOps, AI, and PWA Foundations

Implemented backend and frontend upgrades:

- AI insights API for demand forecasting, sales recommendations, low-stock hotspots, and basic fraud signal detection
- Dedicated AI Insights page in frontend workspace
- Structured production logging with Winston integrated into HTTP request logging and server startup errors
- Installable PWA shell with web manifest, service worker caching, and service worker registration
- Docker and docker-compose setup for local production-like orchestration
- GitHub Actions CI pipeline for install, test, and build validation

New API routes:

- `GET /api/ai/insights`

New infrastructure files:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.github/workflows/ci.yml`
- `client/public/manifest.webmanifest`
- `client/public/sw.js`

## Step 6. Deployment

Frontend:

- Vercel: `client/vercel.json` handles SPA rewrites
- Netlify: build command `npm install && npm run build`, publish directory `client/dist`

Backend:

- Render: use [render.yaml](/c:/Users/saqib/electronic/render.yaml:1)
- Railway/AWS: run `npm install --prefix server && npm start --prefix server`

Database:

- MongoDB Atlas for production

## Demo Accounts

After `npm run seed`:

- Admin: `admin@mujahidgoods.com` / `Admin@123`
- Staff: `staff@mujahidgoods.com` / `Staff@123`

## Testing

Backend test suite:

```bash
npm test
```

Included:

- Auth bootstrap and login tests
- Product creation and low-stock filtering tests
- Sales checkout and stock reduction tests

## Notes

- Cloudinary is used when credentials are configured. Without credentials, uploads fall back to inline image storage for local development only.
- Stripe and Google OAuth are left as extension points and are not wired into the current implementation.

## Production Hardening Updates

- Checkout validation now supports `qty` and `quantity` item payloads and returns clear errors (`Invalid cart data`, `Insufficient stock`).
- Dashboard category distribution now uses backend aggregation and chart-safe `name`/`value` output.
- Invoice PDF rendering now sanitizes text and enforces Helvetica in jsPDF to avoid encoding artifacts.
- API security now includes global rate limiting and request sanitization (XSS + NoSQL-key filtering).
- Core listing APIs now support pagination metadata:
	- `GET /api/products?page=1&limit=50`
	- `GET /api/sales?page=1&limit=50`
	- `GET /api/customers?page=1&limit=50`
- Health endpoint now returns operational metadata for monitoring.

## Docker (One Command)

Run full production-like stack:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for platform deployment, env setup, monitoring, security checklist, and load testing.
