# PRISM - Automated Project Knowledge Management System

Connect GitHub repositories to a project; PRISM keeps a structured, source-backed knowledge base of
decisions, workflows and module summaries. Projects are private to their owner and contributors.

```
frontend/   React + TypeScript + Vite + Tailwind (lavender/indigo theme)
backend/    Spring Boot 3.3 (Java 21), Spring Security (JWT), JPA, Flyway, PostgreSQL
docs/       INTEGRATION.md - contract for the Python extraction service
```

## Run locally

Prerequisites: Java 21, Node 20+, Docker.

```bash
# 1. configuration (never commit .env)
cp .env.example .env          # then set JWT_SECRET (openssl rand -base64 48) and INGEST_SERVICE_KEY

# 2. database
docker compose up -d

# 3. backend (http://localhost:8081)
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run

# 4. frontend (http://localhost:5173)
cd frontend
cp .env.example .env
npm install
npm run dev
```

The backend refuses to start without a valid `JWT_SECRET`. Schema is created by Flyway (`V1__baseline.sql`),
so use an **empty** database (for an older dev database run `docker compose down -v` first).

## Using it

1. Sign up with a new organization name - you receive an invite code (Organization page).
2. Teammates sign up with the same organization name plus the invite code.
3. Create a project with one or more GitHub repository links and pick contributors.
4. Set `APP_DEMO_ENABLED=true` to get a "Load sample data" button for demos before the extractor is connected.

## Roles

- **owner**: edit/delete project, manage repositories and members.
- **contributor**: read everything, request a sync.
- Non-members get 404 for a project, as if it did not exist.

## Quality checks

```bash
cd frontend && npm run lint && npm run build
cd backend && ./mvnw test
```

## Security notes

- Keep secrets in `.env` only. If a GitHub App private key, client secret or AI key was ever committed
  (the earlier seminar repository contained some), **rotate it**.
- GitHub App flow: set `GITHUB_APP_*` values; the callback URL of the app must be `<frontend>/app/github/callback`.
- Use a long random `INGEST_SERVICE_KEY` and keep `/api/ingest` off the public internet where possible.

## Scope

Seminar 2: GitHub only (activity + knowledge), frontend v1. Jira, AI-tool prompts, generated documentation,
RAG and the assistant are planned later (their tabs show "Soon").
