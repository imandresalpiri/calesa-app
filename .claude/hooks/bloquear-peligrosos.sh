#!/usr/bin/env bash
# Hook PreToolUse sobre Bash: bloquea lo que ninguna sesión de IA debería correr sola (exit 2 y el motivo por stderr,
# que es lo que Claude recibe). Lee la entrada con jq (`tool_input.command`, `cwd`). Se prueba en `bloquear-peligrosos.test.ts`.
#
#   Lo bloqueado:   lo irreversible (reset --hard, clean, checkout --, branch -D…), publicar en main (una sesión empuja sólo su rama,
#                   sin forzar, o una etiqueta nueva; main avanza por PR: docs/FLUJO.md; la única excepción es el primer push de main
#                   de un repo nuevo, abajo en `primer_push_de_main`), lo remoto que no es la base (secrets, config push, functions
#                   deploy, gh api …/dispatches, vercel), b_ip (otra app, con datos reales), cambiar dependencias (salvo agregar con
#                   pnpm lo de `scripts/orquestador/dependencias-aprobadas.txt`, ver docs/DECISIONES.md › «Stack y arquitectura») y
#                   saltarse el candado de la base (`scripts/candado.sh`).
#   Dependencias:   la tarea con `permite: dependencias` (el orquestador la corre con ORQ_PERMITE=dependencias) sí corre
#                   `pnpm update` dentro de los rangos de package.json (sin --latest, -g, -i ni una versión) y `pnpm dedupe`. ORQ_PERMITE se
#                   lee del entorno del hook, que es el del proceso `claude`: un `ORQ_PERMITE=x pnpm …` escrito en el comando no cuenta.
#                   Lo de pnpm vive en `bloquear-peligrosos-dependencias.sh`.
#   Secretos:       ni la clave de la app del orquestador ni el token de GitHub se leen o se imprimen (`printenv`, `env` solo,
#                   `$GH_TOKEN`, `gh auth token`, `git credential`, correr `token-app.sh`): viven en `bloquear-secretos.sh`.
#   Esperas:        un Bash en primer plano que espera sondeando (un bucle until/while/for con `sleep`, o un `sleep` de más de 5 s) y un
#                   Monitor que sólo cuenta tiempo se rechazan: se lanza con `run_in_background` y se espera el aviso. Vive en
#                   `bloquear-esperas.sh`; el hook corre sobre `Bash|Monitor` (settings.json).
#   El revisor:     su Bash es de sólo lectura (`solo-lectura.sh`) aunque la carpeta no esté confiada: los hooks del frontmatter de
#                   `.claude/agents/revisor.md` sólo corren con la carpeta confiada y `claude -p` (el orquestador) no la confía; los de
#                   settings sí corren y su entrada trae `agent_type`.
#
# Un comando se parte en segmentos (`&&`, `||`, `;`, `|`, `$(`, comillas invertidas, saltos de línea) y de cada uno se
# descartan los envoltorios (`VAR=x`, `sudo`, `env`, `timeout`, `eval`, `npx`, `corepack`, `pnpm exec`, `bash -c`,
# `scripts/candado.sh <nombre> --`) hasta el comando de verdad. No entiende comillas ni expansiones: el texto de un mensaje que
# nombre una de estas órdenes también se bloquea (mejor sobrar que faltar), y una orden armada con `$x` no se ve.
set -uo pipefail

