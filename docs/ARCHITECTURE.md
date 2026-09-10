# Mapa de arquitectura — contatodo_web

Angular 17 standalone + Material. Organización por capas con dependencias dirigidas:

```
features ──▶ core/application ──▶ core/domain
   │                │                
   └──▶ shared ◀────┘        (domain no depende de nadie)
```

Regla de dependencias: `domain` es puro (no importa Angular/RxJS); `application` conoce domain; `features` conoce application y shared. Nunca al revés.

```
src/app/
├── app.config.ts               # providers raíz (HttpClient, interceptores, adapters)
├── app.routes.ts               # rutas con AuthGuard
│
├── core/                       # núcleo técnico y de negocio
│   ├── domain/                 # PURO — sin Angular ni RxJS
│   │   ├── models/             # entidades readonly + factories validadas
│   │   │                       #   product/sale/acquisition/acquisition-type/
│   │   │                       #   module/user/role  (+ .spec.ts hermanos)
│   │   │                       #   createX(raw): Result<X, DomainError[]>
│   │   ├── errors/             # DomainError + domainError()
│   │   ├── result/             # Result<T> = { ok: true, value } | { ok: false, error }
│   │   └── validation/         # primitive.rules.ts (isNonEmptyString,
│   │                           #   isFiniteNumber, isBoolean, isRecord,
│   │                           #   isValidEmail) + validation.rules.ts
│   │
│   ├── application/            # casos de uso
│   │   ├── products|sales|acquisitions|acquisition-types|
│   │   │   expenses|modules|roles/     # servicios delgados sobre HTTP_PORT
│   │   ├── dto/                # DTOs de transporte (request/response)
│   │   ├── ports/              # HTTP_PORT, ApiResponse, api-error.ts
│   │   │                       #   (extractApiErrorMessage — pura)
│   │   ├── notifications/      # NotificationService (snackbar centralizado)
│   │   └── acquisitions/create-acquisition.mapper.ts  # mappers form→DTO (puros)
│   │
│   ├── adapters/               # infraestructura behind ports
│   │   ├── http/               # http.adapter (implementa HTTP_PORT)
│   │   └── storage/            # local-storage.adapter
│   ├── auth/                   # AuthService (sesión/token)
│   ├── config/                 # api-routes.constants.ts (URLs desde env)
│   ├── guards/                 # AuthGuard, LoginGuard
│   ├── i18n/                   # I18nService (assets/i18n/es.json)
│   └── interceptors/           # auth.interceptor
│
├── features/                   # páginas por dominio
│   ├── login/
│   ├── sales/                  # + sale-dialog/, sales-history/
│   ├── products/               # + product-form/ (form en componente hijo)
│   ├── acquisitions/           # + new-acquisition/
│   │                           #   new-acquisition = contenedor smart;
│   │                           #   acquisition-form = hijo presentational;
│   │                           #   mapper en core/application
│   ├── acquisition-type-catalog/  # + dialog/, delete-dialog/
│   └── roles/
│
├── layout/
│   └── modules-navigation/     # navegación por módulos del usuario
│
└── shared/
    ├── components/confirmation-dialog/
    ├── constants/              # GENERAL/SALES/LOGIN/... .constants.ts
    └── validators/             # domain.validators.ts (envuelven reglas domain)

src/assets/i18n/es.json         # claves de traducción (I18nService)
```

## Patrones clave

- **Factory + Result**: los datos que entran del API pasan por `createX()` antes de usarse como modelo.
- **Mapper puro**: componente emite view model crudo → mapper en application arma el DTO.
- **Signals para estado**: todo lo que el template lee y un callback muta, es `signal()`/`computed()`.
- **OnPush universal** + `takeUntilDestroyed` en cada suscripción.
- **Notificaciones**: solo `NotificationService`; errores HTTP solo con `extractApiErrorMessage`.

Ver reglas detalladas y checklist en [`AGENTS.md`](../AGENTS.md).
