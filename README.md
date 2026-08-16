# Generation B — Frontend Application

React 18 + Vite + TypeScript web application for the Generation B Creator Management Platform.

## Features

- **Route Protection**: Requires login to access internal routes (`/dashboard`, `/campaigns`, etc.).
- **Authentication Flow**: Login by username or email, password visibility toggle, forgot password request, and reset password confirmation.
- **Backend Wire**: Real REST API integration via `src/services/apiClient.ts` with automatic 401 token refresh.
- **Environment Toggle**: Toggle between mock mode (`VITE_USE_MOCK_DATA=true`) and real backend mode (`VITE_USE_MOCK_DATA=false`).

---

## Getting Started Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or edit `.env`:

```env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8080/api
```

### 3. Run Development Server

```bash
npm run dev
```

Application will run at `http://localhost:5173`.

---

## Test Accounts (Local Backend)

| Role | Email | Password |
|---|---|---|
| **ADMIN** | `admin@generationb.dev` | `Password123!` |
| **DIRECTOR** | `director@generationb.dev` | `Password123!` |
| **ACCOUNT_MANAGER** | `am@generationb.dev` | `Password123!` |
| **ACCOUNT_EXECUTIVE** | `ae@generationb.dev` | `Password123!` |

---

## Production Deployment (Vercel)

1. Connect `generationBFE` repository to Vercel.
2. In Project Settings -> Environment Variables, add:
   - `VITE_USE_MOCK_DATA`: `false`
   - `VITE_API_BASE_URL`: `https://<your-render-app>.onrender.com/api`
3. Trigger deployment.
