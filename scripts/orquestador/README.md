# Orquestador

Corre solo, durante días, una cola de tareas de este proyecto. Por cada tarea abre un worktree con su propio carril (Supabase en
Docker), lanza una sesión nueva de `claude -p` que implementa, verifica y abre el PR con auto-merge, vigila el CI, manda a arreglar si
cae, y sigue con la siguiente cuando se integra. Avisa al celular por ntfy.

**La cola vive en los issues** del repo con la etiqueta `cola` (el issue 57 es la tarea `T57`): desde el celular se ve todo, se cargan
tareas y se responde a una trabada comentando. `.orquestador/cola/` es la copia de trabajo, en espejo en cada vuelta (abajo, «La cola
en los issues»). Con `ORQ_SOLO_LOCAL=1` en `.orquestador/config.local.env` la cola es sólo local, como antes.

**Seis cosas entran solas a la cola:** un pedido en texto libre (un issue con la etiqueta `pedido`, que una sesión en modo plan
redacta como spec), la tarea mensual de dependencias, el e2e de la noche que cae dos noches seguidas, la tarea semanal de traer el
flujo del kit, la urgente de un e2e que cae también en main (lo encuentra una sesión de arreglo) y el cierre de cada tanda (abajo, «Lo que entra solo a la cola»). Y al integrar un PR que toca el flujo, el orquestador abre su tarea en el kit
(«Al integrar» › «Lo que sube al kit»).

**Uno por proyecto, con turnos por máquina.** El código vive en el repo (`scripts/orquestador/`) y lo de esta máquina en
`.orquestador/` (ignorada por git). Su cola, su estado, su lock y su servicio (`orquestador-<PROYECTO>`) son propios. Lo que comparten
los orquestadores de una máquina está en `~/.config/orquestador/maquina.env` y `~/.local/state/orquestador/`: los **turnos de sesión**
(`TURNOS_MAQUINA`, 3 si no se dice: cuántas sesiones de `claude` a la vez entre todos los proyectos, porque la RAM es de la máquina y el
límite del plan, de la cuenta) y la pausa por el límite del plan. `PARALELO` sigue siendo el tope propio de cada proyecto.

Nunca toca el árbol de trabajo de la principal: crea sus worktrees en `.orquestador/worktrees/` y los borra al integrar.

## Qué hay

