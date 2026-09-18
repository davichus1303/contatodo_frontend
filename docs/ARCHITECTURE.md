# Architecture map — contatodo_web

Angular 17 standalone + Material. Layered organization with enforced dependency direction:

```
features ──▶ core/application ──▶ core/domain
   │                │
   └──▶ shared ◀────┘        (domain depends on nothing)
```

Dependency rule: `domain` is pure (no Angular/RxJS imports); `application` knows `domain`; `features` know `application` and `shared`. Never the other way around.

```
src/app/
├── app.config.ts               # root providers (HttpClient, interceptors, adapters)
├── app.routes.ts               # routes with AuthGuard
│
├── core/                       # technical + business core
│   ├── domain/                 # PURE — no Angular or RxJS
│   │   ├── models/             # readonly entities + validated factories
│   │   │                       #   product/sale/acquisition/acquisition-type/
│   │   │                       #   module/user/role/company  (+ sibling .spec.ts)
│   │   │                       #   createX(raw): Result<X, DomainError[]>
│   │   ├── errors/             # DomainError + domainError()
│   │   ├── result/             # Result<T> = { ok: true, value } | { ok: false, error }
│   │   └── validation/         # primitive.rules.ts (isNonEmptyString,
│   │                           #   isFiniteNumber, isBoolean, isRecord,
│   │                           #   isValidEmail) + validation.rules.ts
│   │
│   ├── application/            # use cases
│   │   ├── products|sales|acquisitions|acquisition-types|
│   │   │   expenses|modules|roles|companies/  # thin services over HTTP_PORT
│   │   ├── dto/                # transport DTOs (request/response)
│   │   ├── ports/              # HTTP_PORT, ApiResponse, api-error.ts
│   │   │                       #   (extractApiErrorMessage — pure)
│   │   ├── notifications/      # NotificationService (centralized snackbar)
│   │   └── acquisitions/create-acquisition.mapper.ts  # form→DTO mappers (pure)
│   │
│   ├── adapters/               # infrastructure behind ports
│   │   ├── http/               # http.adapter (implements HTTP_PORT)
│   │   └── storage/            # local-storage.adapter
│   ├── auth/                   # AuthService (session/token)
│   ├── config/                 # api-routes.constants.ts (URLs from env)
│   ├── guards/                 # AuthGuard, LoginGuard
│   ├── i18n/                   # I18nService (assets/i18n/es.json)
│   └── interceptors/           # auth.interceptor
│
├── features/                   # pages grouped by domain
│   ├── login/
│   ├── sales/                  # + sale-dialog/, sales-history/
│   ├── products/               # + product-form/ (child form component)
│   ├── acquisitions/           # + new-acquisition/
│   │                           #   new-acquisition = smart container;
│   │                           #   acquisition-form = presentational child;
│   │                           #   mapper in core/application
│   ├── acquisition-type-catalog/  # + dialog/, delete-dialog/
│   ├── company-catalog/           # companies list + search
│   └── roles/
│
├── layout/
│   └── modules-navigation/     # navigation by user module
│
└── shared/
    ├── components/confirmation-dialog/
    ├── constants/              # GENERAL/SALES/LOGIN/... .constants.ts
    ├── utils/                  # dialog/pending-ids/search/display .utils.ts
    └── validators/             # domain.validators.ts (wrap domain rules)

src/assets/i18n/es.json         # translation keys (I18nService)
```

## Key patterns

- **Factory + Result**: API data passes through `createX()` before being used as a model.
- **Pure mapper**: the component emits a raw view model → a mapper in `application` builds the DTO.
- **Signals for state**: everything the template reads and a callback mutates is a `signal()`/`computed()`.
- **Universal OnPush** + `takeUntilDestroyed` on every subscription.
- **Notifications**: `NotificationService` only; HTTP errors only through `extractApiErrorMessage`.

See detailed rules and checklist in [`AGENTS.md`](../AGENTS.md).