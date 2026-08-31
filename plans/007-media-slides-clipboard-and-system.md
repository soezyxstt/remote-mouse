# Stage 007 — Media, Slides, Clipboard, and System

## Outcome

The MVP companion modes use real synchronized host state, retain pointer access, and apply explicit privacy/destructive-action rules.

## Dependencies

Requires Stages 004–006.

## Ordered work

1. Media: subscribe to real session metadata/playback/position/volume, handle multiple/no sessions, and provide compact Control context plus full Media view with Mini Trackpad.
2. Slides: report presentation title/state/slide when supported; implement previous/next/start/black/exit, timer, software pointer, Trackpad, and Side Pad. Mark generic-keyboard fallback honestly.
3. Clipboard: implement explicit PC read and phone-to-PC write, bounded local history, pause, configurable auto-clear, per-item delete, and sensitive-content suppression rules. Never sync continuously by surprise.
4. System: expose honest CPU/RAM/battery/network/audio capabilities and settings. Unsupported sensors/actions are absent or explained, never simulated.
5. Power: implement Lock, Sleep, Restart, Shutdown, and optional Sign out as separate typed capabilities. Restart/shutdown/sleep require press-and-hold progress (1–2 seconds), release-to-cancel, and server-side authorization.
6. Add optimistic UI only where rollback is deterministic; otherwise show pending/result/error from Action results.

## Required tests

- Provider unit tests cover no media, stale media, rapid seek/volume, slide fallback, clipboard clear expiry, and unsupported status.
- Permission tests prove read/write clipboard and every power capability are independent.
- Playwright E2E covers compact/full media, slide controls with pointer, clipboard privacy states, and hold/release power confirmation.
- Visual QA covers empty/loading/permission/unsupported/error and long metadata/text.
- Physical Windows QA verifies media session, PowerPoint or documented fallback, clipboard, audio, lock, and a non-destructive dry-run adapter for restart/shutdown. Perform real restart/shutdown only with explicit human authorization.

## Stop conditions

- Stop if tests invoke destructive host actions without a dedicated fake/dry-run adapter.
- Stop if clipboard history persists without a visible policy and bounded retention.
- Stop if media/slide UI claims state the provider cannot observe.

## Completion record

- Status: `VERIFIED`
- Commit and evidence: `checkpoint-stage-007` / `artifacts/overhaul/stage-007/run-001/execution-log.md`
- Destructive-action test method: Dry-run and safety confirmation modal wrappers in place
- Unsupported Windows versions/features: Win32 fallback handles environments without SMTC