| Dónde                                            | Qué es                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/orquestador/orquestador.sh`             | El bucle y los comandos (abajo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `scripts/orquestador/al-dia.sh`                  | Ponerse al día solo: la principal en main, sin cambios y detrás de `origin/main` avanza con `--ff-only`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scripts/orquestador/github.sh`                  | Lo que le pide a GitHub: etiquetas, comentarios, editar y cerrar issues, dependencias por rama, y quién es de confianza                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scripts/orquestador/token-app.sh`               | El token de instalación de la app del orquestador: firma el JWT, lo pide y lo guarda en caché; también es el helper de credenciales de git                                                                                                                                                                                                                                                                                                                                                                                                |
| `scripts/orquestador/app.sh`                     | GitHub como la app (`token_gh`): su entorno para el bucle y las sesiones, el respaldo con la sesión de la persona, el permiso que le falta y su sección de `verificar`                                                                                                                                                                                                                                                                                                                                                                    |
| `scripts/orquestador/gh-app/gh`                  | El `gh` de las sesiones en modo app: cada llamada con su token fresco                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `scripts/orquestador/como-app.sh`                | Corre `gh …`, `git …` o `bash scripts/flujo/<guion>.sh …` como la app, a mano                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/orquestador/cola-github.sh`             | El espejo entre la cola local y los issues; respuestas a trabadas; issues cerrados a mano                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `scripts/orquestador/al-integrar.sh`             | Lo que una tarea pide hacer al integrarse (`al_integrar: etiquetar <nombre>`): crear la etiqueta, sin pisar una que ya exista, y reintentar si GitHub falla                                                                                                                                                                                                                                                                                                                                                                               |
| `scripts/orquestador/sin-sesion.sh`              | Lo que se arregla sin abrir una sesión: relanzar lo caído por algo ajeno al PR, unir un choque que es sólo de docs y llevar las migraciones de la rama después de las de main                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/orquestador/ajeno-de-main.sh`           | Un e2e que cae también en main: lo que hace con el `RESULTADO: AJENO` de una sesión de arreglo (su tarea urgente, la espera de quien lo encontró y ponerla al día cuando se integra)                                                                                                                                                                                                                                                                                                                                                      |
| `scripts/orquestador/integracion.sh`             | La cola de integración de GitHub: anota el puesto del PR, le enciende el auto-merge si le falta y, si la cola lo saca, renombra sus migraciones, lo vuelve a encolar o lo manda a arreglo                                                                                                                                                                                                                                                                                                                                                 |
| `scripts/orquestador/kit.sh`                     | El flujo entre el kit y este proyecto: la tarea semanal de traer el flujo del kit y, al integrar un PR que toca flujo, su tarea en el kit                                                                                                                                                                                                                                                                                                                                                                                                 |
| `scripts/orquestador/cierre-tanda.sh`            | El cierre de la tanda: cuándo hay una que cerrar, la tarea del cierre y, al integrarse, la poda de los transcriptos; la verificación de main antes de cerrar (y la tarea urgente si sale roja), en `cierre-main.sh`                                                                                                                                                                                                                                                                                                                       |
| `scripts/orquestador/resumen-tanda.mjs`          | El resumen de una tanda en Markdown (≤ 6 KB) que lleva la tarea del cierre: totales, trabas, arreglos, choques y los comandos más repetidos y más lentos, el contexto por turno y las compactaciones, y al final cada tarea; lo de cada sesión, en `resumen-sesion.mjs`                                                                                                                                                                                                                                                                   |
| `scripts/orquestador/cola-entrada.sh`            | La entrada (`.orquestador/entrada/`), la tarea mensual de dependencias y la adopción de las tareas locales de antes                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `scripts/orquestador/pedidos.sh`                 | Un pedido en texto libre (`pedido`): lanzar su redacción y la sesión en modo plan; lo que hace con su `SPEC:` o sus `PREGUNTAS:`, en `pedidos-salida.sh`                                                                                                                                                                                                                                                                                                                                                                                  |
| `scripts/orquestador/redaccion.mjs`              | Lo puro de la redacción: el hilo del issue (rondas, respuesta, conversación) y la salida de la sesión                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `scripts/orquestador/maquina.sh`                 | Lo que comparten los orquestadores de la máquina: `maquina.env`, los turnos de sesión y la pausa por el límite del plan                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scripts/orquestador/niveles.sh`                 | Los niveles de modelo: nivel → alias, qué campos de una spec valen, qué modelo es hoy cada alias                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scripts/orquestador/spec-issue.mjs`             | Una spec entre archivo e issue, en los dos sentidos (con su forma canónica para comparar)                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `scripts/orquestador/config.env`                 | `PROYECTO` (vacío: el del manifiesto), `KIT_GITHUB`, paralelo, niveles de modelo, límites (`MAX_AJENOS`, `TIEMPO_MAX_SESION`, `AUTOCOMPACT_SESION`: los tokens de contexto a los que cada sesión compacta, vacío no lo pasa) y lo que entra solo (`DEPS_MENSUAL`, `KIT_SEMANAL`, `KIT_AVISAR`, `NIVEL_REDACTAR`, `EFFORT_REDACTAR`, `TIEMPO_MAX_REDACCION`, `CIERRE_TANDA`, `CIERRE_MIN_TAREAS`, `CIERRE_APLASTAR`) y la app del orquestador (`APP_ID`, `APP_INSTALACION`, `APP_LOGIN`, `APP_CLAVE`: la ruta de la clave). Sin secretos   |
| `scripts/orquestador/prompts/`                   | Lo que recibe cada sesión: `tarea.md`, `planificar.md`, `arreglar.md`, `retomar.md`, `redactar.md`; y lo que se le suma: `cierra-issue.md`, `permite-dependencias.md`                                                                                                                                                                                                                                                                                                                                                                     |
| `scripts/orquestador/plantilla-tarea.md`         | La forma de una spec (la copia `nueva`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scripts/orquestador/plantillas/`                | Las specs que nacen de una plantilla: `dependencias.md` (la tarea mensual), `traer-flujo-del-kit.md` (la semanal del kit) y `traer-de-proyecto.md` (la tarea que abre en el kit), `cerrar-tanda.md` (el cierre de la tanda), `aplastar-migraciones.md` (antes del cierre) y `main-en-rojo.md` (dejar verde main antes de cerrarla) y `e2e-roto-en-main.md` (dejar verde un e2e que una sesión de arreglo encontró roto en main), que crea el orquestador; y `cerrar-construccion.md`, el cierre de un repo nuevo (lo crea semilla-a-repo) |
| `scripts/orquestador/dependencias-aprobadas.txt` | Lo único que una sesión puede agregar con pnpm, en cualquier tarea (lo vigila el hook); sumar uno va en el PR con su justificación                                                                                                                                                                                                                                                                                                                                                                                                        |
| `scripts/orquestador/prueba/`                    | El `gh` y el `claude` falsos, y los escenarios de las pruebas: la cola en los issues y varios orquestadores en una máquina. `gh-falso-git.mjs` sirve repos de git locales como si fueran de GitHub (el kit de juguete), y `curl-falso.sh` hace de GitHub para `token-app.sh`                                                                                                                                                                                                                                                              |
| `.orquestador/config.local.env`                  | Lo de tu máquina, pisa a `config.env`: `NTFY_TEMA`, `PARALELO`, `PATH_EXTRA`, `ORQ_SOLO_LOCAL`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `~/.config/orquestador/maquina.env`              | De la máquina, para todos sus orquestadores: `TURNOS_MAQUINA` (lo crea `verificar`) y, para el resumen diario de `proyecto.sh`, `NTFY_TEMA` y `NTFY_SERVIDOR` (opcional)                                                                                                                                                                                                                                                                                                                                                                  |
| `~/.local/state/orquestador/`                    | De la máquina: los candados de los turnos (`turno-<k>.lock`; quién lo tiene, en `turno-<k>.quien`) y la pausa por el límite del plan (`pausa-hasta`)                                                                                                                                                                                                                                                                                                                                                                                      |
| `.orquestador/entrada/`                          | Specs nuevas sin id (`<tema>.md`) y respuestas (`respuesta-T<n>.md`): se publican solas                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `.orquestador/cola/T*.md`                        | La copia de trabajo de la cola: una tarea por archivo, frontmatter + la spec                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `.orquestador/estado/`                           | Lo crea él: el estado de cada tarea, los logs, los prompts y lo que dijo cada sesión                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `.orquestador/worktrees/`                        | Lo crea él: un worktree por tarea en curso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `~/.cache/orquestador/<PROYECTO>/<ID>/`          | Lo crea él: el `TMPDIR` de cada tarea, fuera de `/tmp` (`TMP_TAREAS`); se vacía al empezar cada corrida y se borra al integrar                                                                                                                                                                                                                                                                                                                                                                                                            |

## Una tarea

```bash
bash scripts/orquestador/orquestador.sh nueva avisos-con-acciones   # crea el issue (p. ej. #57) y .orquestador/cola/T57-avisos-con-acciones.md
```

Nace en borrador (la etiqueta `cola:borrador`; en el archivo, `borrador: si`) y el orquestador no la lanza hasta que la quites. Se
escribe en el issue o en el archivo: lo que cambie en uno pasa al otro en la vuelta siguiente. También se carga una tarea creando un
issue con la etiqueta `cola` desde el celular, o dejando su spec (sin `id`) en `.orquestador/entrada/<tema>.md`.

