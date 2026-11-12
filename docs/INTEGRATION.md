# Integration contract for the extraction service (Python)

The web app never reads GitHub content itself. A separate extraction service (Python/Streamlit team)
does that and reports results through the endpoints below. All of them require the header

    X-Service-Key: <INGEST_SERVICE_KEY>

If `INGEST_SERVICE_KEY` is empty on the backend, every `/api/ingest/**` call returns 503.
Default base URL: `http://localhost:8081`.

## Flow

1. `GET /api/ingest/repositories?status=PENDING` - repositories waiting to be processed
   (`repositoryId, projectId, projectName, url, owner, name, syncStatus, githubInstallationId`).
2. `POST /api/ingest/repositories/{id}/status` `{"status":"SYNCING"}` - claim it.
3. For private repositories: `POST /api/ingest/repositories/{id}/github-token` -> `{"token": "..."}`
   (short-lived GitHub App installation token; never log it).
4. Extract, then send results (any number of times):
   - `POST /api/ingest/projects/{projectId}/activity` `{"events":[{type,title,actor,repositoryId,sourceRef,url,occurredAt}]}` (1-1000 events)
   - `POST /api/ingest/projects/{projectId}/knowledge` `{"repositoryId":1,"items":[{externalId,title,type,summary,details,module,confidence(0-1),evidence:[{type,reference,url,excerpt}]}]}` (1-500 items)
     Sending the same `externalId` again updates the item (idempotent).
5. `POST /api/ingest/repositories/{id}/status` `{"status":"SYNCED"}` or `{"status":"FAILED","message":"why"}`.

Both batch endpoints respond `{"created": n, "updated": m}`. Errors use the shape
`{"status","error","message","fieldErrors"}`.

## Rules

- Store knowledge and evidence pointers (commit SHA, PR number, URL, a short excerpt). Do not send raw file contents or full diffs.
- Evidence `type` examples: `COMMIT`, `PULL_REQUEST`, `PR_REVIEW`. `SAMPLE` is reserved for demo data.
- Knowledge `type` examples: `Decision`, `Module Summary`, `Workflow`, `Process`, `Troubleshooting`.
- The user-facing "Sync now" button only marks repositories `PENDING`; polling is how the service learns about it.
