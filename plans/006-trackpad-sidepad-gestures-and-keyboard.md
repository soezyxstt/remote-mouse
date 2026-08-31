# Stage 006 — Trackpad, Side Pad, Gestures, and Keyboard

## Outcome

Daily cursor control is low-latency and predictable: one-finger move/tap, two-finger tap, pinch zoom, double-tap drag, thin click bars, a dedicated configurable Side Pad, and a reusable Mini Trackpad in Keyboard/Slides/Media.

## Dependencies

Requires Stage 005. Use the Stage-002 `PointerStream` and Action interfaces; feature code does not send raw wire messages.

## Ordered work

1. Extract a deterministic gesture recognizer whose inputs are timestamped pointer samples and whose outputs are semantic gestures. Keep DOM capture/haptics in an adapter. Completion: gesture state can be unit-tested without React or a browser.
2. Implement pointer capture, coalesced events, velocity/sensitivity curve, tap slop, cancellation, visibility loss, reconnect, and release-all behavior. Bound send rate and queue length; expose dropped/coalesced metrics in development.
3. Implement defaults exactly: one-finger move/tap, two-finger tap right-click, two-finger pinch zoom, double-tap+drag, and separate thin left/right bars. Two-finger drag is not default scroll.
4. Build Side Pad as a narrow touch surface (not a scrollbar), left/right placement, adjustable width/sensitivity, and modes Scroll/Volume/Zoom/Custom. Finger count 1–6 produces the same Side Pad action.
5. Build resizable Context/Trackpad layout with snap points, reset, lock/pin, min/max bounds, and saved per-context preferences. Enlarged trackpad retains bottom navigation.
6. Reuse a configurable Mini Trackpad + Side Pad in Keyboard. Keep text input, modifiers, navigation keys, D-pad, Space, and predictable modifier reset.
7. Add configurable 3/4-finger mappings with Windows-like fallback. Leave 5/6-finger actions unassigned by default.

## Required tests

- Table-driven gesture tests cover thresholds, ambiguous transitions, 1–6 pointers, pinch/drag conflict, pointer cancellation, and timing boundaries.
- Integration tests assert exact Action/PointerStream output and no stuck button/modifier after every cancellation path.
- Performance test records p50/p95 input-to-dispatch latency and queue depth under a synthetic 120Hz pointer stream; set and document an initial budget.
- Visual/touch tests cover handedness, every Side Pad mode, resize bounds, landscape, safe areas, browser zoom prevention on the surface, and keyboard-open layout.
- Physical Windows test exercises cursor, click, drag, pinch target, scroll, volume, and reconnect on at least one phone.

## Stop conditions

- Stop if gesture tests rely only on browser screenshots.
- Stop if `touch-action`/page scrolling can steal an active gesture.
- Stop if a reconnect or tab switch can leave a Windows key/button down.

## Completion record

- Status: `IN_PROGRESS`
- Latency budget/results: pointer deltas are RAF-batched and carried inside authenticated application frames; a measured input-to-dispatch p50/p95 budget is still required.
- Automated/visual evidence: deterministic recognizer tests, component tests, and reviewed screenshots are recorded in `artifacts/overhaul/remediation-2026-08-31/execution-log.md`.
- Remaining gates: physical phone/Windows input QA, full cancellation/reconnect integration, configurable 5/6-finger mappings, and every Side Pad mode/landscape matrix.