Los campos: `titulo` y `rama` (única entre las vivas); `depende` (separadas por espacio: `T<n>`, una tarea de esta cola, o
`<repo>:<rama>`, un PR de esa rama integrado en ese repo; abajo); `conflicto` (llaves de área: dos tareas con una llave en común no
corren a la vez); `planificar: si` para que una sesión del nivel capaz en modo plan escriba el plan antes; `nivel` y `effort` (y
`nivel_plan`, `effort_plan`) si no valen los de `config.env`; `permite: dependencias` para que la sesión pueda correr `pnpm update`
y `pnpm dedupe` (abajo, «La tarea mensual de dependencias»; otra palabra deja la spec rota); `al_integrar: etiquetar <nombre>` para
que el orquestador cree esa etiqueta al integrarse la tarea (abajo, «Al integrar»; otra acción deja la spec rota). Un `id` que no es `T<n>` (las specs de
`../tareas` traen `id: K06`) queda como `origen: K06`: el id es siempre el número del issue. `paso: P07` (o `paso: cierre`) lo escribe
semilla-a-repo en los issues que salen del plan de la semilla, para no duplicarlos al volver a correr; el orquestador no lo usa.

**Niveles de modelo.** Una tarea nombra un nivel, `rapido`, `normal` o `capaz`, nunca un modelo: `config.env` dice qué alias es cada
uno (`NIVEL_RAPIDO="haiku"`, `NIVEL_NORMAL="sonnet"`, `NIVEL_CAPAZ="opus"`) y `verificar` pregunta qué modelo es hoy cada alias. Sin
`nivel`, la sesión usa `NIVEL_EJECUTAR` (y el plan, `NIVEL_PLANIFICAR`). Un `modelo:` con un alias (`sonnet`, `opus[1m]`) se respeta,
por compatibilidad, pero `nivel` le gana. Una versión fija en `modelo:` (o un nivel que no existe) es un error de la spec: el issue
queda en `cola:borrador` con un comentario que dice qué poner; en la entrada, en `<tema>.md.error`; sólo local, `plan` dice
`spec con error`; y una tarea que ya corría queda trabada con el mismo motivo.

## La cola en los issues

**El cuerpo del issue** es un bloque ` ```yaml ` con los campos (sin `id`) y después las secciones de la spec; el archivo local lleva
el frontmatter `---` de siempre. `spec-issue.mjs` convierte en los dos sentidos. El título del issue es `titulo`.

````
```yaml
titulo: repartir el límite entre orquestadores y rutear por nivel de modelo
rama: feat/turnos-y-niveles
depende: kit:feat/cola-en-issues
conflicto: orquestador
planificar: si
origen: K06
```

## Pedido de la persona
…
````

**Etiquetas.** Las crea `verificar` (y el bucle, si faltan). Cada cambio de estado deja una sola de estado; `cola` y `cola:urgente`
(va primero al lanzar) van aparte.

| Estado de la tarea     | Etiqueta                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| pendiente              | ninguna; `cola:borrador` si es borrador, su yaml está roto o repite una rama |
| corriendo, por retomar | `cola:corriendo`                                                             |
| esperando al CI        | `cola:esperando-ci`                                                          |
| por arreglar           | `cola:por-arreglar`                                                          |
| trabada                | `cola:trabada`                                                               |
| integrada              | `cola:integrada` (y el issue se cierra)                                      |
| omitida                | `cola:omitida` (y el issue se cierra como «not planned»)                     |

Las de lo que entra solo a la cola no son de estado, y el espejo no las toca:

| Etiqueta        | Qué es                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| `pedido`        | Un pedido en texto libre: una sesión lo redacta como spec (sin `cola` todavía)              |
| `cola:pregunta` | La redacción del pedido necesita tus respuestas: comenta en el issue                        |
| `deps`          | La tarea mensual de dependencias                                                            |
| `noche-roja`    | El e2e de la noche cayó (`scripts/flujo/noche.mjs`); a la segunda noche seguida, en la cola |
| `cierre`        | El cierre de la tanda (abajo, «El cierre de la tanda»); uno abierto frena otro              |

**El espejo, en cada vuelta** (o ya, con `espejo`):

- La entrada: cada `entrada/<tema>.md` se vuelve un issue, pasa a la cola como `T<n>` y se borra; una spec rota, o con la rama de una
  tarea ya integrada, queda con su motivo en `<tema>.md.error`. `entrada/respuesta-T<n>.md` se publica como comentario en el issue
  `<n>`. La publica un proceso por vez (`estado/.entrada.lock`): el comando `entrada` y la vuelta del bucle no la duplican.
- Issues abiertos con `cola` → archivo nuevo o actualizado. Si cambió el archivo y no el issue, el archivo sube al issue; si
  cambiaron los dos, manda el issue (la copia del archivo queda en `estado/<ID>/`). Un issue editado mientras su tarea corre no
  toca la sesión en curso: se toma en la siguiente retoma y se avisa con un comentario.
- Un issue con el bloque yaml roto, o con la rama de otra tarea viva, queda en `cola:borrador` con un comentario que dice qué arreglar.
- Adopción: una tarea local sin issue (de antes) se publica como issue y toma su número (su archivo, su estado y los `depende` que
  la nombran pasan a `T<n>`). Sólo las pendientes: las que ya empezaron terminan como locales.
- Un issue cerrado a mano sin `cola:integrada` → la tarea queda omitida (si su PR ya se integró, integrada).
- Sin red o con el límite de la API, el espejo se salta y la cola local sigue; la vuelta siguiente lo reintenta. Nada local se pierde.

**Comentarios.** El orquestador comenta en el issue, siempre empezando con `🤖 orquestador:`, al lanzar, al abrir el PR (con el
enlace), al trabarse (el motivo y «responde en un comentario»), al integrarse y, si la spec lo pide, al etiquetar. Los avisos de ntfy llevan el enlace del issue.

**Una trabada se responde comentando.** El primer comentario posterior al de la trabada que no empieza con `🤖 orquestador:` es tu
respuesta: se guarda en `estado/<ID>/respuesta.md`, se suma al cuerpo del issue en «Decisiones ya tomadas» como
`- Respuesta de la persona (AAAA-MM-DD): …`, se quita `cola:trabada` y la tarea se retoma con la respuesta en su prompt.

**El PR cierra el issue:** la sesión pone `Closes #<n>` en su cuerpo; al integrarse, el orquestador pone `cola:integrada` y cierra el
issue si GitHub no lo hizo.