ENTRADA=$(cat)
CMD=$(printf '%s' "$ENTRADA" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$ENTRADA" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0
[ -z "$CWD" ] && CWD="$PWD"
# La herramienta (Bash o Monitor: el mismo hook, el mismo `command`) y si el Bash va en segundo plano (`bloquear-esperas.sh`).
HERRAMIENTA=$(printf '%s' "$ENTRADA" | jq -r '.tool_name // empty' 2>/dev/null)
SEGUNDO_PLANO=$(printf '%s' "$ENTRADA" | jq -r '.tool_input.run_in_background // false' 2>/dev/null)

if [ "$(printf '%s' "$ENTRADA" | jq -r '.agent_type // empty' 2>/dev/null)" = revisor ]; then
  printf '%s' "$ENTRADA" | bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/solo-lectura.sh" || exit $?
fi

bloquear() {
  printf '%s\n' "$1" >&2
  exit 2
}

# La base remota del proyecto (`db push`, `--include-seed`, `db reset --linked`, `migration repair`…) la cambia la sesión desde
# 2026-11-16 (docs/DESPLIEGUE.md › «La base remota»). b_ip no: es otra app con datos reales, ni por su ref ni enlazada.
REF_INTOCABLE=baursalbatwztsaevlef

# La raíz del repo del cwd (el cwd, si no hay repo).
raiz_del_repo() { git -C "$CWD" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$CWD"; }

# Hay un `cd` (o `pushd`, `chdir`) en el comando, también entre paréntesis o comillas: lo que sigue corre en otra carpeta y el
# hook no ve cuál.
junto_a_un_cd() { printf '%s' "$CMD" | grep -qE '(^|[^[:alnum:]_./-])(cd|pushd|chdir)([[:space:]]|$)'; }

# Lo de pnpm y la lista aprobada vive en `bloquear-peligrosos-dependencias.sh`. Sin ese archivo el hook no sabe qué dejar pasar:
# bloquea todo (mejor sobrar que faltar).
DEPENDENCIAS="$(dirname "${BASH_SOURCE[0]}")/bloquear-peligrosos-dependencias.sh"
# shellcheck source=bloquear-peligrosos-dependencias.sh
. "$DEPENDENCIAS" 2>/dev/null || bloquear "Falta $DEPENDENCIAS (las reglas de dependencias del hook): sin él no corre nada."
SECRETOS="$(dirname "${BASH_SOURCE[0]}")/bloquear-secretos.sh"
# shellcheck source=bloquear-secretos.sh
. "$SECRETOS" 2>/dev/null || bloquear "Falta $SECRETOS (las reglas de secretos del hook): sin él no corre nada."
revisar_secretos
ESPERAS="$(dirname "${BASH_SOURCE[0]}")/bloquear-esperas.sh"
# shellcheck source=bloquear-esperas.sh
. "$ESPERAS" 2>/dev/null || bloquear "Falta $ESPERAS (las reglas de esperas del hook): sin él no corre nada."
revisar_esperas

# --- Sobre el comando entero (lo de siempre) ---
case "$CMD" in
  *"--no-verify"*) bloquear "Nunca git commit --no-verify: si un hook falla, el problema es el código." ;;
  *"$REF_INTOCABLE"*) bloquear "b_ip ($REF_INTOCABLE) es la base en la nube con datos reales de otra app: nunca se toca." ;;
  *"rm -rf /"* | *"rm -rf ~"* | *"rm -rf .."*) bloquear "rm -rf fuera del proyecto." ;;
  *"npm i -g"* | *"npm install -g"* | *"pnpm add -g"*) bloquear "Nada global: contamina la máquina del usuario." ;;
  *"SUPABASE_SECRET_KEY"* | *"sb_secret_"*) bloquear "No imprimas ni manipules la secret key desde Bash." ;;
  *"@next/codemod"*) bloquear "Un codemod de Next reescribe el código y las dependencias: lo decide una persona." ;;
esac

