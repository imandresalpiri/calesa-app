# Flujo de trabajo

Cómo entra un cambio a `main`. El proyecto está terminado (fases 0 a 9) y vive de **actualizaciones frecuentes y chicas**: cada una es
una rama, un PR y un commit en `main`. Nadie integra a mano ni espera a nadie: el CI decide.

## Una actualización

0. **Mirar el estado:** `bash scripts/flujo/estado.sh` (la rama, las ramas locales sin worktree, los cambios apartados con
   `git stash`, los PR abiertos, el CI de `main`, el e2e completo de la noche y el issue `noche-roja` abierto). Un PR abierto en rojo
   o una noche caída van antes que lo pedido. Una rama suelta o un stash es trabajo de otra sesión que no llegó a `main`: se publica o se
   le dice a la persona; una sesión no los borra.
1. **Rama** desde `main` al día: `git switch main && git pull --ff-only && git switch -c <tipo>/<tema>` (`feat/`, `fix/`, `chore/`,
   `docs/`, `refactor/`, `perf/`, `test/`). Una rama, un cambio: si el título necesita «y», son dos actualizaciones.
2. **Trabajo.** Lo pedido sale de la persona o de `docs/PENDIENTES.md`. Una pantalla o un caso de uso: skill `feature`. Mientras se
   trabaja corre lo barato solo: ESLint del archivo editado (hook `PostToolUse`) y, al parar, typecheck, las pruebas de lo tocado y las
   guardas (hook `Stop`).
3. **Entregar** (skill `entregar`): verificación local (abajo), docs al día, commits convencionales y
   `bash scripts/flujo/publicar.sh`, que empuja la rama, abre el PR con un título de commit convencional, le enciende el
   **auto-merge** y espera. Verde: entra a la **cola de integración**, que lo prueba combinado con `main` y los PR de delante y lo
   integra; el guion vuelve a `main` al día y borra las ramas integradas. Nadie trae `main` a la rama. Rojo, o sacado de la cola: dice
   qué job cayó; se arregla en la misma rama, se commitea y se vuelve a correr.
4. **Nada queda a medias.** Un PR que no pasó se arregla o se cierra en la misma sesión; si la sesión se corta, el PR sigue solo
   (el auto-merge no depende de ella) y la siguiente lo ve con `gh pr list`.

El commit que queda en `main` es el **título del PR** (`tipo(scope): descripción`, `commitlint.config.mjs`; el CI lo valida). El cuerpo
del PR cuenta qué cambió, por qué y cómo se verificó: es la bitácora. No hay otra.

## Qué se verifica y dónde

| Dónde                        | Qué corre                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al editar (hook)             | ESLint del archivo; en `.sql`, `auth.uid()` envuelto y `security definer` con `search_path`                                                                                                                                                                                                                           |
| Al parar (hook `Stop`)       | Árbol sucio: typecheck, ESLint y `vitest related` de lo cambiado, `scripts/guardas`, mapa. Árbol limpio: typecheck y mapa                                                                                                                                                                                             |
| Al commitear (lefthook)      | ESLint y Prettier de lo que va en el commit, typecheck, `mapa.sh --check`, commitlint                                                                                                                                                                                                                                 |
| Al empujar SQL (lefthook)    | `db:probar` en modo rápido (≈ 1,5 min)                                                                                                                                                                                                                                                                                |
| Antes de publicar (la skill) | `bash scripts/flujo/verificar.sh` (lint, tipos, `pnpm test` y mapa en paralelo, una vez al final; no repite si el árbol ya pasó); con `supabase/` tocado: `pnpm db:reset`, `pnpm db:types`, `pnpm db:probar:rapido`, `pnpm db:lint`, `pnpm db:revisar`; los e2e afectados (`node scripts/e2e-afectados.mjs --correr`) |
| CI del PR (la autoridad)     | Nivel 1 (lint, tipos, mapa, título, orden de migraciones, `pnpm test` en 3 partes); «Base» si cambia código (reset, tipos sin diff, `db:probar` completo, privilegios, `db:lint`, advisors);                                                                                                                          |
|                              | los e2e dirigidos a lo tocado, o el completo de escritorio en 8 bloques si toca un disparador del Nivel 2 (`.claude/rules/e2e.md`). `Listo · todo en verde` los resume                                                                                                                                                |
|                              | Con contratos entre repos (`.claude/rules/contratos.md`): «Contrato · la base cumple sus versiones» (el proveedor) y «Contrato · el consumidor usa sólo lo fijado» (con los tipos sin diff)                                                                                                                           |
|                              | Y otra vez en la cola de integración, sobre el commit combinado (`merge_group`): lo mismo que pidió el PR, con migraciones y contratos contra `HEAD^1` (`main` y los PR de delante)                                                                                                                                   |
| Cada noche (CI)              | El e2e completo con los dos proyectos sobre `main`, si hubo commits; si cae dos noches seguidas, el issue `noche-roja` entra a la cola (`scripts/flujo/noche.mjs`)                                                                                                                                                    |
| Antes de desplegar           | El completo con los dos proyectos: Actions › ci › Run workflow, `proyectos: ambos` (lo dispara la persona), o `pnpm test:e2e:completo` en local                                                                                                                                                                       |

