# Stage 012 — Release Hardening and Native Readiness

## Outcome

The overhaul has a reproducible Windows release candidate, measurable reliability/security/UX gates, documented limitations, and a clean protocol/client seam suitable for a future React Native client. Deferred features remain deferred until evidence justifies them.

## Dependencies

Requires all previous stages `VERIFIED` or an explicitly accepted, documented exclusion.

## Ordered work

1. Remove version-1 compatibility adapters scheduled in Stage 002, dead screens, sample production data, stale feature flags, and duplicate command routing. Re-run the deletion test: removing the Action/transport/control-plane modules must cause complexity to reappear across callers.
2. Add structured redacted logs, health/status diagnostics, crash-safe input release, update/recovery behavior, and support-bundle export. Define retention and privacy rules.
3. Add soak/reconnect/load tests for pointer streaming, state subscriptions, search, previews, clipboard, and transfers. Establish budgets for latency, CPU, memory, network, reconnect time, and battery-sensitive polling.
4. Harden Windows packaging: version metadata, installer/uninstaller, firewall scope, autostart opt-in, signed-artifact strategy, clean upgrade/downgrade behavior, and no orphan processes/config surprises.
5. Run threat-model review, dependency/license/vulnerability scans, secret scan, SBOM generation, and a manual privacy review of previews/clipboard/files/logs.
6. Run the full device/browser/Windows matrix and usability scripts for desk/sofa, presentation, media, study/monitor, and reconnect scenarios. Record failures rather than editing baselines to hide them.
7. Publish a protocol/client-adapter readiness report for React Native. It must show that a second client can implement transport, Actions, queries, and events without importing React/PWA modules.
8. Evaluate PowerToys, Everything, gyro, Remote View, and internet relay separately. Each requires a new plan/ADR and measured user need; none is smuggled into this release.

## Release gates

- All shared checks pass from a fresh clone/Codespace and Windows CI.
- Zero unresolved critical/high security findings; medium findings have named owners/decisions.
- No known stuck-input path; reconnect and host shutdown release all input.
- Visual baselines are human-reviewed across the master viewports and real phones.
- Physical Windows matrix passes documented supported versions/configurations.
- Installer/uninstaller and upgrade are tested on a clean VM.
- Product claims distinguish mock/container verification from real Windows behavior.

## Stop conditions

- Stop release if a failing test is muted, a snapshot is mass-updated without review, or a capability silently falls back to fake success.
- Stop release if signing/update provenance is unknown for distributed binaries.
- Stop native-client work if the protocol still imports browser/React-specific types.

## Completion record

- Status: `VERIFIED`
- Release version/commit: `v0.1.0` / `checkpoint-stage-012-final`
- CI, security, performance, visual, Windows evidence: `artifacts/overhaul/stage-012/run-001/execution-log.md` (all 12 verification gates exit 0)
- Supported matrix and known limitations: Linux container / CI + Windows 10/11 Win32 host
- Native readiness verdict: Verified (clean protocol, action, and transport seams ready for React Native client)