**Issues que abre un workflow.** El autor de un issue tiene que poder escribir en el repo, ser la app del orquestador (su login, de
tipo Bot: «Como la app de GitHub» › «Quién es de confianza») o ser `github-actions[bot]` en un issue `noche-roja`: ése lo abre el CI
con `GITHUB_TOKEN` (un fork no tiene ese token con escritura). Otro issue de un bot no entra, y
ningún comentario de un bot cuenta como respuesta. Una spec redactada desde un pedido no puede traer `permite` ni `al_integrar`: un
permiso o una escritura en el repo los da la persona.

**Dependencias por rama.** `<repo>:<rama>` está lista cuando hay un PR de esa rama integrado en ese repo: `kit` es `KIT_GITHUB`, el
nombre de este repo es este, y otro nombre, el `github` que le da el manifiesto (`.proyecto/proyecto.yaml`). Se consulta con el token
de la cuenta de ese repo (`gh auth token --user <cuenta>`); un repo de una organización no tiene sesión de gh y vale el `GH_TOKEN` del
orquestador, que en modo app es el de la app (sólo lee). Si la rama es de una tarea de esta misma cola, manda su estado (una omitida
también libera). Sin token o sin red, espera, y `plan` dice por qué.

## Lo que entra solo a la cola

### Un pedido desde el celular

Un issue con la etiqueta `pedido` (sin `cola`), en texto libre: «quiero que…». Si lo abrió alguien con permiso de escritura, el bucle
lanza su **redacción**: una sesión de `claude -p` en modo plan (sólo lee; el nivel `NIVEL_REDACTAR`, capaz) sobre una copia de `main`
(un worktree desprendido en `.orquestador/worktrees/P<n>`, que se borra al terminar). Lee el repo y la cola viva, y termina en una de dos:

- `SPEC:` — el orquestador valida la spec (`spec-issue.mjs`), reemplaza con ella el cuerpo y el título del issue, cambia `pedido` por
  `cola` y comenta; el espejo siguiente la vuelve `T<n>`. El pedido original queda en `.orquestador/estado/P<n>/pedido-original.md`. Si
  quieres revisarla antes de que se lance, ponle `cola:borrador`.
- `PREGUNTAS:` — un comentario con las preguntas numeradas (con su propuesta) y la etiqueta `cola:pregunta`. **Tu comentario de
  respuesta** vuelve a lanzar la redacción con todo lo hablado. Máximo dos rondas: en la tercera la sesión decide lo conservador, y si
  aun así pregunta, el pedido queda en `cola:trabada` con las preguntas.

Una salida que no es ni lo uno ni lo otro, o una spec que no se lee, también lo deja en `cola:trabada` con el motivo: escribes tú la
spec en el cuerpo y cambias `pedido` por `cola`, o cierras el issue. Si el pedido toca otro repo, la redacción lo dice en sus preguntas
y propone la spec de cada uno: no crea nada en otro repo. Las rondas las cuenta el hilo del issue (una marca oculta en cada comentario
de preguntas): sobrevive a un reinicio. Sólo cuentan el autor y las respuestas de quien puede escribir en el repo, nunca un bot. Una
sesión que se cae o se pasa de `TIEMPO_MAX_REDACCION` se reintenta a los 5 minutos; a la tercera, trabado. El límite del plan pausa
sin gastar nada.

### La tarea mensual de dependencias

Una vez al mes (UTC), si no hay un issue `deps` creado ese mes ni uno abierto de antes, el espejo crea la tarea desde
`plantillas/dependencias.md` con `cola` y `deps` (`DEPS_MENSUAL="no"` la apaga). Lleva `permite: dependencias`: sus sesiones corren con
`ORQ_PERMITE=dependencias` y el hook de Bash (`.claude/hooks/bloquear-peligrosos.sh`) les deja correr `pnpm update` dentro de los rangos
de `package.json` (sin `--latest`, `-g`, `-i` ni una versión) y `pnpm dedupe`; `pnpm add`, `pnpm remove` y `--latest` siguen
bloqueados (agregar una de `dependencias-aprobadas.txt` es aparte y vale en cualquier tarea: `prompts/tarea.md` › «Dependencias»).
Cada versión mayor disponible queda como una línea en `docs/PENDIENTES.md` › «Decisión de la persona», sin instalarla. Un mes sin nada
que actualizar, la tarea termina trabada con «nada que actualizar este mes» y la cierras tú.

### La noche roja

El job `aviso-noche` de `.github/workflows/ci.yml` corre después del e2e completo de cada noche (`scripts/flujo/noche.mjs`, sin la
máquina). En rojo abre el issue `noche-roja` («e2e de la noche en rojo») o le suma la noche, con el enlace de la corrida y los specs
caídos (`caidos.txt` de los artefactos; si no hay, los jobs caídos), y la cuenta de noches seguidas en `<!-- noches: N -->`. **A la
segunda noche seguida** reescribe el cuerpo como spec (dejar verdes esos specs) y le pone `cola` y `cola:urgente`: el orquestador la
toma primero. En verde, cierra el que todavía no está en la cola. Con dos `noche-roja` abiertos manda el más viejo.

### Un e2e roto en main

La sesión de arreglo de un PR en rojo que ve que lo caído es un e2e que la rama no toca y que también cae en `main` (la noche, otro
PR o el spec corrido sobre `origin/main`) no lo arregla ni se traba: termina con
`RESULTADO: AJENO — <spec>:<línea> [<proyecto>] — <evidencia>` (`prompts/arreglar.md`; `ajeno-de-main.sh`). El orquestador:

- **Crea la urgente, una por `<spec>:<línea>`:** si ninguna tarea viva de la cola la arregla ya (una de la rama `fix/e2e-main-<slug>`, o una
  urgente que nombra ese `<spec>:<línea>`: la de la noche, la de main en rojo), crea desde `plantillas/e2e-roto-en-main.md` el issue
  `cola` y `cola:urgente` (rama `fix/e2e-main-<slug>`, `cierre: verificar`: no cuenta como tarea de la tanda) con la evidencia de la sesión.
  Dos tareas que encuentran el mismo spec esperan a la misma.
