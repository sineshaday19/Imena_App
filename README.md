# Imena

Project documentation for the Imena cooperatives management application.

---


https://github.com/user-attachments/assets/15d2c7a0-e2ef-45d5-9edf-ffeb043e3337




## 1. Project Description

### What the Application Does

Imena is a mobile application for managing cooperatives income and contributions. It provides a single place for riders (cooperative members) and cooperative administrators to track daily income, submit and verify contributions, and view reports. The system supports two distinct roles with role-specific dashboards and API visibility.

### Target Users

- **Riders** : Cooperative members who record their daily income, submit contributions to the cooperative, and view their own income and contribution summaries.
- **Cooperative admins** : Administrators who verify pending contributions, view cooperative-wide income, and access reports and summaries for oversight.

### Core Features (High Level)

- **Income tracking** : Riders record daily income per cooperative; admins see cooperative-level income data.
- **Contributions** : Riders submit contributions (stored as pending); admins verify them. Contribution status (e.g. pending, verified) is exposed through the API.
- **Verification** : Admins review and verify pending rider contributions via a dedicated API action.
- **Reports** : Read-only report endpoints provide income and contribution summaries (e.g. by rider, by cooperative, contribution summaries), with visibility enforced by role.
- **Language support** : The frontend supports English and Kinyarwanda via react-i18next, with language preference persisted in the browser.

---

## 2. Environment & Project Setup

Development setup is split into backend (Django) and frontend (React). Both must be configured and run for full local operation.

### Backend

The backend is a Django 5 project using Django REST Framework, JWT authentication (Simple JWT), and PostgreSQL (with SQLite fallback when no database URL is set).

**Python version**

- Use Python 3.10 or newer (compatible with Django 5 and the listed dependencies).

**Virtual environment**

- Create and activate a virtual environment in the project root or inside `backend/`:



  ```bash
  cd backend
  python -m venv .venv
  .venv\Scripts\activate   # Windows
  # source .venv/bin/activate   # macOS/Linux
  ```

**Installing dependencies**

- Install from the root requirements file (which pulls Django, DRF, Simple JWT, CORS, PostgreSQL driver, and python-dotenv):

  ```bash
  pip install -r requirements.txt
  ```

  For local development with extra tooling (e.g. debug toolbar), use:



  ```bash
  pip install -r requirements/development.txt
  ```

**Environment variables**

- Copy `.env.example` to `.env` in the `backend/` directory.
- Set at least:
  - `SECRET_KEY` : Django secret key.
  - `DEBUG` : `1` or `0` for development/production.
  - `DATABASE_URL` : PostgreSQL URL (e.g. `postgres://user:password@localhost:5432/imena_db`). If unset, the app falls back to SQLite.
  - `CORS_ALLOWED_ORIGINS` : Allowed frontend origin(s), e.g. `http://localhost:5173,http://127.0.0.1:5173`. If unset, the app defaults to these for local development.
- Optional: JWT lifetimes and other options as shown in `.env.example`.

**Migrations and development server**

- Run migrations, then start the server:

  ```bash
  python manage.py migrate
  python manage.py runserver
  ```

  The API is served at the root (e.g. `http://127.0.0.1:8000/`). Token endpoints live at `/api/token/` and `/api/token/refresh/`; other API routes are under `/api/` as defined in the project URLs.

### Frontend

The frontend is a React 18 application built with Vite, TypeScript, Tailwind CSS, and shadcn/ui. Internationalization is handled by react-i18next (English and Kinyarwanda).

**Node.js version**

- Use a current LTS version of Node.js (e.g. 18.x or 20.x) that supports the scripts and dependencies in `package.json`.

**Installing dependencies**

- From the `frontend/` directory:



  ```bash
  cd frontend
  npm install
  ```

**Running the Vite dev server**

- Start the development server:

  ```bash
  npm run dev
  ```

  The app is typically available at `http://localhost:5173`. Configure the backend `CORS_ALLOWED_ORIGINS` to include this origin so the frontend can call the API when integrated.

