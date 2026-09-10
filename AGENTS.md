# AGENTS.md — Lineamientos de trabajo

Este documento define **cómo se debe trabajar en este proyecto**. Toda modificación de código debe respetar la arquitectura descrita aquí. El mapa completo de carpetas está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Comandos de verificación (obligatorios antes de terminar cualquier tarea)

```bash
npm run build   # build de producción — debe compilar sin errores
npm test        # requiere Chrome headless; ver nota abajo
```

Tests con Chrome headless-shell (no hay Chrome instalado en el sistema):

```bash
CHROME="$HOME/.cache/puppeteer-browsers/chrome-headless-shell/linux-152.0.7977.54/chrome-headless-shell-linux64/chrome-headless-shell" \
CHROME_BIN="$CHROME" npm test -- --watch=false
```

Estado actual: **64/64 tests**. Si agregas lógica de dominio o mapeo, agrega tests.

## Reglas por capa

### `core/domain/` — Modelos y reglas de negocio (puro, sin Angular)

- Interfaces con campos **`readonly`**.
- Toda entidad se construye con una **factory validada**: `createX(raw: unknown): Result<X, readonly DomainError[]>`.
- Las factories acumulan **todos** los errores encontrados antes de fallar (no fail-fast).
- Validaciones con las reglas primitivas de `core/domain/validation/primitive.rules.ts`; nada de lógica inline ad-hoc.
- Prohibido importar Angular, RxJS o HttpClient aquí.
- Toda factory nueva lleva su `.spec.ts` hermano.

### `core/application/` — Casos de uso y servicios HTTP

- Servicios delgados: solo traducen llamadas HTTP vía el puerto `HTTP_PORT` (`inject(HTTP_PORT)`), devuelven `Observable<ApiResponse<T>>`. Sin lógica de negocio (eso vive en domain).
- DTOs de transporte en `application/dto/`; los componentes nunca arman payloads crudos: usan **mappers puros** (`toCreateAcquisitionRequest`, etc.) con spec propio.
- Errores HTTP siempre se procesan con `extractApiErrorMessage(error, fallback)` (`application/ports/api-error.ts`).
- Notificaciones de usuario SIEMPRE vía `NotificationService` (`notifications.success/error`) — prohibido inyectar `MatSnackBar` directamente.

### `features/` — Componentes

- **`ChangeDetectionStrategy.OnPush` obligatorio** en todos los componentes.
- Estado asíncrono/mutable para templates **siempre en signals** (nunca propiedades planas mutadas desde callbacks).
- Suscripciones RxJS con teardown: `takeUntilDestroyed(destroyRef)`. Prohibido dejar `valueChanges`/`afterClosed()` sin teardown o con `Subject` manual (`destroy$`).
- Separación smart/presentational: contenedores cargan datos y orquestan; los formularios complejos viven en componentes hijos que reciben `[inputs]` y emiten `(outputs)`. Los hijos de formulario no inyectan servicios de datos.
- El armado de DTOs no va en componentes: emitir el estado crudo del form (view model) y mapear en la capa application.
- Un método = una acción; handlers nombrados por intención (`onFormSave`, `goBack`, `confirmDelete`). Elimina código muerto en el mismo cambio, no después.
- Fidelidad primero: al refactorizar comportamiento legado, replica exactamente sus efectos observables (incluidos quirks documentados en TSDoc) y avisa cuando detectes bugs preexistentes.

### `shared/`

- Constantes agrupadas por dominio (`general.constants.ts`, `sales.constants.ts`…). Nada de strings/números mágicos en código.
- Validators de formulario que envuelven reglas de dominio (`domain.validators.ts`) para mantener paridad component↔dominio.

## Convenciones generales

- Paths alias: `@core/**` y `@shared/**` (configurados en `tsconfig.json`).
- Standalone components; imports de Material módulo a módulo, solo los usados.
- Sin `console.*` ni TODOs en el código entregado.
- Comentarios: solo TSDoc público y notas de fidelidad legacy; cero comentarios narrativos.
- i18n: textos desde `assets/i18n/es.json` vía `I18nService.translate('CLAVE')` — nunca strings hardcodeadas en templates.
- Rutas nuevas: registrarlas en `app.routes.ts` con `canActivate: [AuthGuard]` salvo login.

## Checklist antes de cerrar una tarea

1. `npm run build` verde
2. Suite de tests verde (con Chrome headless)
3. Sin imports muertos ni `console.*`
4. Código nuevo sigue las reglas por capa de arriba
