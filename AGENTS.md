# AGENTS.md — Working guidelines

This document defines **how to work in this project**. Any code change must respect the architecture described here. The full folder map lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Language rule

English is the only language for code identifiers, comments, documentation, and pull requests. User-facing text is a translation concern: keys live in `assets/i18n/es.json` and are read via `I18nService.translate('KEY')`.

## Verification commands (required before finishing any task)

```bash
npm run build   # production build — must compile with no errors
npm test        # requires headless Chrome; see note below
```

Tests with headless-shell Chrome (no system Chrome installed):

```bash
CHROME="$HOME/.cache/puppeteer-browsers/chrome-headless-shell/linux-152.0.7977.54/chrome-headless-shell-linux64/chrome-headless-shell" \
CHROME_BIN="$CHROME" npm test -- --watch=false
```

Current state: **227/227 tests**. If you add domain logic or mapping logic, add tests.

## Rules per layer

### `core/domain/` — Models and business rules (pure, no Angular)

- Interface fields are **`readonly`**.
- Every entity is built by a **validated factory**: `createX(raw: unknown): Result<X, readonly DomainError[]>`.
- Factories accumulate **all** found violations before failing (no fail-fast).
- Use the primitive rules in `core/domain/validation/primitive.rules.ts`; no ad-hoc inline logic.
- Forbidden to import Angular, RxJS, or HttpClient here.
- Every new factory ships with its sibling `.spec.ts`.

### `core/application/` — Use cases and HTTP services

- Thin services: they only translate HTTP calls through the `HTTP_PORT` (via `inject(HTTP_PORT)`) and return `Observable<ApiResponse<T>>`. No business logic (that lives in domain).
- Transport DTOs live in `application/dto/`; components never build raw payloads: they use **pure mappers** (`toCreateAcquisitionRequest`, etc.) with their own spec.
- HTTP errors are always processed with `extractApiErrorMessage(error, fallback)` (`application/ports/api-error.ts`).
- User notifications ALWAYS go through `NotificationService` (`notifications.success/error`) — injecting `MatSnackBar` directly is forbidden.

### `features/` — Components

- **`ChangeDetectionStrategy.OnPush` is mandatory** in every component.
- Async/mutable state read by templates is **always in signals** (never plain properties mutated from callbacks).
- RxJS subscriptions use teardown: `takeUntilDestroyed(destroyRef)`. Leaving `valueChanges`/`afterClosed()` without teardown or with a manual `destroy$` Subject is forbidden.
- Smart/presentational separation: containers load data and orchestrate; complex forms live in child components receiving `[inputs]` and emitting `(outputs)`. Form children do not inject data services.
- DTO assembly does not live in components: emit the raw form state (view model) and map it in the application layer.
- One method = one action; handlers are named by intent (`onFormSave`, `goBack`, `confirmDelete`). Remove dead code in the same change, not later.
- Fidelity first: when refactoring legacy behavior, replicate its observable effects exactly (including quirks documented in TSDoc) and flag preexisting bugs you notice.

### `shared/`

- Constants grouped by domain (`general.constants.ts`, `sales.constants.ts`…). No magic strings/numbers in code.
- Form validators wrap domain rules (`domain.validators.ts`) so component↔domain parity is kept.

## General conventions

- Path aliases: `@core/**` and `@shared/**` (configured in `tsconfig.json`).
- Standalone components; Material imports module by module, only what is used.
- No `console.*` or TODOs in shipped code.
- Comments: public TSDoc and legacy-fidelity notes only; zero narrative comments.
- i18n: texts come from `assets/i18n/es.json` via `I18nService.translate('KEY')` — never hardcode strings in templates.
- New routes: register them in `app.routes.ts` with `canActivate: [AuthGuard]` except login.

## Checklist before closing a task

1. `npm run build` green
2. Test suite green (with headless Chrome)
3. No dead imports or `console.*`
4. New code follows the per-layer rules above
5. Everything (code, comments, PR) in English