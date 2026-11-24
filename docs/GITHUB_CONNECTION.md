# GitHub workspace connection

**Connect GitHub** opens GitHub's installation screen. The user chooses the account and repositories on GitHub. GitHub's setup callback starts user authorization automatically, and PRISM connects the selected installation and returns to the workspace after verification.

**Connect existing installation** opens GitHub's user authorization flow for people who have already installed the app. PRISM offers active installations of this app that the user manages. Personal-account installations require matching the authenticated GitHub login. Organization installations require active admin membership, including permission for the app to read membership.

A short-lived PostgreSQL selection stores installation identifiers and account names only. GitHub user access tokens are not stored or returned to the browser. The selected identifier must match that server-stored list, the selection is user-bound and consumed transactionally, workspace admin access is rechecked and installation credentials are verified before saving the association. Existing single-workspace-per-installation restrictions remain enforced.

In the GitHub App registration, clear **Request user authorization (OAuth) during installation** to enable the **Setup URL** field. Set **Setup URL**, **Callback URL**, and the backend's `GITHUB_REDIRECT_URI` to the PRISM callback address. Production uses `https://honors-project-gules.vercel.app/app/github/callback`. Local development uses `http://localhost:5173/app/github/callback`. Flyway V8 creates the selection table.

For a live check, start from a disconnected workspace and choose **Connect GitHub**. Install on GitHub, approve authorization if GitHub prompts for it, and confirm the original workspace displays **Connected**. For an already-installed app, use **Connect existing installation** and select the GitHub account or organization in PRISM.

Compilation and security unit sources are checks of the implementation, not proof of a live GitHub callback. Complete a live authorization and private repository sync before signoff.
