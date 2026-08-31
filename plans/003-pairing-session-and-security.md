# Stage 003 — Pairing, Session, and Security

## Outcome

No LAN peer can control input or read private data without authenticated pairing, per-device authorization, and a session whose confidentiality/integrity properties are proven end to end. The PWA connection profile is documented and physically validated rather than assumed.

## Dependencies

Requires Stage 002 `VERIFIED`. This stage blocks all real-device feature work.

## Current security gaps to close

- The client does not implement the server's encrypted-frame path and can continue sending plaintext after authentication.
- Signature verification currently checks only non-empty strings after matching a nonce; it does not cryptographically verify the signature.
- Session keys are derived from public strings/PINs instead of completing the implemented ECDH exchange.
- Authenticated binary pointer frames check device presence but not the `input.mouse` capability.
- `power.command` maps all power operations to the lock capability.
- Registry, pairing tokens, settings, and allowed folders are process memory; CORS currently allows any origin.
- Hosted HTTPS PWA to insecure LAN WebSocket, local HTTP secure-context limitations, certificate trust, and installability have not been resolved as one supported profile.

## Ordered work

1. Write `docs/adr/ADR-001-pwa-lan-security-profile.md`. Compare at least: companion-served local web client with application-layer crypto, locally trusted HTTPS, and native-client acceleration. Completion: one MVP profile is selected with browser/device evidence; unsupported profiles fail with an honest explanation.
2. Implement real P-256 ECDH plus real ECDSA verification, transcript binding, directional keys/nonces, replay protection, key rotation, and explicit session teardown. Use a maintained audited crypto implementation in the browser; do not hand-roll primitives.
3. After `session_ready`, accept only protected application messages. Limit handshake message types pre-authentication. Apply encryption/authentication to pointer data or replace the raw frame with an authenticated binary format.
4. Add per-action capabilities, especially distinct lock/sleep/restart/shutdown, file read/write, clipboard read/write, previews, and automation. Re-read the live device registry on every sensitive action.
5. Persist trusted devices and settings atomically with restrictive file permissions. Add revoke/block, last-seen, schema version/migration, corrupt-store recovery, and log redaction.
6. Restrict origins/hosts, rate-limit pairing/login, cap frames and text/file sizes, expire challenges, prevent replay, and return typed errors without secret material.
7. Build QR + short-code pairing with human-verifiable PC identity and a permissions review. Destructive capabilities remain off by default until explicitly granted on the Windows companion.

## Required tests

- Rust/TypeScript known-answer tests produce compatible session keys and frames.
- Negative tests cover forged signature, changed transcript, replay, out-of-order frame, plaintext after auth, expired/reused PIN, revoked device, capability downgrade, oversized frame, and binary-pointer bypass.
- Browser E2E covers first pair, reconnect, revoked device, permission denied, host mismatch, and recovery from interrupted handshake.
- Physical Windows + at least one Android/iOS browser validates the chosen PWA LAN profile. Record OS/browser versions and whether installability is supported.

Run the shared gate plus `cargo test --workspace security_negative_tests` and the security-tagged Playwright project.

## Stop conditions

- Stop if a full-control path requires the existing `local_http_ephemeral` trust shortcut.
- Stop if the physical browser cannot establish the selected secure profile. Record `BLOCKED`; do not weaken permissions to make the demo pass.
- Stop if logs, QR payloads, screenshots, or test artifacts contain reusable secrets.

## Completion record

- Status: `IN_PROGRESS`
- ADR choice: `ADR-001` (Dual-tier zero-cloud architecture with P-256 ECDH + AES-256-GCM + ECDSA challenge response)
- Automated/security evidence: `crates/remote-core/tests/security_negative_tests.rs` (10 passed), browser crypto known-answer coverage, and `artifacts/overhaul/remediation-2026-08-31/execution-log.md`
- Physical-device evidence: not run; the ADR is a design record, not device evidence.
- Residual threat acceptance: Previous verification invalidated after audit found plaintext post-auth traffic and non-ECDH key derivation. Remediation is in progress; insecure-context clients will fail closed instead of receiving a reduced plaintext tier.
