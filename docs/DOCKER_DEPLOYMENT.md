# PRISM Docker deployment with existing RDS

Use `compose.deploy.yaml` explicitly. The existing `docker-compose.yml` remains
the local development database configuration; deployment does not create or reset
a PostgreSQL database. Backend, frontend and extractor have separate images.

## Prepare configuration

From the repository root in PowerShell:

```powershell
Copy-Item deploy/backend.env.example deploy/backend.env
Copy-Item deploy/extractor.env.example deploy/extractor.env
Invoke-WebRequest https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -OutFile deploy/rds-ca.pem
```

Edit both env files. Set real RDS credentials, JWT/service secrets, GitHub/Jira
credentials and callback URLs. Both services must use the same INGEST_SERVICE_KEY.
Set the JDBC URL to the actual database and endpoint; verify-full validates RDS
against the downloaded CA. Database migrations run through Flyway on startup.
Back up existing RDS data before applying new migrations. Never reset migration
history or enable Hibernate schema updates to bypass an error.

Place licensed Arial regular and bold TTF files in `deploy/fonts/`. These are
mounted read-only, ignored by Git, and not distributed inside the image. The
extractor refuses to start if Arial is missing. Do not copy fonts without the
rights needed for use on your deployment server.

The frontend contains no secrets and uses same-origin `/api` requests. For HTTPS,
place a TLS reverse proxy/load balancer in front of the frontend; configure its
domain in CORS and both OAuth callback registrations. The default published socket
is `127.0.0.1:8088`, suitable for a TLS proxy running on the same host. Containers
do not themselves provide HTTPS certificates.

## Build, test and run

Docker Desktop must use Linux containers on Windows. On EC2 use Docker Engine
with Compose. An x86_64 Ubuntu host is the initial deployment target.

```powershell
docker compose -f compose.deploy.yaml config --quiet
docker compose -f compose.deploy.yaml build
```

Use these commands for actual startup and checks:

```powershell
docker compose -f compose.deploy.yaml up -d backend
docker compose -f compose.deploy.yaml run --rm extractor python -m unittest discover -s tests -v
docker compose -f compose.deploy.yaml run --rm extractor python scripts/smoke_report_exports.py
docker compose -f compose.deploy.yaml up -d
docker compose -f compose.deploy.yaml ps
docker compose -f compose.deploy.yaml logs --tail 100 backend extractor
```

Open `http://localhost:8088` for a local smoke test. For an EC2 server, use the
HTTPS proxy/domain. Backend port 8080 is not published. Nginx blocks public
`/api/ingest` requests while the extractor accesses the backend over Docker's
private network. Backend health gates dependent startup; a database startup or
migration error keeps dependent services from starting.

The extractor uses non-root Chromium with a 1 GiB shared-memory mount. Browser
sandboxing stays enabled: no `--no-sandbox`, privileged mode or SYS_ADMIN capability
is added. The host must support Chromium's sandbox; if the real export smoke test
fails, resolve the host/browser issue rather than silently bypassing sandboxing.
Private GitHub extraction currently uses the application's npx GitHub MCP server,
so the worker also needs outbound npm access for that existing code path.

For an external load balancer that connects directly to the published port, set
PRISM_BIND_ADDRESS and restrict access to the load balancer's security group.
RDS port 5432 should accept the EC2 application's security group, not the internet.
No database, secrets or Docker socket are exposed to the frontend.

Logs and diagram intermediates use named volumes. Saved reports/knowledge remain
in RDS through the backend; volumes are not a database backup. Log rotation is
configured. Do not use `down -v` unless you intend to delete these local volumes.

## Updating

Pull the intended release branch, then rebuild and recreate services. Restarting
alone does not copy changed source into existing images. A new repository sync is
needed to replace previously saved PDF/PPTX files with newly generated versions.

```powershell
docker compose -f compose.deploy.yaml up -d --build
```

This is a single-host deployment, not a high-availability configuration. Complete
live public/private extraction, Jira OAuth, assistant streaming and PDF/PPTX review
before accepting the deployment. A successful Compose syntax check is not proof of
a successful image build or end-to-end operation.