---

## 3. Deployment Plan

The following is a high-level, stack-agnostic deployment approach. Actual hosting can be done on any platform that supports a Python WSGI server and static file serving.

### Approach

- **Backend** : Run as a WSGI application (e.g. with Gunicorn) behind a reverse proxy. Use environment-based configuration and a production-grade database (PostgreSQL recommended).
- **Frontend** : Build into static assets (HTML, CSS, JS) and serve them via a web server or a static hosting/CDN.
- **Communication** : The frontend (once deployed) calls the backend API using the backend’s public URL. CORS must allow the frontend origin; authentication is done with JWT (e.g. access/refresh tokens from `/api/token/` and `/api/token/refresh/`).

### Backend Deployment (Conceptual)

1. **Production settings** : Use a dedicated settings module or environment flags so that `DEBUG` is off, `SECRET_KEY` is strong and not default, and `ALLOWED_HOSTS` includes the backend domain.
2. **Environment variables** : Set `DATABASE_URL` (PostgreSQL), `SECRET_KEY`, `CORS_ALLOWED_ORIGINS` (to the frontend origin), and any JWT or security-related variables. Do not commit `.env` or secrets.
3. **Migrations** : Run `python manage.py migrate` as part of the deployment or release process.
4. **Static files** : If the same server serves Django static files, run `python manage.py collectstatic` and configure the WSGI server (e.g. Whitenoise) or reverse proxy to serve them. Production dependencies can include `requirements/production.txt` (e.g. Gunicorn, Whitenoise) in addition to the base requirements.
5. **Process** : Run the app with a WSGI server (e.g. `gunicorn config.wsgi:application`) and put it behind a reverse proxy (e.g. Nginx or a cloud load balancer) for TLS and static/media if needed.

### Frontend Deployment (Conceptual)

1. **Build** : From the `frontend/` directory run `npm run build` (which runs the TypeScript compiler and Vite build). Output is typically written to `dist/`.
2. **Static hosting** : Deploy the contents of `dist/` to any static host (e.g. Nginx, Apache, or a cloud storage bucket with a CDN). The app is a single-page application: the server should serve `index.html` for client-side routes (or use host-level configuration for history-mode routing).
3. **API base URL** : Ensure the frontend is configured (e.g. via environment or build-time variable) to call the deployed backend API URL so that login and data requests go to the correct origin.

### Frontend–Backend Communication in Production

- The React app runs in the user’s browser and sends HTTP requests to the backend API (e.g. `https://api.example.com`).
- Authentication: the frontend obtains JWT access (and optionally refresh) tokens from the backend token endpoints and sends the access token (e.g. in the `Authorization` header) on subsequent API requests.
- The backend validates the token and applies role-based filtering so riders see only their data and admins see data for cooperatives they manage. CORS must allow the frontend origin (e.g. `https://app.example.com`) in `CORS_ALLOWED_ORIGINS`.

---

## 4. Code Files Overview

### Backend Folder Structure

The backend follows a Django project layout with a single top-level configuration package and multiple apps under `apps/`.

**Root**

- `manage.py` : Django management script (runserver, migrate, etc.).
- `requirements.txt` : Main dependency list (Django, DRF, Simple JWT, CORS, PostgreSQL, python-dotenv).
- `requirements/` : `base.txt` (core deps), `development.txt` (dev tools), `production.txt` (e.g. Gunicorn, Whitenoise).
- `.env.example` : Template for environment variables; copy to `.env` and fill in values.

