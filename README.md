# EcuAgroVision Web

Aplicación web del plan **EcuAgroVision** (login, roles, análisis con Groq, PostgreSQL).  
Documento maestro: [`../PLAN_IMPLEMENTACION.md`](../PLAN_IMPLEMENTACION.md).

## Fase 1–10 en repo (estado)

- **Fase 1:** Next.js + Prisma 5 + Neon, estructura `lib/`, `GET /api/health`. (Se evitó Prisma 7 por el adaptador de driver.)
- **Fase 2:** Enum `Role` (`ADMIN`, `FIELD`, `REVIEWER`), modelos `User` y `Analysis`, migración aplicada; eliminada la tabla `_schema_placeholder`.
- **Fase 3:** Login (`/login`), `POST /api/auth/login` y `POST /api/auth/logout`, sesión en cookie **httpOnly** (JWT firmado con **jose**), contraseñas con **bcryptjs**, `middleware.ts` por prefijos `/admin`, `/analisis`, `/revision`, `/revisor`, `/api/*` relevantes.
- **Fase 4 (seed):** `prisma/seed.ts` — si no hay ningún usuario `ADMIN`, crea uno desde `BOOTSTRAP_ADMIN_USER` / `BOOTSTRAP_ADMIN_PASSWORD`.
- **Fase 5:** Panel admin: layout `app/(admin)/admin`, `/admin/users` (alta y edición de usuarios), `POST /api/admin/users` y `PATCH /api/admin/users/[id]`; rutas `/api/admin/*` requieren rol `ADMIN` en middleware.
- **Fase 6:** Integración Groq (`lib/groq/analyzeImage.ts`), ruta de prueba opcional `POST /api/dev/groq-test` con `ENABLE_GROQ_TEST_ROUTE=1`.
- **Fase 7:** `POST /api/analyses` (analista `FIELD` o `ADMIN`), páginas `/analisis`, `/analisis/nuevo`, `/analisis/[id]` bajo `app/(field)/analisis/`.
- **Fase 8:** `/revision/analisis` listado global con filtros (ciudad, analista, fechas) y `/revision/analisis/[id]` detalle para **REVIEWER** y **ADMIN**; `DELETE /api/analyses/[id]` solo **ADMIN** (hard delete). `/revisor` redirige a `/revision/analisis`.
- **Fase 9:** Mensajes de error Groq más claros (429, 5xx, JSON inválido, esquema); rate limit en memoria en `POST /api/analyses` (8 envíos válidos / minuto / usuario); accesibilidad mínima en `/analisis/nuevo`; README con guía y checklist de campo.
- **Fase 10:** Interfaz `VisionAnalyzer` en `lib/vision/` (`GroqVisionAnalyzer`, stub `OpenAIVisionAnalyzer`); `createVisionAnalyzer()` según `VISION_PROVIDER` (`groq` por defecto, `openai` sin llamada real aún). `POST /api/analyses` guarda `provider` y `model` según el analizador; respuesta JSON incluye `analysisOk`.

## Uso en campo (analista) — Fase 9

1. Abre `/login` e ingresa el usuario y contraseña que te dio el administrador (rol **FIELD**).
2. En **Historial** (`/analisis`) puedes ver análisis previos; en **Nuevo análisis** (`/analisis/nuevo`) creas uno.
3. **Foto:** JPEG, PNG o WebP; que se vea nítido el follaje o el pseudotallo. La app recorta a ancho/alto máximo 960 px antes de enviar a Groq.
4. **Ciudad o zona:** municipio, cantón o referencia geográfica (ej. Babahoyo, Quevedo, Los Ríos).
5. **Dirección / parcela:** texto libre con lo que permita ubicar la visita (finca, lote, km de vía, sector norte/sur). Obligatorio aunque sea breve.
6. Tras enviar, espera hasta ~2 minutos si la red es lenta. Si aparece “demasiados envíos”, espera el tiempo indicado (rate limit).

## Checklist de prueba en campo (3–5 escenarios)

| # | Escenario | Qué comprobar |
|---|-----------|-----------------|
| 1 | Login analista | Entra a `/analisis`, sesión estable, logout en layout si existe. |
| 2 | Análisis feliz | Foto válida + ciudad + dirección → redirección al detalle con resultado JSON o mensaje de error Groq guardado. |
| 3 | Sin foto o sin ciudad | El formulario muestra error y foco en el aviso (`role="alert"`). |
| 4 | Red intermitente / Groq lento | Mensaje de timeout o red comprensible; el registro puede guardarse con `errorMessage` si Groq falla. |
| 5 | Muchos envíos seguidos | Tras varios análisis en menos de 1 minuto, respuesta **429** con `Retry-After` y mensaje en pantalla. |

## Requisitos

