# Automated Project Knowledge Management System

Phase 0 skeleton — backend auth + project creation working end-to-end against Postgres,
frontend not yet added to this repo (frontend teammate starts a `frontend/` folder alongside `backend/`).

## What's already done
- Spring Boot project skeleton (`backend/`), Java 17, Maven
- Flyway migration for Phase 0 schema: `organizations`, `users`, `projects`, `project_members`
- JWT auth: `POST /api/auth/signup`, `POST /api/auth/login`
- Project endpoints: `POST /api/projects` (create), `GET /api/projects` (list mine)
- `docker-compose.yml` for a local Postgres so nobody is blocked waiting on RDS

## Quick start (local, no RDS needed)

```bash
# 1. start local postgres
docker compose up -d

# 2. copy env template
cp .env.example .env
# defaults in .env.example already match docker-compose — no edits needed for local dev

# 3. run the backend
cd backend
./mvnw spring-boot:run
```

Backend runs on `http://localhost:8081`. Flyway runs the migration automatically on startup.

Test it:
```bash
curl -X POST http://localhost:8081/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","organizationName":"Test Org"}'
```
You should get back a JWT + user/org info.

---

## For the RDS setup

This repo currently runs against **local Postgres via docker-compose** for dev. You don't need
to touch any code to switch it to RDS — just:

1. Create the RDS Postgres instance (t3.micro / t4g.micro is enough for free tier, single-AZ).
2. Once you have the endpoint, username, password, and db name, set these as environment
   variables wherever the backend runs (your local `.env`, or the deployment environment):
   ```
   DB_HOST=<your-rds-endpoint>.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=pkm
   DB_USERNAME=<master-username>
   DB_PASSWORD=<master-password>
   ```
3. That's it — `application.yml` already reads these via `${DB_HOST}` etc. Nothing in the
   Java code changes.
4. When we get to Phase 7 (RAG), we'll need `CREATE EXTENSION vector;` run once against the
   RDS instance — flag it to the team when we're there, don't need to do it now.
5. **Do not** put real RDS credentials in `.env.example`, `application.yml`, or any committed
   file — only in your local `.env` (already gitignored) or wherever the deployed backend's
   env vars live.

## For the frontend - API contract so far

Base URL (local): `http://localhost:8081`

**Signup**
```
POST /api/auth/signup
Body: { "name": string, "email": string, "password": string (min 8 chars), "organizationName": string }
Returns: { "token": string, "userId": number, "name": string, "email": string,
           "organizationId": number, "organizationName": string }
```

**Login**
```
POST /api/auth/login
Body: { "email": string, "password": string }
Returns: same shape as signup
```

**Create project** (requires `Authorization: Bearer <token>` header)
```
POST /api/projects
Body: { "name": string, "description": string (optional) }
Returns: { "id": number, "name": string, "description": string, "role": "owner", "createdAt": string }
```

**List my projects** (requires `Authorization: Bearer <token>` header)
```
GET /api/projects
Returns: [ { "id": number, "name": string, "description": string, "role": string, "createdAt": string }, ... ]
```

Note: `ProjectResponse` doesn't have repo count / last-synced / freshness fields yet — those
get added once Phase 1 (repo connections) and Phase 2 (sync) exist. Build the dashboard card
UI to tolerate those being absent/null for now.

Use `project-spec.md` (shared separately) for the full page list, design system, and
per-page build prompts.

## For the knowledge-extraction 

Nothing to pull from this repo yet — the `knowledge_items` / `knowledge_evidence` schema
(see `project-spec.md` section 1) is the eventual target shape for whatever extraction
approach you land on. Worth sanity-checking your approach against that schema early so we're
not restructuring later — happy to help think through the extraction pipeline itself whenever
you're ready.

## Repo layout
```
pkm-system/
├── backend/                  Spring Boot app
│   └── src/main/java/com/pkm/
│       ├── config/            security, JWT
│       ├── auth/               signup/login
│       ├── org/                Organization entity
│       ├── user/               User entity
│       └── project/            Project, ProjectMember, endpoints
├── frontend/                 
├── docker-compose.yml         local Postgres for dev
├── .env.example
└── README.md
```
