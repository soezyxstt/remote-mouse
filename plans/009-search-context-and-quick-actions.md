# Stage 009 — Universal Search, Context Engine, and Quick Actions

## Outcome

Search finds capabilities—not merely text—and Context/Quick Actions reuse the same canonical Action model without taking control away from the user.

## Dependencies

Requires Stages 007 and 008.

## Target modules

- `SearchHost`: small query interface, provider registry inside; native adapters for Apps, Windows, Files metadata, System Actions, Panels, and Recent.
- `ContextEngine`: consumes normalized host state and returns recommendations/layout hints, never forced navigation or silent mode changes.
- `QuickActions`: composes pinned, recent, and contextual Actions using the same registry.

## Ordered work

1. Define a unified search result with stable ID, provider, title/subtitle, icon hint, score, availability, required capability, and executable Action.
2. Implement deterministic normalization, ranking, deduplication, cancellation, time budget, and provider error isolation. Empty queries show recent/pinned; no AI is used.
3. Implement native providers and capability filtering. File search in this stage is metadata-only and limited to allowed roots; full transfer remains Stage 011.
4. Implement Context adapters for Browser, Media, and PowerPoint plus a generic fallback. App suggestions may choose an initial layout only when no pinned user preference exists.
5. Implement Quick Actions sections for pinned/recent/contextual with bounded history and privacy-aware labels.
6. Add header sheets and Control context area. Dismiss, pin, override, and reset are always available.

## Required tests

- Deterministic ranking golden tests, duplicate/stale result handling, provider timeout, cancellation, permission filtering, and empty query.
- Context tests prove user-pinned layout wins and repeated foreground changes do not thrash navigation/modes.
- E2E executes one result from every provider through the canonical dispatcher and handles revoked permissions.
- Visual QA covers no results, many results, long file/window names, slow provider, keyboard-open state, pinned override, and context changes.
- Physical Windows QA verifies browser/media/PowerPoint recognition with false-positive cases.

## Stop conditions

- Stop if a provider launches/changes the host during search rather than returning a result.
- Stop if app detection forces tab or Side Pad changes without user consent.
- Stop if optional PowerToys/Everything becomes required for native search.

## Completion record

- Status: `VERIFIED`
- Ranking contract/evidence: Deterministic normalized ranking with deduplication verified
- Context false-positive notes: Non-intrusive AppAware toast with explicit per-process dismissal
- Commit and QA evidence: `checkpoint-stage-009` / `artifacts/overhaul/stage-009/run-001/execution-log.md`
