# Jira and GitHub acceptance run

Restart the backend first so Flyway V7 creates snapshot and report-job tables. Restart the extractor bridge next. The frontend uses the existing Vite development server.

## Existing DocuMind project

1. Open Jira and click Sync Jira issues as the authorizing project owner. Confirm the sharing notice: imported visible issues are shared with PRISM project members. Issue-security-restricted issues and visibility-restricted comments are excluded.
2. Wait for Jira sync to show SYNCED. Verify SCRUM issue keys, descriptions, status, source-updated times and unrestricted comments against Jira. Custom fields named Acceptance Criteria are imported; criteria embedded in description remain in description. Other custom field names are not automatically mapped.
3. Open Knowledge. Jira Requirement items must have JIRA evidence links, never fabricated FILE citations. Ask PRISM about a specific ticket key and confirm the answer distinguishes a requirement from an implemented feature.
4. Wait for each repository report refresh to show COMPLETED, then use Refresh report in Report. Inspect the Jira appendix in the web report, PDF and deck. The extractor performs report-only regeneration from the saved GitHub analysis without another model call. Every repository report contains the project-wide Jira context; this is not a cross-repository architectural synthesis.
5. Edit a test issue/comment and sync again. Check changed values and no duplicate Jira knowledge. Delete a test issue if appropriate and verify it disappears after the next complete snapshot. Existing GitHub findings must survive.
6. Revoke access or simulate an upstream request failure. Sync must show FAILED and retain the previous successful snapshot. Reauthorize as needed. Never show a partial snapshot as successful.
7. Test another PRISM user who is not a project member: status and issues must return 404. A contributor cannot start sync. Another owner cannot use the grant owner's account to browse other Jira projects.

## New GitHub-only project

1. Create a separate PRISM project with the chosen public repository and leave Jira disconnected.
2. Request GitHub sync. Confirm knowledge, report JSON and both exports complete with empty Jira context.
3. Add a second repository if testing multi-repository behaviour. Verify findings remain associated with the correct repository and exports remain selectable per repository.

## Operational boundaries

The Jira snapshot is a deterministic source import, not a second model inventing issue summaries or implementation claims. Ask PRISM uses the application's existing keyword ranking across project knowledge; this change does not introduce a Jira vector index. No Jira write actions or webhooks are enabled. Sync is explicitly requested, and fetches all supported pages before replacing the snapshot in one transaction. A 10,000-issue or per-issue 10,000-comment safety limit fails visibly rather than publishing truncated data.

Report refresh jobs have leases, reject superseded versions, preserve old exports on rendering failure, and publish JSON/PDF/PPTX atomically. Report generation requires the running Python bridge and local Mermaid CLI. A full Jira resync queues failed report jobs again. After disconnect, local issue knowledge is deleted and report-only refreshes remove the Jira appendix; older exported files remain until that refresh completes.

Backend compilation and offline unit checks do not establish real Atlassian pagination, RDS transaction behaviour or visual export quality. Complete this run before production signoff.
