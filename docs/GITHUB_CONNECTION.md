# GitHub workspace connection

An existing GitHub installation and a PRISM workspace association are separate. The old connect link opened the installation wizard. For an app already installed, GitHub can display its settings without returning through PRISM's setup callback, leaving the workspace unconnected despite correct repository permissions.

Connect GitHub now opens GitHub's user authorization flow. The callback verifies the initiating PRISM user/workspace, exchanges the code in the backend, lists active installations of this app and offers accounts that the user manages. Personal-account installations require matching the authenticated GitHub login. Organization installations require active admin membership, including permission for the app to read that membership. Unauthorized or suspended installations are not offered.

A short-lived PostgreSQL selection stores installation identifiers and account names only. GitHub user access tokens are not stored or returned to the browser. The selected identifier must match that server-stored list, the selection is user-bound and consumed transactionally, workspace admin access is rechecked and installation credentials are verified before saving the association. Existing single-workspace-per-installation restrictions remain enforced.

Set `GITHUB_REDIRECT_URI` and the GitHub App's **user authorization Callback URL** to the same address. Local development uses `http://localhost:5173/app/github/callback`. This is distinct from editing repository permissions on GitHub's installation settings page. Flyway V8 creates the selection table. Restart the backend after this update.

For an existing installation: workspace settings → Connect GitHub → authorize → select account/installation → Connect selected installation. Confirm the workspace displays Connected, then retry the existing private repository project. No reinstall, personal access token or manually entered installation identifier is required.

For a new installation: authorize first; if none is listed, use Install PRISM GitHub App, then return to the workspace and authorize again to link it. The legacy installation callback is retained for installations that request user authorization during setup.

Compilation and security unit sources are checks of the implementation, not proof of a live GitHub callback. Complete a live authorization and private repository sync before signoff.
