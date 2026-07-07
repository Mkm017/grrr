# Grrr — Food Delivery Platform

Grrr is a full-stack food delivery app built as a **pnpm + Turbo monorepo**. Customers can browse restaurants, customize orders, checkout, and use AI features (nutrition analysis, chat assistant, recommendations). Restaurant owners and delivery agents have dedicated dashboards.

## Tech stack

| Layer | Technology |
|-------|------------|
| Web app | React 18, Vite, React Router |
| API | Hono (Node.js), Zod validation |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Firebase Auth (Google / phone OTP) + mock restaurant logins |
| AI | Google Gemini (`gemini-2.5-flash-lite`) |

## Project structure

```
Grrr/
├── apps/
│   ├── web/          # Customer & dashboard UI (port 5173)
│   └── api/          # REST API (port 3002)
├── packages/
│   ├── database/     # Drizzle schema, migrations, seed script
│   └── contracts/    # Shared Zod schemas & TypeScript types
└── package.json      # Root scripts (pnpm dev, build, etc.)
```

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **pnpm** 9 (`npm install -g pnpm`)
- A **PostgreSQL** database (e.g. [Neon](https://neon.tech))
- A **Firebase** project (for customer/delivery login)
- A **Google Gemini API key** (for AI nutrition, chat, recommendations)

---

## Environment files

Environment variables are **not committed** to git. Create the files below from the examples.

### 1. API — `apps/api/.env`

Copy the example and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default `3002`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes | Absolute path to Firebase Admin SDK JSON |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |

**Example:**

```env
PORT=3002
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
FIREBASE_SERVICE_ACCOUNT_PATH=D:\Grrr\apps\api\your-project-firebase-adminsdk.json
GEMINI_API_KEY=AIzaSy...
```

> **Note:** The database package (`packages/database`) also reads `DATABASE_URL` from `apps/api/.env` when you run migrations or seed scripts. You do **not** need a separate `.env` in `packages/database`.

### 2. Web — `apps/web/.env.local`

Copy the example and fill in your Firebase **client** config:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

Vite only exposes variables prefixed with `VITE_` to the browser.

---

## How to get API keys & credentials

### PostgreSQL (`DATABASE_URL`)

1. Create a free account at [Neon](https://neon.tech) (or use any PostgreSQL host).
2. Create a new project and database.
3. Open **Connection details** and copy the connection string.
4. Use the **pooled** or **direct** URL; include `?sslmode=require` for Neon.

Paste it as `DATABASE_URL` in `apps/api/.env`.

### Firebase (customer login + API auth)

You need **two** pieces from the same Firebase project:

#### A. Web app config → `apps/web/.env.local`

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a project (or open an existing one).
3. Click **Add app** → **Web** (`</>`).
4. Register the app; copy the `firebaseConfig` values into `.env.local`.
5. Enable sign-in methods under **Authentication → Sign-in method**:
   - **Google**
   - **Phone** (optional; requires Blaze plan for production SMS)

#### B. Service account JSON → `apps/api/.env`

1. In Firebase Console: **Project settings** (gear) → **Service accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Save it inside `apps/api/` (e.g. `apps/api/my-project-firebase-adminsdk.json`).
4. Set `FIREBASE_SERVICE_ACCOUNT_PATH` to the **full absolute path** of that file.

> The service account file is gitignored (`grrr-*-firebase-adminsdk-*.json`). Never commit it.

### Google Gemini (`GEMINI_API_KEY`)

Used for cart nutrition analysis, the home chat assistant, and personalized recommendations.

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **Create API key** and copy the key.
4. Paste it as `GEMINI_API_KEY` in `apps/api/.env`.

**Free tier limits:** Gemini free quotas are per model. This project uses `gemini-2.5-flash-lite`. If the API quota is exceeded, nutrition analysis falls back to a local estimator so the feature still works.

---

## Setup & run

### 1. Install dependencies

From the repo root:

```bash
pnpm install
```

### 2. Configure environment

Create and fill in:

- `apps/api/.env`
- `apps/web/.env.local`

See sections above for details.

### 3. Push database schema

```bash
cd packages/database
pnpm db:push
```

### 4. Seed sample data

Populates 4 restaurants in **Jaipur**, full menus with images, branches, and hours:

```bash
cd packages/database
pnpm db:seed
```

### 5. Start development servers

From the repo root:

```bash
pnpm dev
```

This starts:

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API | http://localhost:3002 |
| API health | http://localhost:3002/health |

To run services individually:

```bash
# API only
cd apps/api && pnpm dev

# Web only
cd apps/web && pnpm dev
```

### 6. (Optional) Open Drizzle Studio

Inspect/edit the database in a browser UI:

```bash
cd packages/database
pnpm db:studio
```

---

## Demo logins

### Restaurant owners (hardcoded)

On the login page, choose **Restaurant** tab. Password for all: `password123`

| Username | Restaurant |
|----------|------------|
| `sizzle` | Sizzle & Spice |
| `dough` | The Dough Factory |
| `green` | Green Garden Salad |
| `bites` | Bites & Bowls |

After login, open **Restaurant Dashboard** at `/dashboard`.

### Customers & delivery

Use **Google** or **Phone OTP** on the login page (requires Firebase setup above). Delivery agents sign in the same way and select the **Delivery** tab to sync their role.

---

## Main features

- Browse restaurants near your location (Jaipur seed data)
- Full menus with images, veg/non-veg labels, variants & add-ons
- Cart, coupons, checkout & order history
- **AI Nutrition Assistant** — analyze cart macros from the cart drawer
- **AI Chat** — restaurant discovery & order help on the home page
- **Personalized recommendations** (Gemini-powered)
- Restaurant owner dashboard — orders, menu management, stats
- Delivery agent dashboard

---

## Useful scripts

| Command | Where | Description |
|---------|-------|-------------|
| `pnpm dev` | Root | Start web + API in dev mode |
| `pnpm build` | Root | Build all packages |
| `pnpm test` | Root | Run tests |
| `pnpm db:push` | `packages/database` | Sync schema to PostgreSQL |
| `pnpm db:seed` | `packages/database` | Reset & seed catalog data |
| `pnpm db:studio` | `packages/database` | Database GUI |

---

## Troubleshooting

### API fails to start — "Invalid API environment variables."

Check that `apps/api/.env` has all required variables and that `FIREBASE_SERVICE_ACCOUNT_PATH` points to a valid JSON file.

### Web fails to start — "Invalid web environment variables"

Ensure `apps/web/.env.local` exists (not just `.env.example`) with all `VITE_FIREBASE_*` keys set.

### `pnpm db:seed` — "DATABASE_URL is missing"

The seed script loads env from `apps/api/.env`. Create that file first with a valid `DATABASE_URL`.

### Nutrition analysis errors

- Confirm `GEMINI_API_KEY` is set in `apps/api/.env`.
- Free tier quota may be exhausted; restart after some time or use a new key.
- A local fallback estimator runs automatically if Gemini is unavailable.

### CORS / API connection errors

The web app calls `http://localhost:3002` by default (`apps/web/src/lib/api.ts`). Make sure the API is running on port 3002.

### No restaurants shown

Set your delivery location to **Jaipur** (or near it). Seed branches are in C-Scheme, Malviya Nagar, Vaishali Nagar, and Mansarovar.

---

## Deploy to Vercel (frontend + API together)

Grrr is configured to deploy as **one Vercel project**: Vite SPA + Hono API serverless function at `/api`.

### Vercel import settings

| Field | Value |
|-------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `./` (repo root) |
| **Build Command** | `pnpm run build:vercel` *(auto from `vercel.json`)* |
| **Output Directory** | `apps/web/dist` *(auto from `vercel.json`)* |
| **Install Command** | `pnpm install` *(auto from `vercel.json`)* |

You do **not** need to change these manually if `vercel.json` is detected.

### Environment variables (Vercel dashboard)

Add all of these under **Project → Settings → Environment Variables**:

**Frontend (build-time — must start with `VITE_`):**

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=/api
```

**Backend (runtime):**

```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the **entire** Firebase Admin SDK JSON on one line (from Firebase Console → Project settings → Service accounts → Generate new private key). Do not use a file path on Vercel.

### After first deploy

1. **Firebase** → Authentication → Settings → **Authorized domains** → add `your-project.vercel.app`
2. Visit `https://your-project.vercel.app/api/health` — should return `{"status":"healthy",...}`
3. Visit `https://your-project.vercel.app/api/ping` — should return `{"status":"ok",...}`

### How it works

- `vercel.json` builds the web app and bundles the API into `api/index.js`
- Browser requests to `/api/*` hit the Hono serverless function
- All other routes serve the React SPA (`index.html` fallback)
- Locally, the API still runs on `http://localhost:3002` without the `/api` prefix

### Test Vercel build locally

```bash
pnpm run build:vercel
```

---

