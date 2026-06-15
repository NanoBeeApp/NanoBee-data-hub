# scripts/dev-server.sh

## Responsibility

Single entry point that runs the data-hub Vite dev server on its fixed port
(`3344`). Designed to be supervised by a macOS launchd agent so the hub stays
up and auto-restarts if it crashes, is killed, or the machine reboots.

## Core behaviour / API

- `exec pnpm dev` and nothing else, so the supervising process tracks the real
  server PID directly (no wrapper shell lingering in between).
- Resolves the repo root from the script's own location (`dirname`), so it keeps
  working if the checkout is moved.
- Exports an explicit `PATH` that includes the Homebrew `node@24` toolchain —
  launchd starts jobs with a minimal `PATH` that would otherwise not find
  `pnpm`/`node`.

## Dependencies

- Upstream: launchd agent `~/Library/LaunchAgents/app.nanobee.datahub.plist`
  (`Label = app.nanobee.datahub`, `KeepAlive = true`, `RunAtLoad = true`) invokes
  this script and restarts it on exit. Logs to `private/logs/dev-server.log`.
- Downstream: `pnpm dev` → Vite + the Hono SSR worker, fixed to `127.0.0.1:3344`
  by `vite.config.ts` (`server.port` + `strictPort` + `host`).
- Consumer: NanoBee's worker fetches this hub via `DATA_HUB_URL=http://127.0.0.1:3344`;
  if the hub is down the chat agent gets zero data-hub tools and refuses
  external-data questions.

## Operations

```sh
# Load + start (and enable at login):
launchctl load -w ~/Library/LaunchAgents/app.nanobee.datahub.plist
# Stop + disable:
launchctl unload -w ~/Library/LaunchAgents/app.nanobee.datahub.plist
# Status:
launchctl list | grep app.nanobee.datahub
```

## Change history

### 2026-06-15 — created
- **Motivation**: the data-hub dev server kept stopping (e.g. when a foreground
  shell or a harness-managed background task ended), which silently broke the
  chat agent's data-hub tools — the agent would then refuse with "can't access
  external APIs". NanoBee (port 3333) already had a launchd auto-start; the hub
  needed the same so port 3344 stays up.
- **Goal**: keep `127.0.0.1:3344` always running and self-healing.
- **Key decision**: mirror NanoBee's `scripts/dev-server.sh` + launchd
  `KeepAlive` pattern exactly for consistency, rather than a bespoke
  loop/pm2 entry.