`scripts/flujo/verificar.sh` es la verificación de una sesión: corre lint, tipos, `pnpm test` y `mapa.sh --check` en paralelo (la salida de
cada uno en `$TMPDIR`, una línea de resumen por comando y la cola del que cayó) y, si pasan todos, guarda el árbol (lo commiteado más lo
que haya sin commitear; lo ignorado no cuenta) en `verificado-<rama>` dentro del `.git` del worktree. Con el mismo árbol dice «ya
verificado» y sale en 0 sin correr nada; `--forzar` lo corre igual. Se pide una vez, al final, en segundo plano: no tras cada commit
ni en serie. El CI no lo usa: sigue corriéndolo todo.

Lo largo (esta verificación, los e2e afectados, `db:probar`) se lanza con `run_in_background` y se espera su aviso: cada vuelta de un
bucle de espera relee todo el contexto de la sesión. `.claude/hooks/bloquear-esperas.sh` (parte de `bloquear-peligrosos.sh`, sobre `Bash`
y `Monitor`) rechaza un Bash en primer plano con un bucle `until`/`while`/`for` con `sleep` o un `sleep` de más de 5 s, y un Monitor
que sólo cuenta tiempo; con `run_in_background`, un `sleep` corto o un Monitor que lee un log, pasa. Mira el comando, no el guion que se corre.

Rigor máximo (mutaciones, carreras, volumen) sólo en fórmulas del cotizador, dinero, RLS y permisos. La interfaz decide sus
microdecisiones sola (`.claude/rules/ui.md`).

## GitHub

- `main` está protegida: sólo avanza por PR y exige el check **`Listo · todo en verde`** (el job `listo` de `ci.yml`, que resume a los
  demás), sin exigir la rama al día. Además exige la **cola de integración** (un ruleset de `main`: «Require merge queue», método
  squash, el mismo check): un PR en verde entra a la cola con su auto-merge, GitHub arma el grupo (`main`, los PR de delante y este,
  un commit cada uno), corre `ci.yml` sobre él (`merge_group`) y, en verde, lo integra. Un PR corre su CI una vez y otra en el grupo,
  no una más por cada PR que entra antes; nadie trae `main` a la rama, y el orden de migraciones lo valida el grupo. Si el grupo cae,
  GitHub saca al PR: `publicar.sh` dice el motivo y sale con 1; el orquestador renombra sus migraciones si quedaron antes de una de
  `main`, lo vuelve a encolar si lo caído es ajeno (la máquina del CI, un e2e que no toca), o lo manda a arreglo como un choque
  (`scripts/orquestador/integracion.sh`). La cola se activa en un ruleset, no en la protección clásica: `cola_activa`
  (`scripts/flujo/cola-de-integracion.sh`) sólo lee los rulesets. Sin la cola, el auto-merge integra como siempre, sin probar el PR
  combinado. Si igual `main` queda en rojo, el orquestador encola la tarea urgente de arreglarlo y no arranca tareas nuevas hasta verlo
  verde (`scripts/orquestador/main-en-tanda.sh`, la red de seguridad). El repo sólo admite squash, con auto-merge y borrado de la rama
  al integrar. La persona, como administradora, puede saltarse la protección; una sesión no empuja `main`
  (`.claude/hooks/bloquear-peligrosos.sh`).
