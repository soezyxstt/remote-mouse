# Stage 002 — Protocol, Action, and Transport Foundation

## Outcome

Callers learn a small transport interface and a single Action interface. Serialization, request correlation, capability checks, retries, errors, and version compatibility remain inside those modules. Pointer deltas keep a dedicated low-latency lane.

## Dependencies and non-goals

- Requires Stage 001 `VERIFIED`.
- Do not add new product screens. Do not implement Remote View or internet relay.
- Preserve the real seams already represented by Windows and mock platform adapters; do not create a new interface when only one implementation exists.

## Current evidence

- TypeScript and Rust message/capability/action definitions are handwritten mirrors.
- UI code calls `globalRemoteClient.send(...)` with feature-specific payloads in many places.
- `DynamicPanelRenderer` duplicates Action-to-message routing already represented by the Rust macro engine.
- Many server handlers discard provider errors and provide no correlated acknowledgement.

## Target interfaces

Define and document:

```ts
interface CompanionTransport {
  connect(target: ConnectionTarget): Promise<SessionInfo>;
  disconnect(reason?: string): Promise<void>;
  execute(action: Action): Promise<ActionResult>;
  request<Q extends Query>(query: Q): Promise<QueryResult<Q>>;
  subscribe<E extends CompanionEvent>(type: E['type'], listener: (event: E) => void): Unsubscribe;
}
```

The interface includes timeout, cancellation, typed error, version, ordering, and reconnect semantics. `PointerStream` is a separate interface with rate/batch bounds and explicit release behavior.

## Ordered work

1. Inventory every message in both languages and classify it as handshake, Action, query/result, event, or pointer stream. Completion: every existing message has exactly one class and capability.
2. Make `packages/protocol` the logical contract source and add cross-language golden JSON fixtures. Rust mirrors may remain, but parity tests must serialize/deserialize every variant both ways and fail on drift.
3. Replace stringly action values with tagged variants for keyboard, app, window, monitor, desktop, media, presentation, system, clipboard, search, and panel actions. Validate all bounds before dispatch.
4. Implement one server Action dispatcher returning a structured result. Existing direct message names may remain temporarily as version-1 compatibility adapters, with deprecation tests and a removal milestone.
5. Implement `CompanionTransport` and an in-memory test adapter. Migrate callers incrementally; completion requires no production UI switch statement that translates Action variants into wire message names.
6. Add request IDs, correlated `result`/`error`, timeout/cancel behavior, protocol version negotiation, unknown-message errors, maximum frame sizes, and deterministic reconnect rules.

## Required tests

- Golden fixtures cover every Action, query, event, error, and capability in TypeScript and Rust.
- Property/fuzz-style tests reject malformed enums, NaN/Infinity, oversized text, invalid indices, duplicate IDs, unsupported versions, and unknown actions.
- Integration tests prove one Action crosses the in-memory transport, server dispatcher, and mock platform exactly once and returns its provider error unchanged.
- Pointer tests prove batching/order and `release_all_inputs` on disconnect without going through ordinary Action dispatch.

Run the shared gate plus:

```bash
npm run protocol:check
npm run test:integration -- action-transport
cargo test --workspace protocol action_dispatch
```

## Stop conditions

- Stop if the TypeScript/Rust parity test cannot detect an intentionally changed fixture.
- Stop if compatibility code becomes a second dispatcher rather than a thin adapter.
- Stop if provider failures are converted to silent success.

## Completion record

- Status: `IN_PROGRESS`
- Contract/version decision: `packages/protocol` canonical contract with golden JSON fixtures & `ActionDispatcher`
- Commit and evidence: `checkpoint-stage-002` / `artifacts/overhaul/stage-002/run-001/execution-log.md`
- Deprecated messages remaining: Version-1 legacy adapters maintained in `server.rs` alongside canonical `action.execute`
- Audit correction: canonical Actions and parity fixtures exist, but production UI callers and compatibility handlers have not all migrated; the previous verification is invalid.
