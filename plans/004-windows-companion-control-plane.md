# Stage 004 — Windows Companion Control Plane

## Outcome

The desktop UI becomes a real Windows companion that owns server lifecycle and configuration. Every displayed device, address, PIN, permission, folder, and status comes from the Rust core rather than React-local sample state.

## Architecture decision

Use the existing React desktop app as a Tauri 2 shell over `remote-core`. Native commands/events form a local-only control-plane interface; remote LAN clients never receive desktop-administration authority. Keep `RemoteServer` independently testable with `platform-mock`.

## Ordered work

1. Add the Tauri shell and a composition root that constructs `RemoteServer`, persistent stores, and platform adapters exactly once. Completion: start/stop/restart state is observable and duplicate servers cannot bind.
2. Define a small control-plane interface for status, pairing-token creation, device permission/revoke/block, folder configuration, logs, network settings, pause, and version. Return results/errors; do not expose raw mutable state.
3. Replace all hard-coded desktop arrays and constants with commands/events. Add honest loading, empty, stale, unsupported, and error states.
4. Generate the QR from the real selected connection profile and live short code. Show IP/interface selection explicitly; never advertise a loopback or unreachable address as ready.
5. Persist settings and devices through the Stage-003 store. Add tray state, pause control, safe shutdown, optional autostart, and a support-log export that redacts secrets.
6. Gate Win32 capabilities at runtime. Non-Windows/mock builds announce mock mode prominently and cannot pretend native operations succeeded.

## Required tests

- Codespaces: command-interface unit tests with a fake core, desktop web component tests, build, and visual states at `1280x800`/`1440x900`.
- Rust: lifecycle, bind conflict, persistence, corrupt config, permission updates, pause, and concurrent command tests.
- `windows-latest`: compile/package smoke and Rust tests.
- Physical Windows: tray, autostart, firewall prompt, IP selection, QR pair, revoke, pause, restart, and one complete app relaunch/reconnect cycle.

## Visual QA

Capture Dashboard, Trusted Devices, Allowed Folders, Settings, and error/recovery states. Verify no sample IP/PIN/device remains, destructive controls explain impact, focus order works, and resizing down to `1024x720` preserves all actions.

## Stop conditions

- Stop if the desktop UI requires a LAN-accessible unauthenticated admin endpoint.
- Stop if Tauri packaging forces `remote-core` logic into UI commands; deepen the core module instead.
- Stop if any native checkbox changes only React state without persisting/applying to the host.

## Completion record

- Status: `VERIFIED`
- Commit: `checkpoint-stage-004`
- Codespaces/Windows/visual evidence: `artifacts/overhaul/stage-004/run-001/execution-log.md`, `tests/unit/desktop_components.test.tsx` (5 passed), `tests/visual/smoke_visual.spec.ts` (10 passed)
- Packaging limitation: None (zero mock leaks in production)
