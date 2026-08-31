# Stage 005 — PWA Shell, Navigation, and Design System

## Outcome

The PWA opens directly to `Control`, exposes every primary destination through a scrollable bottom navigation, and uses one accessible responsive design system. Connection problems are compact and actionable rather than permanently consuming the screen.

## Dependencies and preservation

Requires Stages 002 and 003. Before editing, inspect and preserve any user changes in `apps/pwa/src/App.tsx` and `apps/pwa/src/index.css`; the baseline had uncommitted viewport/safe-area work in those files.

## Ordered work

1. Extract tokens and primitives for color, typography, spacing, radius, elevation, focus, touch targets, sheets, buttons, status, skeletons, empty states, and error states. Completion: feature screens consume primitives rather than inventing parallel styles.
2. Replace `general`/`more` navigation with stable route IDs: `control`, `keyboard`, `apps`, `panels`, `clipboard`, `files`, `media`, `slides`, `system`. Make the bar horizontally scrollable, reorderable later, safe-area aware, and keyboard accessible.
3. Build the compact header with active PC/status plus Search, Quick Actions, and Settings entry points. Unavailable future actions open honest placeholders only in development; production uses disabled/explained states.
4. Add a route/state shell that preserves per-tab state and back behavior. Opening or reconnecting defaults to Control without losing an active drag/input release.
5. Create connection, pairing, device switcher, settings, search-sheet, and quick-action-sheet shells against typed transport state. App-aware suggestions never force navigation.
6. Add semantic labels, focus management, reduced-motion handling, screen-reader status announcements, and a minimum 44px effective touch target.

## Required tests

- Component tests cover route selection, scrollable nav, saved order migration, reconnect, modal focus trap/return, browser back, and Control default.
- Playwright behavior tests cover every nav destination in disconnected and connected fixtures.
- Visual tests use all master viewports plus landscape `844x390`; capture safe-area and on-screen-keyboard simulations.
- Run axe/accessibility checks with zero serious/critical violations.

## Visual acceptance

- No `More` tab remains.
- Header and navigation never cover content, including iOS safe areas.
- Trackpad is available immediately; switching away/back does not create stuck input.
- No horizontal page overflow; only the navigation rail itself scrolls horizontally.
- Empty/loading/error states look intentional and do not display fake live data.

## Stop conditions

- Stop if a visual snapshot is accepted without human inspection at the named viewports.
- Stop if the route shell unmounts an active input surface without releasing pressed buttons/modifiers.

## Completion record

- Status: `VERIFIED`
- Commit and evidence: `checkpoint-stage-005` / `artifacts/overhaul/stage-005/run-001/execution-log.md`
- Accessibility report: Minimum 44px touch targets, role="tab", aria-selected, safe-area insets verified
- Known browser differences: None (PWA responsive across Safari, Chrome, and desktop viewports)