- El orquestador y sus sesiones actúan como la app `imandresalpiri-orquestador[bot]` (token de instalación de 1 h,
  `scripts/orquestador/token-app.sh`; `scripts/orquestador/README.md` › «Como la app de GitHub»); sin la clave, con la sesión de la
  persona. `publicar.sh` a mano: el token de la dueña aunque la activa de la máquina sea otra (`gh auth token --user <dueña>`), sin
  cambiar nunca la cuenta activa (`gh auth switch` es de la persona); una organización no tiene sesión de `gh`: vale la de la máquina.
  La app no va en ningún bypass de la protección de `main`.
- Un e2e que pasa al reintentar en CI no pone el PR en rojo; queda anotado en el PR (`e2e/soporte/reporter-de-inestables.ts`). Sólo
  se arregla si cae dos noches seguidas en el completo: el job `aviso-noche` lleva la cuenta en el issue `noche-roja` y a la segunda
  noche lo vuelve una tarea de la cola (`scripts/flujo/noche.mjs`). Es el único job con un permiso de escritura (`issues: write`).
- Disparar un workflow a mano (`gh workflow run`, el Nivel 3, las carreras) es de la persona. La única excepción es del orquestador: el
  e2e de escritorio sobre `main` antes de cerrar una tanda, que sale de la app.

## En paralelo

Dos actualizaciones a la vez van en dos worktrees (Orca, Claude Code o `git worktree add`), cada uno con su rama y su PR. Un worktree
que necesita base o e2e se vuelve un **carril** con `bash scripts/worktree/preparar.sh` (≈ 80 s): le da su pila de Supabase y sus
puertos (a, b o c: +100, +200, +300 sobre la principal; `docs/ENTORNOS.md` › «Pilas locales»). Ahí `pnpm dev`, `pnpm funciones`,
`pnpm db:*` y `pnpm test:e2e` usan su pila; nunca `supabase` suelto. Al terminar: `bash scripts/worktree/quitar.sh` y se borra el
worktree. La base local y el e2e de una pila son de una sesión a la vez (`scripts/candado.sh`).

Una tanda de varias actualizaciones que corre sola durante días va con el **orquestador** del proyecto (`scripts/orquestador/README.md`):
una tarea por issue con la etiqueta `cola` (en espejo con `.orquestador/cola/`), cada una en su carril, su sesión de `claude -p` y su
PR, que cierra su issue. Una tarea nombra un nivel de modelo (`rapido`, `normal` o `capaz`), nunca un modelo. Desde el celular se
cargan tareas, se responde a una trabada comentando y se escribe un pedido en texto libre (un issue con la etiqueta `pedido`), que una
sesión redacta como spec con tus respuestas. Una vez al mes entra sola la actualización de dependencias, y el e2e que cae dos noches
seguidas entra como tarea urgente; el e2e roto en `main` que una sesión de arreglo encuentra sin haberlo tocado también, y la tarea que lo encontró lo espera. Al vaciarse la cola de una tanda, el orquestador verifica `main` con el e2e de escritorio y encola
el cierre de la tanda: docs aplastados, lo que sobra fuera y la retro, que abre las mejoras del flujo (`scripts/orquestador/README.md`
› «El cierre de la tanda»). Es de este repo: el de otro proyecto corre a la vez sin cruzarse (comparten la RAM y, por máquina,
los turnos de sesión y la pausa por el límite del plan).

Si dos PR tocan lo mismo, el segundo choca: `git merge origin/main` en su rama (nunca rebase con push forzado), se resuelve, se
commitea y se vuelve a publicar. Una migración que quedó antes de una ya integrada (o de una de un PR de delante en la cola) se crea de
nuevo con `pnpm exec supabase migration new` (el CI lo exige).

## Construcción y mantenimiento

Un repo nace **en construcción** (`etapa` en `.proyecto/proyecto.yaml`): manda `docs/semilla/` y la cola son los pasos de su plan. La
última tarea de esa cola, «cerrar la construcción» (`node scripts/flujo/cierre.mjs`), escribe `docs/ESTADO.md`, `docs/PENDIENTES.md` y
`docs/DECISIONES.md`, saca `docs/semilla/` y deja el repo **en mantenimiento**: desde ahí mandan ESTADO y PENDIENTES. Al integrarse, el
orquestador etiqueta `semilla-vN` el último commit de main antes de ese PR: la semilla se lee con `git show semilla-vN:docs/semilla/semilla.md`.
La `## Retro` de ese PR y las líneas `(semilla)` de `docs/LECCIONES.md` alimentan las lecciones para las semillas siguientes.