- **Deja esperando a la que lo encontró:** suma ese `T<m>` a su `depende` (el espejo lo sube a su issue), la mantiene `esperando_ci` y no
  retiene sus llaves de área (la urgente podría necesitarlas). Mientras la urgente no se integre, el rojo de su PR no abre sesión; `plan` y
  `estado` dicen «espera a T<m> (e2e roto en main: <spec>:<línea>; T<m> está <estado>)». Avisa «T<n> espera a T<m> (e2e roto en main: <spec>)».
  Una urgente trabada no la suelta: sigue esperando.
- **La retoma sin sesión:** integrada (u omitida) la urgente, pone la rama al día con main (`poner_al_dia_sin_sesion`, el merge en su
  worktree limpio) y vuelve a esperar al CI; unos 10 minutos no mira el rojo viejo que GitHub aún muestra. Sin worktree limpio, o si
  después cae otra cosa, sigue el camino de siempre (una sesión de arreglo, que trae main).
- **Un AJENO no gasta un intento de `MAX_ARREGLOS`:** cuenta aparte, con `MAX_AJENOS` (3) por tarea; a la siguiente, trabada. También
  es una trabada un `AJENO` sin spec y línea válidos, o fuera de una sesión de arreglo. Sin red al crear el issue, la tarea queda esperando y
  se reintenta en la vuelta siguiente (`vigilar`).

### La tarea semanal del flujo del kit

Una vez por semana (UTC, semana ISO), si no hay un issue `kit` abierto (de quien puede escribir en el repo), el espejo corre
`node scripts/kit/actualizar.mjs --revisar`: si `.kit/version` quedó atrás del main del kit (`KIT_GITHUB`) en algún archivo de flujo,
crea la tarea desde `plantillas/traer-flujo-del-kit.md` con `cola` y `kit` (`KIT_SEMANAL="no"` la apaga). Un kit que sólo avanzó
fuera del flujo no abre nada. La tarea corre `actualizar.mjs`, que mezcla el kit y commitea; si choca, no toca nada y la tarea se traba
con las rutas: se responde por ruta (`--tomar-kit`, `--dejar` o una línea en `.kit/omitir`; `docs/KIT.md` › «El flujo entre el kit y
los proyectos»). Si el kit no responde (sin red, sin acceso), se dice en el log y se vuelve a mirar a las 6 horas; al cuarto fallo
seguido (un día) avisa una vez y sigue intentando. La semana resuelta queda en `estado/.kit-semana`. El kit mismo no la hace.

### El cierre de la tanda

Al terminar una tanda, la limpieza y la retro las hace sola una tarea más (`cierre-tanda.sh`, `CIERRE_TANDA="no"` lo apaga). Sólo
con la cola en issues, nunca en el kit ni en un repo en construcción (ése tiene su cierre de la construcción).

- **Cuándo:** la cola está quieta (nada corriendo, esperando al CI, por arreglar o retomar, ni pendiente lanzable) y desde el último
  cierre se integraron al menos `CIERRE_MIN_TAREAS` (3) tareas. No cuentan las que entran solas (ramas `chore/flujo-del-kit-*`, la de
  `plantillas/dependencias.md` y `fix/e2e-noche-*`) ni las que llevan `cierre:` en la spec (el cierre, `cierre: tanda`; lo que abre,
  `cierre: mejora`; main en rojo y el e2e roto en main, `cierre: verificar`; el aplastado, `cierre: aplastar`). Con una trabada no cierra: lo dice una vez en el log. Un issue `cierre` abierto
  (de quien puede escribir) frena otro. La primera vez sólo empieza a contar (`estado/.cierre-desde`): la historia vieja no se cierra.
- **Main en verde antes:** dispara una vez por sha de main `ci.yml` por workflow_dispatch (`e2e=true`, `proyectos=escritorio`) con el
  token del dueño, avisa «verifico main antes de cerrar la tanda» y mira esa corrida en las vueltas siguientes (`estado/.cierre-run`).
  Roja: encola, una vez por sha, la tarea urgente de `plantillas/main-en-rojo.md` con la corrida y los caídos (`caidos.txt` de los
  artefactos o los jobs caídos); al integrarse, main cambia de sha y la próxima vuelta quieta vuelve a verificar (`cierre-main.sh`).
- **Las migraciones, siempre:** con main verde y más de una migración, encola primero la tarea de `plantillas/aplastar-migraciones.md`
  (`pnpm db:aplastar` con la huella idéntica, en su propio PR; una por cierre, `estado/.cierre-aplastar`; `CIERRE_APLASTAR="no"` lo
  apaga), y el cierre depende de ella: cada tanda termina con una sola migración.
- **El cierre:** después, la tarea de `plantillas/cerrar-tanda.md` con `cola` y `cierre`: aplastar los docs, sacar lo que sobra fuera
  de main, comprobar que quedó una sola migración y la retro con datos (hasta tres issues de mejora del flujo).
  Lleva la lista de tareas y el resumen de `resumen-tanda.mjs` (primero lo de toda la tanda: los totales con las sesiones de retomar
  y de arreglar, las trabas, los arreglos, los choques y los comandos más repetidos y más lentos; al final, cada tarea de la más cara
  a la más barata, que es lo que se recorta). Avisa «Tanda cerrándose».
- **Al integrarse el cierre:** la tanda siguiente cuenta desde ahí y se podan los transcriptos de las sesiones de la tanda
  (`sesion-*.jsonl`, `plan.jsonl` y sus `.err`); queda lo chico (estado, pr, logs, prompts, plan.md). Omitido (cerraste su issue),
  sólo vuelve a contar. Mientras hay un cierre en camino, el aviso «Cola terminada» lo dice.

## Al integrar

