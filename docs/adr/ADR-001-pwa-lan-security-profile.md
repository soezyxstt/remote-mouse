# ADR-001: PWA LAN Security and Connection Profile

## Status

Proposed — blocked pending an implemented TLS/delivery profile and physical-device validation.
The previous `Accepted` record and its Android/iOS test claims were invalidated by the 2026-08-31
audit because no supporting device evidence exists.

## Context

Remote Mouse needs a low-latency, zero-cloud path between a mobile browser and a Windows host. The
browser constraints are part of the security boundary:

1. A hosted HTTPS PWA cannot open an insecure `ws://` LAN connection without mixed-content risk.
2. `SubtleCrypto` is exposed only in a secure context by the Web Crypto specification, so a client
   served from an ordinary `http://<lan-ip>` origin cannot be the supported WebCrypto profile.
3. A locally generated TLS certificate is useful only after the phone trusts its issuer and the
   requested hostname matches the certificate.

References:

- <https://www.w3.org/TR/WebCryptoAPI/#dfn-SubtleCrypto>
- <https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API>

## Profiles considered

### Companion-served HTTP plus application-layer crypto

Rejected as the current production profile. It avoids HTTPS mixed content, but the HTTP LAN origin
does not provide the secure context required by the browser implementation in
`apps/pwa/src/protocol/crypto.ts`. Shipping a reduced plaintext or shared-PIN tier would recreate the
audited vulnerability.

### Locally trusted HTTPS/WSS companion

Preferred PWA candidate. The companion serves the PWA and WebSocket over TLS using an identity that
the phone explicitly trusts. This keeps WebCrypto, service workers, and WSS available, but certificate
provisioning, hostname verification, rotation/revocation, and iOS/Android installation instructions
must be implemented and tested before this ADR can be accepted.

### Hosted HTTPS PWA plus trusted WSS companion

Viable only if the same companion certificate/trust requirements are solved and the server enforces
an allowlist for the hosted origin. It adds a cloud delivery dependency but does not relay control
traffic.

### Native-client acceleration

Deferred until Stage 012. A native client can use the protocol without browser secure-context and
certificate UX constraints, but moving early would duplicate an unstable contract.

## Provisional decision

- Keep the P-256 ECDH, transcript-bound ECDSA login, directional HKDF/AES-256-GCM session frames,
  strict sequence counters, and encrypted pointer path implemented by the remediation.
- Fail closed when `window.isSecureContext` or `crypto.subtle` is unavailable. There is no emergency
  plaintext tier.
- Do not claim a supported physical PWA connection profile until locally trusted HTTPS/WSS (or a
  separately reviewed alternative) passes Android and iOS tests.
- The final QR must bind the expected PC identity, trusted hostname/endpoint, and one-time pairing
  ceremony. A six-digit PIN sent as ordinary LAN JSON is not sufficient server authentication.
- Destructive/file/clipboard/automation capabilities remain disabled until the desktop user grants
  them and the live persistent device registry authorizes each action.

## Acceptance evidence still required

- Companion TLS/WSS implementation and restricted origin/host policy.
- First-pair and reconnect E2E, including wrong host, certificate mismatch, replay, revoke, and
  interrupted-handshake recovery.
- Physical Android Chrome and iOS Safari versions, trust-provisioning steps, installability result,
  and screenshots/logs with reusable secrets redacted.
- Explicit review of certificate renewal/revocation and PC identity display in the QR flow.

Until those gates pass, Stage 003 remains `IN_PROGRESS` and the product must describe browser LAN
connectivity as unavailable rather than silently weakening transport security.