Este repo está en mantenimiento y nació antes de las semillas: no tiene `semilla-vN`; lo anterior está en la etiqueta `fases-0-9`
(«La historia», abajo).

## El flujo con el kit

El flujo (orquestador, CI, hooks, guardas, `publicar.sh`, este doc y lo demás que lista `scripts/kit/flujo.txt`) se comparte con el
kit en los dos sentidos, como tareas de la cola (`docs/KIT.md` › «El flujo entre el kit y los proyectos»); nunca toca `src/`,
`supabase/` ni nada del producto.

- **`.kit/version`** es el commit del kit del que sale el flujo de este repo; `.kit/omitir`, lo que este repo no quiere del kit.
- **La tarea semanal:** una vez por semana el orquestador mira si el kit avanzó en algún archivo de flujo desde `.kit/version` y, si
  avanzó, encola «traer el flujo del kit» (`node scripts/kit/actualizar.mjs`, una mezcla de tres vías; `KIT_SEMANAL="no"` la apaga).
  Si choca, la tarea se traba con las rutas y se responde por ruta.
- **El aviso del kit:** al integrar un PR que toca flujo o suma a `docs/LECCIONES.md` una línea que termina en `(kit)` o
  `(semilla)`, el orquestador abre su tarea en el kit (`KIT_AVISAR="no"` lo apaga).

## Docs: qué se toca en cada actualización

| Doc                                            | Cuándo                                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/PENDIENTES.md`                           | Se borra la línea de lo que se cerró; se anota en una línea lo que se descubrió y no se hizo                                                                                                                                                                       |
| La ficha `CLAUDE.md` del módulo                | Si cambió su contrato (qué entra, qué sale, una regla, una trampa). Dice lo que es, no cómo se llegó                                                                                                                                                               |
| `docs/GLOSARIO.md`                             | Término nuevo                                                                                                                                                                                                                                                      |
| `docs/DECISIONES.md`                           | Una decisión no obvia: una viñeta en su área. Si reemplaza a otra, se edita la que estaba                                                                                                                                                                          |
| `docs/LECCIONES.md`                            | Una trampa que costó tiempo y volvería a pasar: la regla que la evita, en una línea. Si es un defecto del flujo o del kit, termina en `(kit)` y sube sola al kit; un hueco de la semilla, en `(semilla)` (`docs/KIT.md` › «El flujo entre el kit y los proyectos») |
| `docs/UX.md`, `COTIZADOR.md`, `RENDIMIENTO.md` | Si cambió la pantalla, la regla de cálculo o un presupuesto                                                                                                                                                                                                        |
| `docs/ESTADO.md`                               | Sólo si cambia el estado del producto (algo nuevo funcionando, un verde que dejó de serlo). No en cada cambio                                                                                                                                                      |

Ningún doc lleva historia («se encontró X y se arregló»): eso es el PR. Lo que queda escrito es la regla que resultó.

## La base

- Una migración nueva por cambio; después `pnpm db:reset`, `pnpm db:types` y `pnpm db:probar:rapido`; el completo lo corre el CI
  (`.claude/rules/migraciones.md`).
- **Aplastar:** en cada cierre de tanda (el orquestador encola la tarea si main tiene más de una migración:
  `scripts/orquestador/plantillas/aplastar-migraciones.md`), o antes de un despliegue grande, `pnpm db:aplastar` las funde en una
  base nueva y comprueba que deja la misma base (esquema, ACL, policies, triggers, catálogo, jobs, buckets). Va en su propio PR. Lo
  que hay que hacer después en un proyecto remoto: `docs/DESPLIEGUE.md` › «Tras aplastar las migraciones».
- Producción (variables, secretos, Vercel) es de la persona; la base remota del proyecto (`db push`, `--include-seed`, `db reset
--linked`) la cambia también la sesión: `docs/DESPLIEGUE.md` › «La base remota».

## La historia

Todo lo anterior al 2026-11-13 (el piloto con sus tres carriles, la bitácora, el plan por fases, las decisiones paso a paso y las 249
migraciones sueltas) está en la etiqueta **`fases-0-9`**: `git ls-tree -r --name-only fases-0-9 docs/` lista lo que había y `git show fases-0-9:<ruta>` lo
muestra (la bitácora, el plan, el archivo de docs, las decisiones paso a paso).
