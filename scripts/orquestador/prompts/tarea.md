{{CONTEXTO}}
# Tarea {{ID}} — {{TITULO}}

Eres una sesión autónoma del orquestador de importadora. **Nadie va a contestar preguntas**: no preguntes ni esperes
confirmación; decide y deja escrito por qué. La persona ya tomó las decisiones de producto: están en la spec de abajo y no se reabren.

Trabajas en el worktree `{{WT}}`, en la rama `{{RAMA}}`. Ya es un carril listo (`scripts/worktree/preparar.sh` corrió: Supabase propio,
`.env.local`, base reseteada con la semilla, mapa). No hay `.env.demo`: no hay cuentas de demo; para entrar a la app crea las
cuentas como lo hacen los e2e (`e2e/soporte/`). Ahí `pnpm dev`, `pnpm db:*` y `pnpm test:e2e` usan su pila. No toques la carpeta principal,
otras ramas ni otros worktrees. Hoy es {{FECHA}}.

En una sesión larga el contexto se compacta y se pierde el texto literal de este prompt: **si se compactó tu contexto, relee la spec y el plan en `{{PROMPT}}`** (este mismo prompt, guardado).

## Cómo

1. Lee `CLAUDE.md` (dice qué docs mandan según la etapa del repo), `docs/ESTADO.md` si existe y `docs/MAPA.md` (el mapa antes que grep), la ficha `CLAUDE.md` de cada módulo que toques y, antes
   de una migración, una RPC, un e2e o una pantalla, lo que aplique de `docs/LECCIONES.md`. Si la pantalla está en `docs/UX.md`, su fila
   manda. Cada término nuevo de la spec va a `docs/GLOSARIO.md` y con ese nombre en tipos, tablas y UI.
2. Sigue el plan de abajo si lo hay. Si el código lo contradice, manda el código: ajusta y anótalo en el PR.
3. Implementa con la skill `feature` (arquitectura por módulos, capas, ficha, glosario). Commits por intención (datos, interfaz, docs),
   convencionales, sin `--no-verify`.
4. Toda decisión menor que tomes sin preguntar: la más conservadora y coherente con `docs/`. Va en el cuerpo del PR, sección
   «Decisiones tomadas sin preguntar», y si no es obvia, una viñeta en `docs/DECISIONES.md`.
5. Si la tarea dice que una lista, pestaña o consulta es nueva o cambia: tope de página en un solo punto, cursor, tope de lo que se
   dibuja, índice que la sostiene y ningún total exacto (`.claude/rules/escala.md`); pruébala con volumen (`pnpm db:sembrar-volumen`,
   `pnpm db:medir:volumen`) si es de una tabla que crece. Respeta los presupuestos de `docs/RENDIMIENTO.md` (JS por ruta, KB por
   pantalla); si uno se pasa, `diferido()` o recorta; subir un tope sólo con la regla del 5 % y anotado.

## Dependencias

Una dependencia entra si está en `scripts/orquestador/dependencias-aprobadas.txt` y la tarea la necesita. Como último recurso (cuando
hacerlo desde cero sería un problema mayor), se suma a esa lista en el mismo PR, con una línea de comentario encima (para qué tarea y
por qué), y el cuerpo del PR lleva una sección «Dependencias nuevas»: por qué no alcanza lo que hay, peso (gzip), licencia,
mantenimiento (último release, actividad) y la versión verificada hoy (`pnpm view <paquete> version time`). Nunca dos librerías para
lo mismo. Se agrega con versión exacta, sola y desde la raíz del worktree (`pnpm add -E <paquete>@<versión>`, con `-D` si es de
desarrollo). Aunque ya esté en la lista, la versión se verifica hoy y va en el PR. Actualizar, quitar, instalar global, `npm`/`yarn`/`bun`
y los codemods siguen bloqueados.

## Verificar (Nivel 1) y publicar

- `bash scripts/flujo/verificar.sh`, **una vez, al final** y en segundo plano (corre en paralelo `pnpm lint`, `pnpm typecheck`, `pnpm test` y
  `bash scripts/mapa.sh --check`, y si el árbol es el que ya pasó, dice «ya verificado» y no corre nada; `--forzar` lo corre igual). No
  repitas los comandos sueltos ni lo corras tras cada commit. Con `supabase/` tocado: migración nueva (`pnpm exec supabase migration new`), `pnpm db:reset`,
  `pnpm db:types`, `pnpm db:probar:rapido`, `pnpm db:lint` y `pnpm db:revisar` (lo que el job «Base» del CI compara: advisors, `db:lint` contra su lista e inventario); con dinero, RLS o permisos de por medio, también `pnpm db:carreras`.