# La rama de una carpeta ($1 vacío = el cwd de la sesión; relativa = contra el cwd). Vacío si no hay rama (HEAD suelto).
rama_de() {
  local d="${1:-}"
  case "$d" in
    '') d="$CWD" ;;
    /*) ;;
    *) d="$CWD/$d" ;;
  esac
  git -C "$d" symbolic-ref --quiet --short HEAD 2>/dev/null
}

# Una sesión empuja sólo la rama en la que está (la de su PR), sin forzar ni borrar, y nunca main: main avanza al integrarse el PR
# (docs/FLUJO.md). `cd x && git push` cambiaría de rama sin que el hook lo vea: se rechaza. Una etiqueta nueva (`git push origin
# refs/tags/<nombre>`) sí se empuja, desde cualquier rama: no mueve ninguna.
# El primer push de main de un repo recién creado (la skill semilla-a-repo, docs/semillas/LECCIONES.md › «GitHub»): sólo
# `git [-C <carpeta>] push [-u|--set-upstream|-q] origin main`, desde main, a un `origin` que existe y no tiene main todavía
# (`ls-remote --exit-code` sale con 2). Sin red, sin remoto, con main ya publicado o con cualquier otra forma, no hay excepción:
# tampoco con una variable `GIT_*`, un `git -c`, más de un `-C` o una URL de push distinta de la de origin (el ls-remote miraría
# otro remoto que el push).
primer_push_de_main() {
  local dir="$1" t d rc=0 pos=()
  shift
  case "$CMD" in *GIT_* | *" -c "* | *" -C "*" -C "*) return 1 ;; esac
  for t in "$@"; do
    case "$t" in
      -u | --set-upstream | -q | --quiet) ;;
      -*) return 1 ;;
      *) pos+=("$t") ;;
    esac
  done
  [ "${#pos[@]}" = 2 ] || return 1
  [ "${pos[0]}" = origin ] || return 1
  [ "${pos[1]}" = main ] || return 1
  case "$dir" in
    '') d="$CWD" ;;
    /*) d="$dir" ;;
    *) d="$CWD/$dir" ;;
  esac
  [ "$(git -C "$d" remote get-url --push origin 2>/dev/null)" = "$(git -C "$d" remote get-url origin 2>/dev/null)" ] || return 1
  GIT_TERMINAL_PROMPT=0 timeout 30 git -C "$d" ls-remote --exit-code --heads origin main >/dev/null 2>&1 || rc=$?
  [ "$rc" = 2 ]
}

revisar_push() {
  local dir="$1"
  shift
  local pos=() t rama
  for t in "$@"; do
    case "$t" in
      --all | --mirror | --tags | --delete | -d | --prune | -f | --force* | --no-verify)
        bloquear "git push $t: sólo se empuja la rama propia, sin forzar, sin borrar y sin etiquetas." ;;
      -*) ;;
      *) pos+=("$t") ;;
    esac
  done
  junto_a_un_cd && bloquear "git push junto a un cd: el hook no ve en qué rama queda. Usa git -C <carpeta> push."
  if [ "${#pos[@]}" = 2 ] && [[ "${pos[1]}" =~ ^refs/tags/[A-Za-z0-9._/-]+$ ]]; then
    return 0
  fi
  rama=$(rama_de "$dir")
  case "$rama" in
    '') bloquear "git push sin una rama (HEAD suelto o fuera de un repo): no se sabe qué se publica." ;;
    main)
      primer_push_de_main "$dir" "$@" && return 0
      bloquear "git push desde main: main avanza por PR (docs/FLUJO.md). Trabaja en tu rama y empújala." ;;
  esac
  case "${#pos[@]}" in
    0 | 1) ;;
    2)
      [ "${pos[1]}" = HEAD ] || [ "${pos[1]}" = "$rama" ] ||
        bloquear "git push sólo de la rama actual («$rama»; sin ':', 'refs/', '+' ni otra rama): se pidió «${pos[1]}»."
      ;;
    *) bloquear "git push con más de un refspec: sólo origin <tu rama>." ;;
  esac
}

revisar_git() {
  local dir="" sub="" i=0 t n
  while [ "$i" -lt "${#A[@]}" ]; do
    t="${A[$i]}"
    case "$t" in
      -C) dir="${A[$((i + 1))]:-}"; i=$((i + 2)) ;;
      -c | --git-dir | --work-tree | --namespace | --exec-path) i=$((i + 2)) ;;
      -*) i=$((i + 1)) ;;
      *) sub="$t"; i=$((i + 1)); break ;;
    esac
  done
  local R=("${A[@]:$i}")
  case "$sub" in
    commit)
      for t in "${R[@]}"; do
        [ "$t" = -n ] && bloquear "Nunca git commit -n (--no-verify): si un hook falla, el problema es el código."
      done ;;
    reset)
      for t in "${R[@]}"; do
        [ "$t" = --hard ] && bloquear "git reset --hard descarta trabajo sin commitear: se hace un respaldo y se restaura con cp."
      done ;;
    clean) bloquear "git clean borra lo no rastreado sin pasar por la papelera." ;;
    checkout)
      for t in "${R[@]}"; do
        case "$t" in
          -- | -f | --force | .*) bloquear "git checkout $t descarta cambios: se respalda y se restaura con cp." ;;
        esac
      done ;;
    restore)
      local staged=0 worktree=0
      for t in "${R[@]}"; do
        case "$t" in --staged | -S) staged=1 ;; --worktree | -W) worktree=1 ;; esac
      done
      { [ "$staged" = 1 ] && [ "$worktree" = 0 ]; } || bloquear "git restore descarta cambios del árbol (sólo vale --staged)." ;;
    switch)
      for t in "${R[@]}"; do
        case "$t" in -f | --force | --discard-changes) bloquear "git switch $t descarta cambios." ;; esac
      done ;;
    branch)
      local borrar=0 forzar=0
      for t in "${R[@]}"; do
        case "$t" in
          -D) bloquear "git branch -D borra una rama sin comprobar que esté integrada." ;;
          --delete) borrar=1 ;;
          --force) forzar=1 ;;
          -[a-zA-Z]*)
            case "$t" in *D*) bloquear "git branch -D borra una rama sin comprobar que esté integrada." ;; esac
            case "$t" in *d*) borrar=1 ;; esac
            case "$t" in *f*) forzar=1 ;; esac ;;
        esac
      done
      [ "$borrar" = 1 ] && [ "$forzar" = 1 ] && bloquear "git branch --delete --force borra una rama sin comprobar que esté integrada." ;;
    stash)
      n="${R[0]:-}"
      case "$n" in drop | clear) bloquear "git stash $n borra lo guardado, que puede ser de otra sesión." ;; esac ;;
    push) revisar_push "$dir" "${R[@]}" ;;
  esac
}

revisar_gh() {
  local sub="${A[0]:-}" sub2="${A[1]:-}"
  case "$sub $sub2" in
    "workflow run") bloquear "gh workflow run gasta minutos de CI y lo dispara una persona." ;;
  esac
  if [ "$sub" = api ] && printf '%s' "$ARGS" | grep -qE '/dispatches'; then
    bloquear "gh api …/dispatches dispara un flujo de trabajo: lo hace una persona."
  fi
}

revisar_supabase() {
  local sub="${A[0]:-}" sub2="${A[1]:-}" remoto=0
  # Un push sin bandera también va al proyecto enlazado.
  case "$ARGS" in *" --linked"* | *" --project-ref"* | *" --db-url"*) remoto=1 ;; esac
  [ "$sub $sub2" = "db push" ] && remoto=1
  if [ "$remoto" = 1 ]; then
    local raiz enlazado=""
    raiz=$(raiz_del_repo)
    [ -r "$raiz/supabase/.temp/project-ref" ] && enlazado=$(tr -d '[:space:]' <"$raiz/supabase/.temp/project-ref")
    if [ "$enlazado" = "$REF_INTOCABLE" ] && [[ "$ARGS" != *" --project-ref"* ]] && [[ "$ARGS" != *" --db-url"* ]]; then
      bloquear "El proyecto enlazado es b_ip ($REF_INTOCABLE): nunca se toca. Enlaza el de importadora antes."
    fi
  fi
  case "$ARGS" in
    *"functions deploy"*) bloquear "supabase functions deploy publica en el proyecto remoto: lo hace una persona." ;;
    *"config push"*) bloquear "supabase config push cambia la configuración del proyecto remoto: va por scripts/demo/restaurar.sh." ;;
  esac
  case "$sub" in secrets) bloquear "supabase secrets toca los secretos del proyecto remoto: lo hace una persona." ;; esac
  [ "$CON_CANDADO" = 1 ] && return 0
  # Contra el remoto no hay base local que cuidar, salvo `db diff`, que arma una sombra local.
  [ "$remoto" = 1 ] && [ "$sub $sub2" != "db diff" ] && return 0
  case "$sub $sub2" in
    "db reset" | "db lint" | "db diff" | "gen types")
      bloquear "supabase $sub $sub2 usa la base local, que es de una a la vez: pasa por el candado (pnpm db:reset | db:lint | db:diff | db:types)." ;;
  esac
}

revisar_segmento() {
  local W=() t cabeza
  # Sin comillas ni barras invertidas: `bash -c 'git clean -fd'`, `git commit -m "x"` y `\pnpm` se leen igual que sin ellas.
  read -ra W <<<"${1//[\"\'\\]/}"
  # Una redirección (`> f`, `2>/dev/null`, `>> f`, `< f`) no es un argumento: se descarta con su archivo.
  local L=("${W[@]}") saltar=0
  W=()
  for t in "${L[@]}"; do
    if [ "$saltar" = 1 ]; then saltar=0; continue; fi
    if [[ "$t" =~ ^[0-9]*(\>\>?|\<)$ ]]; then saltar=1; continue; fi
    [[ "$t" =~ ^[0-9]*(\>\>?|\<). ]] && continue
    W+=("$t")
  done
  revisar_secretos_del_segmento "${W[@]}"
  # Lo que agregar con pnpm no admite delante: otra carpeta (`env -C`, `pnpm -C x exec`) o variables (`npm_config_registry=…`).
  CON_CANDADO=0
  OTRA_CARPETA=0
  CON_VARIABLES=0
  while :; do
    [ "${#W[@]}" -eq 0 ] && return 0
    # Por su nombre, sin la ruta (`/usr/bin/pnpm` es pnpm); una asignación (`PATH=/x/y`) queda entera.
    cabeza="${W[0]}"
    case "$cabeza" in [A-Za-z_]*=*) ;; *) cabeza="${cabeza##*/}" ;; esac
    case "$cabeza" in
      '') W=("${W[@]:1}") ;;
      [A-Za-z_]*=*) CON_VARIABLES=1; W=("${W[@]:1}") ;;
      sudo | env)
        W=("${W[@]:1}")
        quitar_opciones_de_sudo_o_env ;;
      command | nohup | time | exec | xargs | eval | timeout | nice | setsid | stdbuf)
        W=("${W[@]:1}")
        while [ "${#W[@]}" -gt 0 ]; do
          case "${W[0]}" in
            -s | -I | -E | -d | -a | --signal) W=("${W[@]:2}") ;;
            -* | [0-9]*) W=("${W[@]:1}") ;;
            *) break ;;
          esac
        done ;;
      corepack)
        case "${W[1]:-}" in
          use | up) bloquear "corepack ${W[1]} cambia la versión de pnpm del proyecto: lo decide una persona." ;;
        esac
        W=("${W[@]:1}") ;;
      npx | bunx | pnpx)
        W=("${W[@]:1}")
        quitar_opciones_de_ejecutar ;;
      pnpm | npm | pnpm@* | npm@*)
        # Tras las opciones globales (`pnpm -C x exec …`), que dejan lo que corre en otra carpeta.
        t=1
        while [ "$t" -lt "${#W[@]}" ]; do
          case "${W[$t]}" in
            recursive | multi | m | -*) es_opcion_con_valor "${W[$t]}" && t=$((t + 1)); t=$((t + 1)) ;;
            *) break ;;
          esac
        done
        case "${W[$t]:-}" in
          exec | dlx | x)
            [ "$t" -gt 1 ] && OTRA_CARPETA=1
            W=("${W[@]:$((t + 1))}")
            quitar_opciones_de_ejecutar ;;
          playwright | supabase | vercel | next | ncu)
            [ "$t" -gt 1 ] && OTRA_CARPETA=1
            W=("${W[@]:$t}") ;;
          *) break ;;
        esac ;;
      *candado.sh)
        CON_CANDADO=1
        t=1
        while [ "$t" -lt "${#W[@]}" ] && [ "${W[$t]}" != -- ]; do t=$((t + 1)); done
        W=("${W[@]:$((t + 1))}") ;;
      bash | sh | zsh)
        if [[ "${W[1]:-}" == -*c* ]]; then
          W=("${W[@]:2}")
        elif [[ "${W[1]:-}" == *candado.sh ]]; then
          W=("${W[@]:1}")
        else
          break
        fi ;;
      *) break ;;
    esac
  done
  local cmd="${W[0]##*/}"
  # `npx pnpm@11 …` es pnpm.
  case "$cmd" in pnpm@* | npm@* | yarn@*) cmd="${cmd%%@*}" ;; esac
  A=("${W[@]:1}")
  ARGS=" ${A[*]:-} "
  case "$cmd" in
    git) revisar_git ;;
    gh) revisar_gh ;;
    supabase) revisar_supabase ;;
    pnpm) revisar_pnpm ;;
    npm | yarn | bun | deno) revisar_otro_gestor ;;
    vercel) bloquear "vercel despliega o cambia el proyecto remoto: lo hace una persona." ;;
    ncu)
      for t in "${A[@]}"; do
        case "$t" in -u | --upgrade) bloquear "ncu -u reescribe las versiones de package.json: lo decide una persona." ;; esac
      done ;;
    next) [ "${A[0]:-}" = upgrade ] && bloquear "next upgrade lo decide una persona." ;;
    playwright)
      if [ "${A[0]:-}" = test ] && [ "$CON_CANDADO" = 0 ] && [[ "$ARGS" != *" --list "* ]]; then
        bloquear "playwright test usa la base local, que es de una a la vez: pasa por el candado (pnpm test:e2e | test:e2e:completo)."
      fi ;;
    node)
      if [ "$CON_CANDADO" = 0 ] && printf '%s' "${A[0]:-}" | grep -qE '(^|/)scripts/(e2e-completo|carreras|medir-listado|sembrar-volumen)\.mjs$'; then
        bloquear "${A[0]} usa la base local, que es de una a la vez: corre por su script de pnpm (candado) o por scripts/candado.sh."
      fi ;;
  esac
  # Después de las reglas de cada comando, que dan un motivo más preciso.
  [ "$cmd" = pnpm ] || pnpm_metido "${L[@]}"
  return 0
}

A=()
ARGS=""
CON_CANDADO=0
OTRA_CARPETA=0
CON_VARIABLES=0
# `2>&1` y `&>` llevan un `&` que no separa comandos: se reducen antes de partir.
SEGMENTOS=$(printf '%s' "$CMD" | sed -E 's/[0-9]*[<>]&[0-9-]*//g; s/&>>?/>/g' | sed -E 's/(&&|\|\||;|\||`|\$\(|\(|\)|&)/\n/g')
while IFS= read -r segmento; do
  revisar_segmento "$segmento"
done <<<"$SEGMENTOS"
exit 0
