# Stage 010 — Custom Panels and Personalization

## Outcome

Users can build safe grid-based panels from a bounded component library, bind canonical Actions, associate panels with apps, and personalize navigation/gestures without a freeform editor.

## Dependencies

Requires Stage 009.

## Ordered work

1. Version the panel schema and add validation/migration for grid bounds, IDs, component props, Actions, capabilities, and app rules. Reject unknown/unsafe data with actionable errors.
2. Persist panels/macros in the Windows companion with atomic writes, export/import, conflict handling, and built-in preset immutability.
3. Replace the current renderer fallbacks with implemented V1 components: Button, Toggle, Slider, D-Pad, Text Input, App Launcher, Trackpad, labels/spacers where useful. Support Tap and Hold only.
4. Wire desktop builder save/load/duplicate/delete/test-preview to the real control plane. Keep the editor grid-based with explicit rows/columns and mobile preview; do not add arbitrary overlap/freeform positioning.
5. Implement app-linked suggestions and optional auto-open only with an explicit per-panel opt-in and a global override.
6. Persist navigation order/visibility, gesture mappings, Side Pad defaults, handedness, sensitivities, and per-app layout pins with schema migration/reset.

## Required tests

- Schema property tests cover overlap, overflow, duplicate IDs, unknown Action, missing capability, old-version migration, corrupt import, and recursion/macro limits.
- Renderer tests prove every component emits the expected canonical Action and disabled state.
- E2E covers create, preview, save, reopen, duplicate, export/import, app link, permission revocation, and reset.
- Visual QA covers desktop builder at `1280x800`/`1440x900` and mobile panels at all mobile/tablet viewports, including dense and invalid layouts.
- Physical Windows QA executes safe representative Actions; destructive Actions use dry-run until separately authorized.

## Stop conditions

- Stop if the builder can encode an Action the server cannot validate or authorize.
- Stop if macros permit unbounded recursion, delay, or step count.
- Stop if a panel can hide the persistent route back to Control.

## Completion record

- Status: `IN_PROGRESS`
- Schema version/migrations: Version 1 schema with grid-bounded components and action validation
- Commit and QA evidence: `checkpoint-stage-010` / `artifacts/overhaul/stage-010/run-001/execution-log.md`
- Known component limitations: Non-destructive representative actions verified
- Audit correction: schema/renderer foundations exist, but complete component behavior, tap/hold binding, persistent desktop builder, import/export, migration, app linkage, and physical QA remain open.
