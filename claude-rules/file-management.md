# Repository Layout & File Management: Public vs Private

Where files generated during development must live, and how versioning works across the public repo and its nested private repo.

## Public vs Private (Important — Must Follow)
- This repo (`NanoBeeApp/NanoBee-data-hub`) is **public**. It must contain **only public-facing code and public documentation**.
- A **private** repo is nested at `private/` (remote: `NanoBee-data-hub-private`, ignored by the public repo's `.gitignore`). **All development by-products go into `private/`**, including but not limited to:
  - **Screenshots / screen captures → `private/screenshots/`** (NEVER the repo root, NEVER a top-level `screenshots/`).
  - Verification / debugging / explanatory artifacts → `private/`.
  - Chat history, planning notes, internal PRDs, logs, scratch design files → `private/` (e.g. `private/docs/`, `private/logs/`, `private/planning/`).
- **Rule of thumb**: if a file is not "public-facing code or public documentation", it belongs in `private/`; when unsure, default to `private/`.

## Screenshots (🚨 Iron Rule)
- **🚨 This OVERRIDES the global rule** "screenshots must go in `screenshots/`". In THIS project, screenshots go in **`private/screenshots/`**, not a root-level `screenshots/`.
- Before saving any screenshot (Playwright captures, `browser_take_screenshot`, manual saves), write it under `private/screenshots/`.
- If a root `screenshots/` ever appears, move its contents into `private/screenshots/` and delete the root folder.

## Versioning
- Changes under `private/` → `cd private && git add/commit/push` to the private remote.
- Public-repo changes → commit at the repo root (`private/` is auto-ignored).
- Never commit `private/` contents into the public repo.