- Node.js 20+  
- Cuenta [Neon](https://neon.tech) y cadena `DATABASE_URL`

## Puesta en marcha

```bash
cd ecuagro-web
cp .env.example .env
# Edita .env:
# - DATABASE_URL de Neon (sslmode=require)
# - SESSION_SECRET: cadena aleatoria de al menos 32 caracteres
# - BOOTSTRAP_ADMIN_USER / BOOTSTRAP_ADMIN_PASSWORD (para el primer admin)
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), [http://localhost:3000/login](http://localhost:3000/login), [http://localhost:3000/admin/users](http://localhost:3000/admin/users) (como admin) y [http://localhost:3000/api/health](http://localhost:3000/api/health).

Si `migrate dev` falla, revisa que `DATABASE_URL` sea la de Neon (no un Postgres local vacío).

Si `/admin` o `/admin/users` no cargan: revisa `SESSION_SECRET` en `.env` (≥32 caracteres, sin espacios al inicio/final) y reinicia `npm run dev`. Sin cookie válida irás a `/login`. Si falla la BD, en usuarios verás un mensaje de conexión.

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build producción |
| `npm run db:migrate` | Migraciones en desarrollo |
| `npm run db:studio` | Prisma Studio |
| `npm run db:deploy` | Migraciones en producción (p. ej. Vercel build) |
| `npm run db:seed` | Crea el primer admin si no existe (requiere `BOOTSTRAP_ADMIN_*`) |

## Esquema actual (Fase 2)

| Modelo / tipo | Descripción |
|---------------|-------------|
| `Role` | `ADMIN`, `FIELD`, `REVIEWER` |
| `User` | `username` único, `passwordHash`, `role`, `active`, `createdAt`, `createdById` (quién creó el usuario) |
| `Analysis` | Análisis del analista (`userId`): `city`, `address`, `fieldNotes`, `imageBase64` (TEXT), `imageMime`, `imageWidth`, `imageHeight`, `provider`, `model`, `resultJson`, `errorMessage`, `promptVersion` |

Índices: `Analysis.userId`, `Analysis.createdAt`.

## Despliegue (Fase 11)

Variables en Vercel: `DATABASE_URL`, `SESSION_SECRET` (≥32 caracteres), `GROQ_API_KEY`, etc. (ver `.env.example`).  
Build recomendado: el script `build` ya ejecuta `prisma generate` antes de `next build`. Ejecuta el seed una vez contra la base de producción si aún no hay administradores (por CLI o job controlado).

## Auth (Fase 3)

- Cookie `ecuagro_session`: JWT HS256, caducidad 7 días, `sameSite=lax`, `secure` en producción.
- Tras login, redirección: `ADMIN` → `/admin`, `FIELD` → `/analisis`, `REVIEWER` → `/revision/analisis` (la ruta `/revisor` redirige al mismo listado).
- Un usuario inactivo (`active: false`) no puede entrar.

## Revisor · auditoría (Fase 8)

- Rutas: `/revision/analisis` (todos los análisis, filtros GET) y `/revision/analisis/[id]` (detalle). Roles: **REVIEWER** y **ADMIN**.
- Solo **ADMIN** puede **eliminar** un análisis (`DELETE /api/analyses/[id]`, botón en el detalle de revisión).

## Analista · análisis (Fase 7)

- Tras login como **FIELD** (o **ADMIN** para pruebas): `/analisis` (historial), `/analisis/nuevo` (foto + ciudad + dirección). El servidor llama al motor de visión configurado y guarda el registro en Neon.
- API: `POST /api/analyses` con JSON `imageBase64` (data URI o base64), `imageMime`, `city`, `address`, `fieldNotes` opcional. Respuesta **201:** `id`, `analysisOk`, `errorMessage` si el modelo falló. **Fase 9:** máximo **8** envíos válidos por **minuto** por usuario; si se supera, **429** con `Retry-After` (segundos).

## Proveedor de visión (Fase 10)

- Variable **`VISION_PROVIDER`:** `groq` (defecto) u `openai`. La UI del analista no cambia.
- Con **`groq`:** misma lógica que antes (`GROQ_API_KEY`, `GROQ_MODEL`), vía `GroqVisionAnalyzer` → `analyzeImageWithGroq`.
- Con **`openai`:** `OpenAIVisionAnalyzer` devuelve error indicando que la integración aún no está implementada; sirve para probar persistencia `provider: openai` sin API key real.
- Futuro: implementar `OpenAIVisionAnalyzer.analyze` con `OPENAI_API_KEY` y `OPENAI_VISION_MODEL` (ver `.env.example`).

## Groq · diagnóstico (Fase 6)

- `analyzeImageWithGroq()` en `lib/groq/analyzeImage.ts`: solo en **Node** (usa `sharp` y `fetch` al API de Groq). Variables `GROQ_API_KEY` y `GROQ_MODEL` en servidor.
- Imágenes: JPEG, PNG o WebP; se normalizan a JPEG y tamaño máximo de arista **960 px** antes de enviar.
- **Fase 9:** errores HTTP (p. ej. 429, 5xx), JSON inválido y fallos de esquema se traducen a mensajes legibles vía `lib/groq/friendly-errors.ts`.
- Para probar sin UI: en `.env` pon `ENABLE_GROQ_TEST_ROUTE=1`, reinicia `npm run dev` y envía `POST http://localhost:3000/api/dev/groq-test` con JSON `{"imageBase64":"data:image/jpeg;base64,...","city":"Babahoyo","address":"Parcela norte"}` (cabecera `Content-Type: application/json`). **Quita el flag en despliegues públicos.**

## Admin · usuarios (Fase 5)

- Rutas: `/admin` (resumen) y `/admin/users` (tabla + alta + edición por fila).
- APIs solo para sesión **ADMIN** (también bloqueadas en `middleware.ts` para `/api/admin/*`).
- Validación: usuario 3–64 caracteres `[a-zA-Z0-9._-]`, contraseña mínimo 8; no se puede dejar el sistema sin al menos un **ADMIN activo**.
