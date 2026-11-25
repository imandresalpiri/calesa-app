---
paths:
  - 'src/app/**'
  - 'src/proxy.ts'
  - 'next.config.ts'
  - 'src/shared/lib/rutas.ts'
  - 'src/modules/*/entities/**/rutas.ts'
---

# Rutas que se mudan

Una ruta o un parámetro que se muda no deja redirección: se cambia directo y se actualiza todo lo que la nombra, en el mismo PR. Una redirección
por cada mudanza se acumula y nadie la quita.

1. **Los enlaces, todos, en el mismo PR:** el código, `RUTAS` y los constructores de `src/shared/lib/rutas.ts` y de cada
   `entities/**/rutas.ts`, el buscador y sus destinos (`src/modules/buscador/`), cómo arman su enlace las notificaciones (la columna
   `notificaciones.ruta`, que escriben triggers y RPC), los enlaces de `actividad`, los e2e y su soporte (`e2e/soporte/`) y los docs
   (`docs/UX.md`, `docs/GLOSARIO.md`, `docs/DECISIONES.md`, las fichas).
2. **Los datos guardados, con una migración nueva** que reescribe lo que nombra la ruta o el parámetro viejo: `notificaciones.ruta`,
   `vistas_guardadas.params` (jsonb), las `preferencias_usuario` que guardan una ruta o una pestaña y toda otra columna que guarde una ruta
   interna. Idempotente, con sus pruebas en `db:probar` y sin escribir en la auditoría (`.claude/rules/migraciones.md`).
3. **La URL vieja da «no existe»:** la página de `src/app/not-found.tsx`.
4. **Nada de redirecciones por una URL vieja:** ni `redirects()` en `next.config.ts`, ni un `route.ts` que responda 307/308 (tampoco
   `redireccionPermanente()` de `src/app/(app)/configuracion/con-parametros.ts`), ni `redirigir()` en un `page.tsx`, ni reescrituras o
   redirecciones de `src/proxy.ts`.
5. **Las estructurales sí:** las de la lista de `scripts/guardas/sin-redirecciones.test.ts`. Hasta que esa guarda exista, son:
   - `/configuracion` → `/configuracion/inicio`.
   - Una sección sin página índice → su primera sub-sección que se puede abrir (Sitio web, `src/app/(app)/configuracion/web/page.tsx`, y las
     que sigan ese patrón).
   - `/configuracion/origenes/<id>` → la última pestaña que la persona abrió ahí (`src/app/(app)/configuracion/origenes/[id]/entrada.ts`,
     `redirigirAlEntrar()`).
   - El acceso, que no es una página mudada (`decidirAcceso()` de `src/shared/lib/rutas.ts`: sin sesión a `/ingreso`, con sesión fuera de
     `/ingreso`), los pasos de la puesta en marcha (`/configuracion/origenes/<id>/puesta-en-marcha` → el paso pendiente) y
     `/chat?con=` → la conversación abierta: llevan a donde está la persona hoy, no a una ruta mudada.