**config/**

- Django project package: `__init__.py` loads settings.
- `settings/base.py` : Single settings module: reads from environment (and optional `.env`), configures database (PostgreSQL from `DATABASE_URL` or SQLite fallback), installed apps, middleware, DRF with JWT and session auth, CORS from `CORS_ALLOWED_ORIGINS`, and `AUTH_USER_MODEL` pointing to `apps.users.User`.
- `urls.py` : Root URLconf: mounts JWT token views at `/api/token/` and `/api/token/refresh/`, and includes URL configs from `apps.users`, `apps.cooperatives`, `apps.income`, `apps.contributions`, and `apps.core`.
- `wsgi.py` / `asgi.py` : WSGI/ASGI entry points for deployment.

**apps/**

- **core** : Shared API and permissions: report endpoints (e.g. income and contribution summaries), and permission classes used across apps (e.g. rider vs cooperative admin). URLs are mounted under `api/`.
- **users** : Custom user model (e.g. with role such as rider/cooperative admin), migrations, and admin registration. No API routes here; users are referenced by other apps and authenticated via JWT.
- **cooperatives** : Cooperative model and API: list, retrieve, create (admins only; creator is added as admin). Public endpoint `GET /api/cooperatives/signup_choices/` returns cooperatives for the signup form. URLs under `api/`.
- **income** : Income record model and API: list, retrieve, and create (riders create for themselves; visibility by rider or cooperative). URLs under `api/`.
- **contributions** : Contribution model (e.g. status: pending/verified) and API: list, retrieve, create (riders), and a custom action for admins to verify pending contributions. URLs under `api/`.
- **members** / **rides** : Placeholder packages (e.g. `__init__.py` only); no models or views in the current setup.

Each app that exposes APIs typically contains `models.py`, `serializers.py`, `views.py` (often ViewSets), and `urls.py`; `apps.cooperatives` has no migrations in the snippet but follows the same pattern. Permissions and report logic live in `apps.core`.

### Frontend Folder Structure

The frontend is a Vite + React + TypeScript application. Source code lives under `src/`.

**Entry and app**

- `main.tsx` : Renders the root React component into `#root`, wraps the app in `AuthProvider`, and imports `i18n` and global styles (`index.css`).
- `App.tsx` : Root component: sets up `BrowserRouter`, a global header (logo and language toggle), and `Routes` for `/` (landing), `/login`, `/rider`, and `/admin`. Protected routes wrap the Rider and Admin pages so only authenticated users can access them.

**components/**

- Reusable UI and layout: `CenteredLayout` (shared layout for forms and dashboards), and inline icons. Auth state is provided by `AuthContext` (in `contexts/`).
- `ui/` : shadcn-style components: `button`, `card`, `input`, `label` (and any others added under `components/ui/`).

**pages/**

- Route-level components: `Landing` (hero and links to login/signup), `Login` (JWT login, redirect by role), `SignUp` (registration; riders select cooperative; admins create cooperatives via dashboard), `RiderDashboard` (quick actions: add income, submit contribution; summary; logout), `AddIncome` (POST income to backend), `SubmitContribution` (POST contribution to backend), `AdminDashboard` (overview, add cooperative, recent contributions).

**i18n/**

- `index.ts` (or the single i18n module) : Configures react-i18next, defines translation resources for English (`en`) and Kinyarwanda (`rw`) for all UI strings (landing, login, dashboards, validation, etc.), and persists language preference (e.g. in `localStorage`).

**Styles**

- `index.css` : Global styles and Tailwind directives; may include custom utility classes (e.g. for dynamic backgrounds and dashboard layout). Tailwind is configured via `tailwind.config.js` at the frontend root; theme and shadcn-related variables are typically defined in this CSS file.

**contexts/** and **lib/**

- `AuthContext` (in `contexts/`): JWT login/logout, user state, token storage.
- `api.ts` (in `lib/`): apiFetch with JWT, getCooperatives, getCooperativesForSignup, createCooperative. Set `VITE_API_URL` if the backend is not at `http://127.0.0.1:8000`.

**Other**

- `vite-env.d.ts` : TypeScript declarations for Vite. The project uses the `@/` path alias (defined in `vite.config.ts`) pointing to `src/`.

---

This document describes the project as implemented and is intended for use in a capstone or final project submission.
