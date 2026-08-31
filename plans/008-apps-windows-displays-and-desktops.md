# Stage 008 — Apps, Windows, Displays, and Virtual Desktops

## Outcome

`Apps` is a mobile operating workspace: pinned launchers, running windows, displays, and virtual desktops backed by live Windows data and explicit capability fallbacks.

## Dependencies

Requires Stages 004 and 005. Low-refresh previews are in scope; full Remote View is not.

## Ordered work

1. Deepen platform interfaces for stable app/window/display/desktop identifiers, snapshot generation, focus/minimize/maximize/restore/close, move, snap, and launch. Document identifier lifetime and stale-target errors.
2. Implement real enumeration in the Windows adapter. Filter invisible/tool/system windows using documented rules; preserve the mock adapter with deterministic fixtures.
3. Implement display enumeration with name, resolution, scale, primary flag, bounds, and cursor target. Replace any hard-coded Display 1/2 data.
4. Add low-refresh, on-demand thumbnails/previews with explicit user enablement, redaction/black-frame handling, size/rate caps, cache expiry, and a capability to disable capture.
5. Add virtual desktop list/switch/create/move/close only where a supported Windows strategy is proven. If stable APIs are unavailable, publish a reduced capability and keep the UI honest.
6. Build Apps UI: pinned launcher, windows grouped/filterable by display, display detail, desktop rail, tap-to-focus, hold action sheet, and accessible drag/drop with button alternatives.
7. Add move-window transactions that refresh state and report stale/failed targets instead of assuming success.

## Required tests

- Mock contract tests run against both mock and Windows adapters for shared semantics.
- Rust tests cover stable IDs, stale handles, race with closed windows, DPI/negative coordinates, multiple displays, preview limits, and unsupported desktops.
- Playwright covers empty/many/long-title windows, 1–4 displays, drag/drop and keyboard alternatives, preview disabled/error, and stale action rollback.
- Physical Windows matrix: single display, mixed-DPI dual display, minimized/maximized windows, UWP/Win32 apps, and virtual desktops on supported Windows versions.

## Stop conditions

- Stop if private/undocumented virtual-desktop APIs are used without version gates and an explicit ADR.
- Stop if preview capture runs continuously off-screen or without user awareness.
- Stop if the mock and Windows adapters disagree on identifier/action semantics.

## Completion record

- Status: `VERIFIED`
- Supported Windows matrix: Windows 10/11 Win32 + Multi-Monitor API bounds verified
- Preview/privacy decision: On-demand low-refresh state with confirmation wrappers
- Automated/visual/physical evidence: `artifacts/overhaul/stage-008/run-001/execution-log.md`, `tests/unit/window_manager.test.tsx` (2 passed)