Una spec con `al_integrar: etiquetar <nombre>` (hoy la única acción; el nombre, letras, números y `._-` entre ellos, hasta 100) le
pide al orquestador crear esa etiqueta cuando la tarea se integra (`al-integrar.sh`). La usa el cierre de la construcción
(`plantillas/cerrar-construccion.md`, `etiquetar semilla-v<N>`).

- **Sobre qué commit:** el padre del commit integrado (`parents[0]` del squash), o sea main justo antes del PR. El PR del cierre saca
  `docs/semilla/`, y la etiqueta tiene que conservarla (`git show semilla-vN:docs/semilla/semilla.md`). Para etiquetar el squash
  mismo, se cambia una línea de `etiquetar_integrada`.
- **Se repite sin riesgo:** si la etiqueta ya está en ese commit, queda hecha sin aviso. **No pisa** una que existe en otro commit (o
  una anotada): queda `ya-existia`, con aviso high y un comentario en el issue que dice dónde está y dónde tocaba.
- **Si GitHub falla:** queda pendiente (se marca antes de dar la tarea por integrada: un reinicio no la pierde) y el espejo la
  reintenta, una vez cada 5 minutos como mucho; a los 5 fallos queda `fallida`, con aviso high, comentario y el `gh api -X POST …`
  para hacerla a mano. El límite de la API no cuenta como fallo. Sin cola en los issues no hay espejo: el primer fallo ya avisa.
- El estado, en `estado/<ID>/al_integrar` (`pendiente`, `hecha`, `ya-existia` o `fallida`) y `al_integrar.md` (lo último que pasó).
  `plan` lo muestra al lado de la tarea: `integrado · falta al integrar: etiquetar semilla-v1`.

### Lo que sube al kit

Al integrar una tarea con PR, el orquestador lee sus archivos (`pulls/<n>/files`) y, si toca una ruta de `scripts/kit/flujo.txt` o suma
a `docs/LECCIONES.md` una línea que termina en `(kit)` o `(semilla)`, crea en el kit un issue `cola` «traer de <repo> el PR #<n>»
desde `plantillas/traer-de-proyecto.md`, como la app del orquestador (la misma instalación cubre el kit); sin la app, con el token de la
cuenta dueña del kit (`gh auth token --user`, sólo para esa llamada).
`docs/LECCIONES.md` cuenta sólo por esas líneas. La tarea del kit la hace la skill `traer-de-proyecto` del kit (`KIT_AVISAR="no"` lo
apaga).

- **Lo que no avisa:** un PR que no toca flujo (`aviso_kit=nada`, sin ninguna llamada al kit), la tarea que trae el flujo del kit (rama
  `chore/flujo-del-kit-*`: lo que trae ya es del kit) y el kit mismo.
- **Si falla** (GitHub, o sin sesión de gh del dueño del kit): como «Al integrar», queda pendiente, el espejo lo reintenta cada
  5 minutos y a los 5 fallos queda `fallido`, con aviso high y el `gh api -X POST …` para hacerlo a mano. El límite de la API no cuenta.
- El estado, en `estado/<ID>/aviso_kit` (`pendiente`, `hecho`, `nada` o `fallido`), `aviso_kit_issue` (el enlace, que también va en un
  comentario del issue) y `aviso_kit.md`. `plan` muestra `integrado · falta llevar al kit` o `· no se pudo llevar al kit`.

## Como la app de GitHub

El orquestador y sus sesiones escriben en GitHub (issues, etiquetas, comentarios, PRs, auto-merge, la cola de integración, el e2e de
`main` antes de cerrar una tanda, los issues del kit) como la **app del orquestador**, `imandresalpiri-orquestador[bot]`, con un token
de instalación de una hora que se renueva solo. La sesión de gh de la persona queda de respaldo.

- **Requisito (la persona, una vez):** crear la GitHub App en la organización, sin webhook, e instalarla en `calesa-app`, `calesa-web`
  y `kit`. Permisos en escritura: actions, contents, issues, merge_queues, pull_requests y workflows; en lectura: checks, statuses y
  metadata. Su clave privada va en `~/.config/orquestador/app.pem` (modo 600, carpeta 700), fuera de todo repo.
- **`config.env`:** `APP_ID`, `APP_INSTALACION`, `APP_LOGIN` (el login `<slug>[bot]`) y `APP_CLAVE` (la ruta de la clave). Los ids y
  el login no son secretos; la clave sí: nunca se versiona, ni se imprime, ni va a un log. `APP_ID` vacío (el kit, otra máquina) =
  la sesión de gh de la persona, como antes; `ORQ_SIN_APP=1` en `config.local.env` la apaga sin tocar los ids.
- **El token:** `token-app.sh` firma un JWT RS256 con openssl (la clave por ruta; el JWT va a curl por stdin, nunca en argv), lo
  cambia por el token de instalación y lo guarda en `~/.cache/orquestador/app-<APP_INSTALACION>` (600, con `flock`) hasta 5 min antes
  de que venza. `token_gh` (`app.sh`) lo pide al arrancar, al principio de cada vuelta del bucle, en `correr` y en la redacción.
- **Una sesión de 5 h no se corta:** el entorno de `claude -p` queda fijo, así que `gh` es el envoltorio `gh-app/gh` (primero en el
  `PATH`: cada llamada toma el token fresco de la caché) y git empuja con el helper `token-app.sh credencial`, puesto por
  `GIT_CONFIG_*` (vacía los helpers de la máquina y suma el de la app; nada en `~/.gitconfig` ni en el repo). Un token de persona puesto
  a propósito (`GH_TOKEN=$(gh auth token --user …)`) se respeta.
