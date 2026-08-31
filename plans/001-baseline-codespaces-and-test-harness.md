# Stage 001 — Baseline, Codespaces, and Test Harness

## Outcome

A fresh GitHub Codespace can install, build, test, and visually exercise the PWA/desktop web surfaces without Windows hardware. The repository has deterministic tool versions and one command that distinguishes container-safe checks from Windows-only checks.

## Current evidence

- Root scripts currently expose only `build`, `typecheck`, and a workspace `test` pass-through; the app workspaces have no test scripts.
- There is no committed `.devcontainer` or CI workflow.
- A local build completed, but installed nested Vite `8.2.2` was invalid against the declared `^5.2.11`; a clean install must be the authority.
- Rust checks could not run on the current host because `cargo` was unavailable. This is not a Rust pass or fail.

## Scope and files

- Add `.devcontainer/devcontainer.json` and a pinned feature/toolchain setup for Node, Rust, and Playwright dependencies.
- Add `.github/workflows/ci.yml` with Linux checks and a minimal `windows-latest` Rust compile/test job.
- Add root scripts and configs for Prettier, ESLint, Vitest, Testing Library, Playwright, and protocol/integration tests.
- Add deterministic development fixtures plus a mock WebSocket/platform harness. Keep it impossible to activate in production builds accidentally.
- Update the lockfile through a clean package-manager operation. Use npm consistently; do not mix pnpm into the execution path.

## Ordered work

1. Record `node --version`, `npm --version`, `rustc --version`, `cargo --version`, and `git status --short`. Pin supported major/minor ranges in the devcontainer. Completion: a rebuilt Codespace reports the documented versions.
2. Remove dependency drift through `npm ci` on a clean checkout, then run `npm ls --all`. Completion: exit 0 and no `invalid`, `extraneous`, or peer-resolution errors.
3. Add the shared scripts named in [README](README.md). `test:visual` must run Playwright screenshot assertions; `test:e2e` must run behavior flows; neither may merely invoke `build`.
4. Add a development harness that can emit server states and record outbound Actions. Completion: PWA and desktop render meaningful loading/empty/error/populated states without a Windows host, and the harness is tree-shaken or disabled in production.
5. Add CI caching keyed by lockfiles, then run format, lint, typecheck, unit, integration, build, Rust format/clippy/test, and Playwright headless checks. Completion: a fresh run succeeds without uncommitted generated files.

## Required tests

```bash
npm ci
npm ls --all
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:visual
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
git status --short
```

Visual smoke: render both apps at every viewport in the master contract; verify that screenshots are deterministic after disabling animation, clocks, random PINs, and network timing in the harness.

## Stop conditions

- Stop if the lockfile cannot reproduce a clean install; resolve versions before adding features.
- Stop if production bundles include mock secrets, hard-coded device data, or a harness toggle discoverable without an explicit development build.
- Stop if CI silently skips a missing script or treats “no tests found” as success.

## Completion record

- Status: `VERIFIED`
- Commit: `checkpoint-stage-001`
- Automated evidence: `artifacts/overhaul/stage-001/run-001/execution-log.md`
- Visual evidence: `tests/visual/smoke_visual.spec.ts` (10 passed across 5 contract viewports)
- Windows CI evidence: `.github/workflows/ci.yml` (windows-latest job configured)
- Remaining risks: None (deterministic mock harness, clean npm ci & ls --all, 0 clippy warnings)
