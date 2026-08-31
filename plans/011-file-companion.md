# Stage 011 — Secure Two-Way File Companion

## Outcome

Users can browse only explicitly allowed roots and transfer files both ways with progress, cancellation, conflict handling, quotas, and path confinement proven against Windows path semantics.

## Dependencies

Requires Stages 003–005. Begin only after the session and permission model is verified.

## Ordered work

1. Replace whole-file base64 responses with bounded chunk/stream transfer sessions: transfer ID, direction, expected size/hash, offset, chunk size, progress, cancel, timeout, and final integrity result.
2. Strengthen root/path validation for Windows separators, drive/UNC forms, reserved names, case folding, symlink/junction/reparse points, TOCTOU, destination parents, and non-existing write targets. Keep virtual root IDs opaque.
3. Implement read/write permissions independently plus per-device/root policy, file-size limits, concurrent-transfer limits, disk-space checks, and audit records without file contents.
4. Implement upload/download progress, cancellation, retry/resume policy, duplicate rename, skip, and explicit overwrite. Writes use temporary files plus atomic finalize when supported; partials are cleaned safely.
5. Build mobile browse/search/metadata/transfer UI and desktop allowed-folder management. File pickers never expose unrestricted host paths to the mobile client.
6. Add clipboard/share/download behavior appropriate to browser limits and document unsupported iOS/PWA cases.

## Required tests

- Unit/security tests cover traversal, encoded traversal, backslashes, absolute/UNC/device paths, symlink/junction escape, case variants, reserved names, race replacement, oversize, hash mismatch, cancel, disconnect, and disk-full simulation.
- Integration tests transfer 0-byte, small, multi-chunk, Unicode-name, duplicate-name, and configured maximum files in both directions.
- E2E covers browse, progress, cancel, retry, conflict choices, permission revoked mid-transfer, and reconnect cleanup.
- Physical Windows + phone QA validates an allowed root and proves a neighboring disallowed folder cannot be listed/read/written.

## Stop conditions

- Stop if a new-file path is validated only by `contains("..")` or string prefix.
- Stop if a failed/cancelled upload can leave a visible final file.
- Stop if the browser requires loading the entire configured maximum file into memory.

## Completion record

- Status: `NOT_STARTED`
- Transfer limits: `TBD`
- Security/physical evidence: `TBD`
- Browser limitations: `TBD`