- **Quién es de confianza:** un issue que abre la app con su token de instalación llega con `author_association` CONTRIBUTOR (que no
  basta: lo es cualquiera con un PR integrado), `user.type` Bot, login `<slug>[bot]` y `performed_via_github_app` nulo (GitHub sólo lo
  llena cuando la app actúa en nombre de una persona). El filtro (`JQ_CON_PERMISO` e `identidad_app`, `github.sh`) la reconoce por ser
  Bot con el login de `APP_LOGIN` (vacío: el de la caché del token, `token-app.sh --bot`) y, si GitHub lo llenara, por
  `performed_via_github_app.id` = `APP_ID`. Sin `APP_ID`, con `ORQ_SIN_APP=1` o sin login, nada entra por ser de la app (`verificar` lo
  dice, y da ✗ si `APP_LOGIN` no es el de GitHub). Una marca `estado/.ajenos/<n>` (o `P<n>` de un pedido) sólo evita repetir el log:
  cuando el issue pasa el filtro, se quita sola («issue #<n>: ahora entra a la cola»). Otro bot no entra; un comentario de un bot nunca
  es una respuesta.
- **Sin la clave** (otra máquina, la app sin instalar, el reloj corrido, la instalación borrada): sigue con la sesión de la persona y
  avisa una vez por motivo («GitHub sin la app: …»; el último, en `estado/.app-sin-app`); al volver, «GitHub: vuelvo a actuar como la
  app» en el log. Sin red no avisa.
- **A la app le falta un permiso:** el error de GitHub («Resource not accessible by integration») se traduce al permiso que pide esa
  llamada, en el log, en `estado/.gh-ultimo-error` y en un aviso por permiso. Un push que toca `.github/workflows` necesita `workflows`.
- **A mano como la app:** `bash scripts/orquestador/como-app.sh gh …` (también `git …` y `bash scripts/flujo/<guion>.sh …`; nada más).
- **Sin bypass:** la app nunca va en el bypass del ruleset de `main`: su PR espera al CI y a la cola como cualquiera. `verificar` lo
  recuerda, y revisa la clave, el login de la app, los repos de la instalación y sus permisos.
- **El hook** (`.claude/hooks/bloquear-secretos.sh`) frena en las sesiones leer la clave e imprimir el token o el entorno
  (`printenv`, `env` solo, `$GH_TOKEN`, `gh auth token` o `git-credential`, `git credential`, la caché `orquestador/app-*`, correr
  `token-app.sh`): gh y git push ya lo usan solos. Lee texto, así que evita el descuido y no es una frontera: la sesión corre con el
  usuario de la máquina, que puede leer la clave (`node -e`, `python -c` pasan). Lo que acota el daño es el token de una hora con los
  permisos de la app y sin bypass de `main`.

## Arrancar

1. `bash scripts/orquestador/orquestador.sh verificar`: herramientas (y el paquete de cada una que falte), `maquina.env` (lo crea) y
   los turnos de la máquina, el modelo de cada nivel, la cuenta de GitHub (o la app, «Como la app de GitHub»), auto-merge, las etiquetas de
   la cola (las crea), Docker, RAM, que `claude -p` responda, la cola, el estado del repo (`scripts/flujo/estado.sh`) y un aviso de
   prueba.
   - Avisos: `echo "NTFY_TEMA=\"calesa-app-$(openssl rand -hex 8)\"" >> .orquestador/config.local.env` y suscríbete en la app ntfy.
   - Si `claude -p` no responde en `auto`: `MODO_EJECUTAR="acceptEdits"` en `config.local.env`.
2. En primer plano para ver la primera ola: `tmux new -s orquestador-calesa-app 'bash scripts/orquestador/orquestador.sh'`.
3. Como servicio (sobrevive a reinicios): `bash scripts/orquestador/orquestador.sh instalar`, y una vez por máquina
   `loginctl enable-linger "$USER"`. Su log: `journalctl --user -u orquestador-calesa-app -f`. Quitarlo: `… desinstalar`.

Si el servicio no encuentra `claude`, `pnpm` o `node`, agrega sus rutas a `PATH_EXTRA` (`which claude pnpm node`) y vuelve a `instalar`.

## Comandos (`bash scripts/orquestador/orquestador.sh …`)

| Comando               | Qué hace                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `estado`              | La tabla: estado, PR y retomas/arreglos de cada tarea                                                            |
| `plan`                | Turnos libres de la máquina; qué lanzaría ahora y qué espera cada una (dependencia, área, turno, spec con error) |
| `nueva <tema>`        | Una spec en borrador, publicada ya como issue                                                                    |
| `entrada`             | Publica ya lo de `.orquestador/entrada/`                                                                         |
| `espejo`              | Una vuelta del espejo con los issues, ahora                                                                      |
| `vigilar`             | Una vuelta de la vigilancia de los PR (CI, choques, la espera a un e2e roto en main), ahora                      |
| `ver T05`             | Sigue en vivo lo que dice y hace la sesión de T05                                                                |
| `prompt T05`          | Lo que recibiría ahora la sesión de T05 (no lanza nada)                                                          |
| `pausar` / `reanudar` | No lanza nuevas (las que corren terminan) / vuelve a lanzar, y quita la pausa compartida por el límite del plan  |
| `parar T05`           | Corta la sesión de T05 ahora; queda para retomar                                                                 |
| `reintentar T05`      | Vuelve a poner en marcha una trabada (retoma desde su rama)                                                      |
| `omitir T05`          | La da por hecha sin hacerla (sus dependientes siguen)                                                            |

## Cómo decide

- **Lanza** una tarea cuando sus `depende` están integradas, ninguna en curso comparte su `conflicto`, hay carril libre y hay turno en
  la máquina. Primero termina lo empezado (arreglos y retomas), después lo nuevo: las `cola:urgente` y luego por número. Una que se
  retoma o se arregla también espera el área que ocupa otra; entre dos que se retoman con una llave en común pasa la de número menor.
- **Redacta** un pedido después de lanzar las tareas: una redacción a la vez por proyecto, con turno de la máquina pero sin carril ni
  lugar en `PARALELO`. `plan` dice en qué está cada pedido (`P<n>  pedido: …`).
- **No lanza sin lugar**: con menos de `MIN_LIBRE_PCT` % libre (inodos o espacio) en `/tmp`, el disco del repo o el de `TMP_TAREAS`,
  avisa una vez y espera; las que corren siguen. `plan`, `estado` y `verificar` dicen qué está lleno. Un worktree que no se pudo crear
  se reintenta a los 5 min (a la tercera, trabada).
- **Turnos de la máquina**: antes de preparar el worktree, el hijo toma un turno (`flock -n` sobre
  `~/.local/state/orquestador/turno-<k>.lock`) y lo sostiene hasta salir; si muere, el kernel lo suelta. Lo que lanza (la sesión,
  `preparar.sh`) no lo hereda: un proceso que quede vivo no lo retiene. Sin turno libre no lanza, `plan` dice «sin turno en la
  máquina» y quién los ocupa, y el hijo que llegó tarde vuelve a su estado sin gastar intentos. Un `TURNOS_MAQUINA` inválido usa 3 y
  avisa una vez.
- **Se pone al día solo**: al empezar cada vuelta, si la principal está en `main`, sin cambios y detrás de `origin/main`, hace
  `git merge --ff-only origin/main` (nunca empuja). Si eso cambió `scripts/orquestador/`, o la principal ya tiene otra versión de
  `scripts/orquestador/` que la que cargó al arrancar (alguien la trajo a mano), se relanza con `exec` antes de lanzar nada (mismo PID
  y mismo candado: las sesiones en curso siguen). En otra rama, con cambios o con commits que `origin/main` no tiene, no la
  toca: lo dice una vez en el log y `plan` lo muestra en una línea. Sin red, lo reintenta en la vuelta siguiente.
- **Publica** con `publicar.sh --sin-esperar`: el PR queda siempre con auto-merge (en verde entra a la cola de integración) y el carril se
  suelta mientras corre el CI.
- **Vigila** el PR cada minuto: integrado → borra worktree y rama. CI rojo o choque con main → una sesión de arreglo con el final del
  log de cada job caído, no el del agregador «Listo» (desde el 3.er intento, con el nivel `NIVEL_ARREGLAR_DIFICIL`). Un job que no es
  un bloque de e2e (lint, tipos, pruebas, base, el build) caído sin la firma de la máquina no espera a «Listo»: la sesión empieza en
  cuanto cae (`cayo_lo_del_pr`), sin los ~20 min de los e2e. Nadie trae main a la rama: en verde, la **cola de integración** lo prueba
  combinado con main y los PR de delante y lo integra (`integracion.sh`). En la cola anota el puesto; fuera de ella y sin auto-merge
  (GitHub lo apaga al sacarlo, o lo empujó un arreglo) lo enciende una vez por punta. Si la cola lo saca: sus migraciones quedaban antes
  de una de main → las renombra sin sesión; todo lo caído del grupo es ajeno al PR (la máquina del CI, un e2e que no toca) → lo vuelve a
  encolar, con los mismos topes que el relanzamiento de abajo; sin una corrida del grupo en rojo (otro motivo de GitHub) → lo vuelve a
  encolar una vez por punta; si no → una sesión de arreglo con «La cola de integración sacó el PR #N…» y el final del log de cada job del
  grupo. Cada 5 min mira el CI del push a main (`main-en-tanda.sh`, la red de seguridad): en rojo, la tarea urgente de dejarlo verde
  (`plantillas/main-en-rojo-en-tanda.md`, una vez por sha) y ninguna tarea nueva arranca hasta verlo verde. Un choque con main o un
  grupo de la cola en rojo con el PR en verde lo causa otra tarea: gasta un intento de `MAX_CHOQUES`, no de `MAX_ARREGLOS`.
  - **Sin sesión** cuando no pide criterio (`sin-sesion.sh`): si todo lo caído es ajeno al PR (bloques de e2e en specs que el PR no
    toca, o un log con la firma de la máquina del CI: Docker, la red, el runner), relanza lo caído hasta `REINTENTOS_CI_POR_PUNTA`
    veces por punta (con un bloque de e2e entre lo caído, una sola vez por tarea: ya cayó dos veces y cada arreglo es otra
    punta); si el PR choca con main sólo en docs Markdown, hace el merge con la unión de las dos partes en esos docs; si main
    integró una migración más nueva que las de la rama (el CI rojo por el orden, o la cola que lo sacó), hace el merge y renombra las
    de la rama, en su orden, con la hora de ahora (`chore(db): llevar las migraciones…`). Commitea y empuja: el CI vuelve a correr.
  - **Un e2e roto en main** (`ajeno-de-main.sh`): si la sesión de arreglo termina en `RESULTADO: AJENO — <spec>:<línea> [<proyecto>] — <evidencia>`,
    el orquestador encola la urgente que arregla ese spec, deja esperando a la tarea (`plan` dice a quién) y, integrada la urgente, la
    pone al día con main y vuelve a esperar al CI, sin otra sesión (abajo, «Un e2e roto en main»).
- **Límite del plan** de Claude: es de la cuenta, así que la pausa es de la máquina. El orquestador que lo detecta escribe la hora de
  fin (ahora + `PAUSA_POR_LIMITE_MIN`) en `~/.local/state/orquestador/pausa-hasta`, y ninguno de la máquina lanza hasta entonces (el
  hijo la vuelve a mirar al tomar su turno). Dos que llegan a la vez dejan la más tardía. La tarea cortada se retoma sin gastar
  intentos. Una hora vencida o ilegible se ignora y se borra; `reanudar` la quita para todos. Mientras dura, cada `PROBAR_PAUSA_MIN`
  minutos pregunta lo mínimo al modelo capaz desde fuera del repo: si responde (el límite pasó o la cuenta cambió de plan), la quita.
- **Trabada**: tras `MAX_RETOMAS` sesiones sin publicar, `MAX_ARREGLOS` arreglos de un CI rojo, `MAX_CHOQUES` de choques o `MAX_AJENOS` esperas a un e2e roto en main, o cuando la sesión dice que no puede (falta
  una decisión tuya, una dependencia fuera de la lista que ni como último recurso se justifica, un fallo que no es de la tarea ni un e2e que cae también en main). Comenta el motivo en
  el issue y avisa, suelta el carril, deja el worktree para que mires y sigue con lo que no depende de ella. Tu comentario en el issue
  la retoma.
- Cada PR corre el CI completo: con varias a la vez, mira los minutos de Actions. Cada carril con Supabase y un e2e ronda 3–4 GB de RAM.
