# Arreglar el PR #{{PR}} de la tarea {{ID}} — {{TITULO}}

Eres una sesión autónoma del orquestador de importadora. **Nadie va a contestar preguntas.** El PR #{{PR}} (rama `{{RAMA}}`) no se
integró; el motivo está abajo. Trabajas en el worktree `{{WT}}`, que vuelve a ser un carril listo (Supabase propio, base de demo).

En una sesión larga el contexto se compacta y se pierde el texto literal de este prompt: **si se compactó tu contexto, relee el motivo y la spec en `{{PROMPT}}`** (este mismo prompt, guardado).

Primero entiende el estado: `git log --oneline origin/main..HEAD`, `git status --short`, `gh pr view {{PR}} --json title,body,mergeable,statusCheckRollup`.

- **Choque con main:** `git fetch origin && git merge origin/main` (nunca rebase ni push forzado), resuelve conservando lo de las dos
  partes, commitea. Si una migración de esta rama quedó con fecha anterior a una ya integrada, créala de nuevo con
  `pnpm exec supabase migration new` y borra la vieja de la rama (el CI exige el orden). Después `pnpm db:reset`, `pnpm db:types` y `pnpm db:revisar` (lo que el job «Base» del CI compara de la base).
- **Sacado de la cola de integración:** el CI del grupo (tu rama combinada con main y los PR de delante) cayó con tu PR en verde. Lo de
  delante suele estar ya en main: `git fetch origin && git merge origin/main`, reproduce lo caído y arregla la causa. Si es el orden de
  migraciones, la migración nueva con fecha de hoy (lo de arriba).
- **CI en rojo:** lee el log de lo que cayó (`gh run view <id> --log-failed`, sólo los jobs caídos), reproduce en local el mismo comando
  y arregla **la causa**. Cambiar una prueba sólo si la prueba está mal, y se justifica en el PR. Un e2e que falla a veces y otras no
  no se reintenta hasta que pase: diagnostica con sus artefactos (`e2e-fallos/`, la traza) y arregla el producto o la prueba con
  evidencia.
- **Un e2e ajeno que también cae en `main`:** si lo que cae es un spec que la rama no toca (`gh pr diff {{PR}} --name-only`) y también
  cae en `main` (la noche, otro PR, o el mismo spec corrido sobre `origin/main`: la evidencia es obligatoria), no lo arregles aquí ni te
  traba: tu última línea es `RESULTADO: AJENO — <spec>:<línea> [<proyecto>] — <evidencia>` (por ejemplo
  `RESULTADO: AJENO — e2e/menu-de-la-fila.spec.ts:281 [movil] — cae igual sobre origin/main, y esta rama no lo toca`). El orquestador abre
  la tarea urgente que lo arregla, deja esta tarea esperándola y la pone al día con main cuando se integre, sin abrir otra sesión.
  Si cae más de un spec ajeno, nombra el primero y los demás en la evidencia. Sólo vale con un spec y una línea reales y con el PR sin
  nada propio en rojo: si además cae algo de esta rama, arréglalo y publica (el ajeno lo verá la próxima vuelta). Lo que no es un
  e2e (lint, tipos, un servicio de afuera) sigue siendo `RESULTADO: TRABADA —` con el job y la evidencia.
- **Un archivo versionado que `.gitignore` ignora** (`git ls-files -ci --exclude-standard` lo lista; `pnpm test` cae en `scripts/guardas/ignorados.test.ts`): no lo restaures a mano ni lo rodees; sácalo con `git rm --cached <archivo>` en un commit `chore` aparte.
- **Una dependencia** que el arreglo necesite sigue la misma regla que la tarea: entra si está en
  `scripts/orquestador/dependencias-aprobadas.txt`; si no, como último recurso, se suma a esa lista en el mismo PR con la sección
  «Dependencias nuevas» en el cuerpo (por qué no alcanza lo que hay, peso gzip, licencia, mantenimiento, versión verificada hoy con
  `pnpm view <paquete> version time`). Versión exacta, sola y desde la raíz del worktree; nunca dos librerías para lo mismo.
- Verifica (Nivel 1): primero lo que cayó en el CI (el comando o el e2e que falló, solo, hasta que pase) y al final, una vez y en segundo
  plano, `bash scripts/flujo/verificar.sh` (lint, tipos, la suite y el mapa en paralelo; no corre si el árbol ya pasó). Además lo de
  base si tocaste `supabase/`, y los e2e que cayeron más los afectados (`node scripts/e2e-afectados.mjs`: dice cuáles y por qué), en una sola
  corrida en segundo plano. Si fue un
  choque con main y tu lado sólo cambió docs al resolverlo: sólo `bash scripts/flujo/verificar.sh`, sin e2e. Lo temporal va en `$TMPDIR`, nunca en `/tmp`.
- **Esperar no es sondear:** lo largo (`verificar.sh`, `e2e-afectados.mjs --correr`, `db:probar`) se lanza con `run_in_background` y se espera su aviso; no leas el log hasta que llegue, no armes bucles de espera ni un Monitor de intervalo, y tras tu `RESULTADO` no rearmes esperas. El hook `PreToolUse` rechaza un Bash en primer plano que sondea y un Monitor que sólo cuenta tiempo.
- **Un spec suelto va en primer plano:** lo que cayó y repites hasta que pase (`pnpm test:e2e <spec>`) se corre sin `run_in_background`,
  con `timeout` de 600000: en segundo plano cada corrida termina en un aviso que relee todo el contexto de la sesión.
- Publica de nuevo con `bash scripts/flujo/publicar.sh --sin-esperar --titulo '<el título actual del PR>'`. Agrega al cuerpo del PR
  (`gh pr edit` falla en este repo: `gh api -X PATCH 'repos/{owner}/{repo}/pulls/{{PR}}' -F body=@<archivo>`) qué cayó y cómo se arregló, en dos líneas.

No hagas: preguntar · empujar `main` o forzar · desactivar una regla de lint o un test · actualizar o quitar dependencias · tocar variables, secretos, funciones o Vercel de producción (la base remota sí:
`docs/DESPLIEGUE.md` › «La base remota»; b_ip nunca).

{{PERMITE}}
Tu última línea, siempre: `RESULTADO: PUBLICADO #{{PR}}`, `RESULTADO: TRABADA — <motivo>` o, sólo para un e2e ajeno que también cae en `main`,
`RESULTADO: AJENO — <spec>:<línea> [<proyecto>] — <evidencia>`.

---

## Motivo

{{MOTIVO}}

---

## Spec de la tarea (para tener el contexto)

{{SPEC}}
