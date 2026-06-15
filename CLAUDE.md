# CLAUDE.md · Index

> **This file is an index only.** The full details of each rule (steps, examples, checklists, exceptions) live in the `claude-rules/` directory, split by category to keep this file small.
> Each entry below is a one-line headline (always in effect) + a link. When a rule's scenario is triggered, **first Read the full `claude-rules/*.md` file** before acting.
> This is a **public** repository: all content here (outside `private/`) must be written in **English**.

---

## Repository Layout & File Management → [claude-rules/file-management.md](./claude-rules/file-management.md)
- 🚨 This repo is **public** — only public code/docs belong here; all dev by-products go into the nested private repo `private/`. **Screenshots must NEVER go in the repo root — save them under `private/screenshots/`** (overrides the global `screenshots/` rule). When in doubt, default to `private/`. Commit `private/` changes from inside `private/`.

## Basics & Execution → [claude-rules/basics.md](./claude-rules/basics.md)
- Converse in Chinese, write all code/docs in English; run common bash directly; MVP-first; verbose debug logs; verify features functionally + with Playwright (headless); plan files under `/docs/plans` with date-time prefix; no `/superpowers:brainstorming` unless invoked.

## Product Requirements & User Stories → [claude-rules/requirements.md](./claude-rules/requirements.md)
- Write solution design into `docs`; keep requirements docs updated in real time; generate user story files into `user_stories`; don't be anchored by existing pages.

## Design Guidelines → [claude-rules/design.md](./claude-rules/design.md)
- Clean, key-info-highlighted UI/UX (collapse complex features); use `ui-ux-pro-max` skill; pure design (don't read code); never SVG — use Font Awesome; keep the design index (`design/index.html` + `design/README.md`) in sync.

## Coding, Components & Logging → [claude-rules/coding.md](./claude-rules/coding.md)
- Every business-logic file needs a same-name `.md` (kept in sync); all API/backend logic in Hono `workers/api-worker`; reusable functions/split files; constants in a unified config; abstract moderately; one React component per file with state/render split; TanStack-first; log string-then-object.
