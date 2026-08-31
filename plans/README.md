# Remote Mouse Overhaul — Master Execution Tracker

Dokumen ini adalah sumber status tunggal untuk overhaul. Baca [PRODUCT-SCOPE](PRODUCT-SCOPE.md) untuk arah produk yang harus dipertahankan; stage files menerjemahkannya ke urutan implementasi yang dapat diverifikasi terhadap repo saat ini. Gunakan [EXECUTION-LOG-TEMPLATE](EXECUTION-LOG-TEMPLATE.md) untuk bukti setiap run.

## Aturan status

- Gunakan tepat satu status: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, atau `VERIFIED`.
- `IMPLEMENTED` berarti perubahan kode selesai tetapi seluruh gate belum lulus.
- `VERIFIED` hanya boleh dipakai setelah semua kotak wajib pada baris stage tercentang dan bukti dicatat.
- `N/A` harus disertai alasan tertulis. Jangan menganggap pengujian mock sebagai pengganti pengujian Windows nyata.
- Kerjakan satu stage pada satu waktu. Stage berikutnya hanya boleh dimulai setelah dependency berstatus `VERIFIED`, kecuali master tracker mencatat alasan dan risiko pengecualian.

## Master checklist

| Stage | Milestone | Depends on | Status | Applied | Automated | Visual | Windows | Evidence/review |
|---|---|---|---|---|---|---|---|---|
| [001](001-baseline-codespaces-and-test-harness.md) | Baseline, Codespaces, test harness | — | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [002](002-protocol-action-and-transport-foundation.md) | Protocol, Action, transport seams | 001 | NOT_STARTED | [ ] | [ ] | N/A | N/A | [ ] |
| [003](003-pairing-session-and-security.md) | Pairing, session security, permissions | 002 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [004](004-windows-companion-control-plane.md) | Real Windows companion/control plane | 003 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [005](005-pwa-shell-navigation-and-design-system.md) | Mobile shell, navigation, design system | 002, 003 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [006](006-trackpad-sidepad-gestures-and-keyboard.md) | Trackpad, Side Pad, gestures, keyboard | 005 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [007](007-media-slides-clipboard-and-system.md) | Core companion feature set | 004, 005, 006 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [008](008-apps-windows-displays-and-desktops.md) | Apps, windows, displays, virtual desktops | 004, 005 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [009](009-search-context-and-quick-actions.md) | Search, context engine, quick actions | 007, 008 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [010](010-custom-panels-and-personalization.md) | Panels, action binding, personalization | 009 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [011](011-file-companion.md) | Secure two-way file companion | 003, 004, 005 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |
| [012](012-release-hardening-and-native-readiness.md) | Release gate, packaging, native readiness | 001–011 | NOT_STARTED | [ ] | [ ] | [ ] | [ ] | [ ] |

## Executor protocol

1. Read this file, [001](001-baseline-codespaces-and-test-harness.md), and only the active stage. Follow pointers to another stage only when the active file explicitly requires it.
2. Record `git status --short`, current branch, and the current stage status before editing. Preserve pre-existing changes; never reset, checkout, or rewrite them.
3. Set only the active stage to `IN_PROGRESS`. Create a checkpoint commit after its acceptance criteria pass; do not push or deploy unless the user separately authorizes it.
4. Implement production behavior behind the named module interfaces. Fixture/mock data may exist only in tests or an explicit development harness; production views must never silently fall back to convincing fake data.
5. Run the stage-specific checks and the shared gate below. Save logs/screenshots under `artifacts/overhaul/stage-NNN/<run-id>/`; do not mark a box based on memory or visual impression alone.
6. Inspect the full diff. Update the stage result block and this tracker. Mark `VERIFIED` only when required evidence exists and no stop condition remains.

## Shared verification gate

These scripts are created in Stage 001 and remain stable afterward:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run test:visual
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

The executor must run targeted tests while iterating, then the complete gate once before verification. On Codespaces, Windows-native checks may be skipped only when the stage file explicitly requires a separate `windows-latest` or physical-Windows gate.

## Visual QA contract

For every UI stage, test at minimum `390x844`, `430x932`, `768x1024`, `1280x800`, and `1440x900` where the surface applies. Capture disconnected, connecting, error, empty, populated, loading, and permission-denied states. Check safe areas, horizontal navigation, keyboard-open behavior, touch targets, overflow, focus visibility, contrast, reduced motion, and absence of accidental page scroll. Baseline images are reviewed artifacts, not auto-approved snapshots.

## Global invariants

- `Control` opens first and the main trackpad remains one tap away.
- High-rate pointer transport is separate from ordinary Actions, but still authenticated, authorized, bounded, and released on disconnect.
- Every user-triggered capability uses one canonical `Action` model and one server dispatcher; UI callers do not rebuild command routing.
- Windows and mock implementations are adapters at the existing platform seams. A mock success never proves Win32 behavior.
- Power, file, clipboard, preview, and automation capabilities fail closed.
- PowerToys, Everything, Remote View, internet relay, gyro, and React Native remain optional/deferred until the stage-012 gates say otherwise.

## Final result record

- Final status: `NOT_STARTED`
- Verified commit: `TBD`
- Evidence directory: `TBD`
- Known limitations: `TBD`
- Reviewer/date: `TBD`
