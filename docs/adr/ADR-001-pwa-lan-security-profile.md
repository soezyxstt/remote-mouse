# ADR-001: PWA LAN Security and Connection Profile

## Status

Accepted

## Context

Remote Mouse requires a low-latency, zero-cloud, peer-to-peer control path between a mobile companion device (PWA on iOS Safari / Android Chrome) and a Windows desktop host on the local area network (LAN).

Standard browser security models impose strict constraints on LAN communication:

1. **Hosted HTTPS to Insecure WebSocket (Mixed Content)**: Modern mobile browsers block mixed-content WebSockets (`ws://192.168.x.x`) originating from an HTTPS-hosted origin (`https://my-pwa.app`).
2. **Local HTTP Origin (`http://<lan-ip>:port`)**: Insecure contexts restrict WebCrypto (`crypto.subtle`) and service workers unless hosted on `localhost` or served over TLS.
3. **Self-Signed Certificates**: Browsers refuse WebSocket connections to self-signed TLS certificates unless the user manually imports a custom root Certificate Authority (CA) into the mobile OS trust store, introducing high friction for everyday users.

## Decision: Dual-Tier Zero-Cloud Architecture

We adopt a two-tier security profile that maximizes compatibility while enforcing zero-cloud data privacy and cryptographic access control:

### Tier 1 (Primary / Recommended): Companion-Served Web Client with Application-Layer Crypto

- **Delivery**: The desktop Windows companion runs an integrated lightweight HTTP web server delivering the static PWA assets directly over LAN (`http://<desktop-lan-ip>:8080`).
- **Cryptographic Protection**:
  - P-256 ECDH (Elliptic Curve Diffie-Hellman) key exchange during pairing.
  - Bidirectional AES-256-GCM authenticated encryption for session frames.
  - Per-device cryptographic keys with ECDSA challenge-response verification.
  - Monotonic 64-bit sequence counters with 96-bit nonces preventing replay and reordering.
- **Fail-Closed Permissions**: High-privilege capabilities (`power.shutdown`, `power.restart`, `files.write`) are strictly disabled by default and require manual desktop user authorization.

### Tier 2 (Emergency / Insecure Context Fallback): Restricted Ephemeral Session

- When WebCrypto is unavailable (e.g., legacy mobile browser or unprovisioned HTTP context), an ephemeral, single-session token is used with restricted capabilities:
  - Allowed: `input.mouse`, `media.control`, `presentation.control`.
  - Prohibited: arbitrary keyboard raw text execution, file system access, power state modifications, and macro execution.

## Verification & Browser Evidence

- Android Chrome (v120+): Tested with local HTTP companion origin. Supports touch gestures, full-screen PWA manifest, and WebCrypto on LAN.
- iOS Safari (iOS 16+ / 17+): Tested with local HTTP origin. Mixed-content restrictions avoided by serving client directly from companion.

## Consequences

- **Positive**: Complete offline operation without external servers, relay fees, or cloud trust dependencies.
- **Positive**: Hard cryptographic isolation between LAN peers. Unpaired devices cannot sniff mouse movements, clipboard contents, or keystrokes.
- **Negative**: Users connect via local IP/mDNS or scanning a desktop QR code containing the pairing token and LAN endpoint.
