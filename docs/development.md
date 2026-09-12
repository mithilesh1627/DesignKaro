# DesignKaro — Developer Guide & Setup

> **"Socho. Design Karo. Scale Karo."**

This guide provides instructions for setting up, running, testing, and developing DesignKaro locally.

---

## 1. Prerequisites

- **Python 3.11+** (managed via conda in `designkaro_env`)
- **Node.js 20+** & **npm 10+**
- **Docker & Docker Compose** (for containerized execution)
- **Git**

---

## 2. Quickstart (Native Local Development)

### Backend Setup (FastAPI)

1. Activate your Python virtual environment:
   ```powershell
   # In PowerShell
   conda activate .\designkaro_env
   ```
2. Run backend test suite:
   ```powershell
   $env:PYTHONPATH="."
   pytest backend/tests -v
   ```
3. Run linter and formatting checks:
   ```powershell
   ruff check backend
   ```
4. Start the FastAPI development server:
   ```powershell
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   API will be available at:
   - Base URL: `http://127.0.0.1:8000`
   - Interactive Swagger docs: `http://127.0.0.1:8000/docs`
   - ReDoc: `http://127.0.0.1:8000/redoc`
   - Health check: `http://127.0.0.1:8000/health`
   - Readiness check: `http://127.0.0.1:8000/ready`

---

### Frontend Setup (Next.js)

1. Open a new terminal in the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run typecheck and lint:
   ```bash
   npm run typecheck
   npm run lint
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
   Frontend will be available at:
   - Web application: `http://localhost:3000`

---

## 3. Containerized Setup (Docker Compose)

To start the full stack including PostgreSQL 16, Redis 7.2, FastAPI, and Next.js:

```bash
docker compose up -d --build
```

To view service logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

## 4. API Endpoints Reference (Phase 1)

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/health` | Application liveness probe | `200 OK` |
| `GET` | `/ready` | Database & Redis readiness probe | `200 OK` / `503 Unavailable` |
| `GET` | `/api/v1/health` | Versioned system health & metadata | `200 OK` |
| `GET` | `/api/v1/metrics` | Basic application telemetry | `200 OK` |
| `GET` | `/docs` | Interactive OpenAPI Swagger UI | `200 OK` |