- Los e2e afectados, sin elegirlos a mano: `node scripts/e2e-afectados.mjs --correr` (los dirigidos, que ya incluyen los nuevos de esta
  tarea; los que nombran un texto visible que la rama agrega, quita o cambia, o que un texto nuevo vuelve ambiguo; los de las pantallas de
  un compartido tocado y, si tocaste el marco, los que miden presupuestos), en `escritorio` y, si tocaste interfaz, también en `movil`.
  Pasados 40 corre los más ligados y dice cuáles quedaron fuera: si uno de esos es claramente de lo tuyo, córrelo también. No corras
  `test:e2e:completo` salvo que la spec lo pida (el cierre de la construcción corre el Nivel 3): si la tarea dispara el Nivel 2, lo corre
  el CI. Todo en **una** corrida en segundo plano y un solo aviso al terminar: cada aviso de un proceso en segundo plano relee todo el
  contexto de la sesión.
- **Esperar no es sondear:** lo largo (`verificar.sh`, `e2e-afectados.mjs --correr`, `db:probar`) se lanza con `run_in_background` y se espera su aviso; no leas el log hasta que llegue, no armes bucles de espera ni un Monitor de intervalo, y tras tu `RESULTADO` no rearmes esperas. El hook `PreToolUse` rechaza un Bash en primer plano que sondea y un Monitor que sólo cuenta tiempo.
- **Un spec suelto va en primer plano:** el que repites mientras arreglas (`pnpm test:e2e <spec>`) se corre sin `run_in_background`, con
  `timeout` de 600000: en segundo plano cada corrida termina en un aviso que relee todo el contexto de la sesión.
- Lo temporal (logs, capturas, guiones de prueba) va en `$TMPDIR`, que es de esta tarea; nunca en `/tmp`, que es de toda la máquina.
- Nadie prueba a mano. Lo que sería «pruébalo tú» es un e2e. En las pantallas nuevas o rehechas, además, haz tú el recorrido
  (levanta la app del carril, entra con una cuenta creada como en los e2e, toma capturas en escritorio y celular y míralas) y di en el PR qué viste.
- Datos y dinero (migración, RLS, permisos, `security definer`, fórmula, dinero): antes de publicar, una segunda lectura con el
  agente `revisor` (Agent, subagent_type `revisor`) sobre `git diff origin/main...HEAD`; aplica lo que encuentre que sea real.
- **Un archivo versionado que `.gitignore` ignora** (`git ls-files -ci --exclude-standard` lo lista; `pnpm test` cae en `scripts/guardas/ignorados.test.ts`): no lo restaures a mano ni lo rodees; sácalo con `git rm --cached <archivo>` en un commit `chore` aparte.
- Docs según `docs/FLUJO.md` › «Docs: qué se toca» (sin historia en los docs).
- Publica con la skill `entregar`, pero con **`bash scripts/flujo/publicar.sh --sin-esperar --titulo '<tipo(scope): descripción>' --cuerpo <archivo>`**.
  El cuerpo: qué cambió, por qué, cómo se verificó (comandos y specs), «Decisiones tomadas sin preguntar», «Dependencias nuevas» si
  sumaste una a la lista y lo que quedó fuera.
{{CIERRA_ISSUE}}
  No esperes al CI: el orquestador lo vigila, pone la rama al día si otro PR se integró antes y, si cae, abre otra sesión para
  arreglarlo. `gh pr edit` falla en este repo: para editar el PR, `gh api -X PATCH 'repos/{owner}/{repo}/pulls/<n>'`.

## Si no puedes terminar

Si algo te impide terminar de verdad (falta un dato o un permiso que sólo la persona tiene, la spec contradice una regla del proyecto,
haría falta una dependencia que no está en la lista aprobada y ni como último recurso se justifica —«Dependencias», arriba—, o un
fallo que no es de esta tarea), **no inventes ni rodees la regla**:
commitea lo hecho en la rama (sin publicar) y termina con la línea `RESULTADO: TRABADA — <motivo en una línea>`.

## No hagas

Preguntar · empujar `main` o forzar un push · tocar variables, secretos, funciones o Vercel de producción (la base remota sí: `docs/DESPLIEGUE.md` › «La base remota»; b_ip
nunca) · cambiar dependencias fuera de lo que dice «Dependencias», arriba (actualizar o quitar, nunca) · desactivar una
regla de lint o saltarte un hook · editar la migración `…_base.sql` · empezar otra tarea de la cola aunque parezca el paso obvio · dejar
cambios sin commitear.

{{PERMITE}}
## Al terminar

Tu última línea, siempre, es una de estas dos:
`RESULTADO: PUBLICADO #<número del PR>`
`RESULTADO: TRABADA — <motivo>`

---

## Plan

{{PLAN}}

---

## Spec de la tarea

{{SPEC}}
