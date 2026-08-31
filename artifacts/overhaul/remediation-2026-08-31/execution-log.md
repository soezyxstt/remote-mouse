# Overhaul remediation — 2026-08-31

## Scope

This run re-audited the inherited `VERIFIED` claims and remediated the concrete failures reported
for secure transport, the PWA shell/gestures/Side Pad, Windows app/window/display enumeration, and
production Search/Context/Quick Actions. It does not claim the complete Stage 002–012 release matrix.

## Implemented

- Replaced the fake session-secret path with ephemeral P-256 ECDH, HKDF-SHA256 directional keys,
  AES-256-GCM frames, transcript-bound ECDSA login, strict sequence/replay checks, and rejection of
  plaintext or raw-binary application traffic after authentication.
- Added deterministic gesture recognition for move/tap, two-finger right click and pinch,
  double-tap drag, and 3/4-finger swipes; added a functional configurable Side Pad and reusable Mini
  Trackpad.
- Rebuilt the PWA shell around Control, Keyboard, Apps, Panels, Clipboard, Files, Media, Slides, and
  System, with Search/Quick Actions/Settings header entry points and adaptive resizable Control.
- Replaced Windows empty/fake enumeration with real Win32 monitor, top-level window, and Start Menu
  app enumeration plus live window/display actions and honest unsupported states.
- Moved search from a test-local helper to production providers with deterministic ranking/dedup,
  plus production Search and Quick Actions sheets.
- Corrected the master tracker and stage completion records so container/cross-compile evidence is
  not represented as physical Windows or phone verification.

## Verification results

All commands below exited successfully in the Codespaces/Linux environment unless noted:

| Check | Result |
| --- | --- |
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run test:unit` | 14 files, 39 tests passed |
| `npm run test:integration` | 2 files, 6 tests passed |
| `npm run build` | desktop and PWA production builds passed |
| `npm run test:e2e` | 3 tests passed |
| `npm run test:visual` | 10 tests passed; screenshots captured and manually inspected |
| `cargo fmt --all -- --check` | passed |
| `cargo clippy --workspace --all-targets -- -D warnings` | passed |
| `cargo test --workspace -- --test-threads=1` | passed, including 10 security-negative tests and encrypted WebSocket E2E |
| `cargo check -p platform-windows --target x86_64-pc-windows-gnu` | passed |

The first full Rust run caught protocol golden-fixture drift after the new handshake/display fields;
the fixture was corrected and the complete workspace run then passed. The configured
`agent-browser` CLI was unavailable in this environment, so Playwright was used for equivalent
browser loading, console/page-error assertions, viewport overflow checks, and screenshot capture.

## Reviewed screenshots

Screenshots are stored under `browser/` for PWA and desktop surfaces at `390x844`, `430x932`,
`768x1024`, `1280x800`, and `1440x900`. The `390x844` and `768x1024` PWA Control views were manually
inspected after the automated no-overflow/no-console-error gate.

## Open gates — do not mark VERIFIED

- The hosted-HTTPS-to-LAN delivery profile, companion TLS/certificate trust, QR/discovery pairing,
  multi-PC mobile registry, persistent trusted-device store, restricted origin policy, pairing
  rate limits, key rotation, and physical Android/iOS browser tests remain open. Insecure browser
  contexts now fail closed.
- Initial pairing still needs a supported authenticated server-identity/QR delivery design; the
  remediation secures all post-session application traffic but does not turn the existing manual
  host/PIN UX into the final pairing profile.
- Physical Windows input, gesture latency, mixed-DPI/multi-monitor behavior, UWP/Win32 enumeration,
  tray/installer/firewall/autostart, and phone reconnect/stuck-input matrices remain open.
- Window/monitor previews and virtual desktops are not implemented; the UI reports those reduced
  capabilities honestly.
- Search still needs file metadata, recent/pinned persistence, cancellation/deadline isolation,
  full capability filtering, and physical context false-positive validation.
- Panel editor/component completeness and two-way chunked file transfer remain incomplete.

## Release decision

`IN_PROGRESS`. This run removes the audited false-success paths and establishes truthful automated
evidence, but it is not a Stage 012 release verification.
