# shellcheck shell=bash
# Lo que el orquestador le pide a GitHub para la cola en los issues (scripts/orquestador/README.md › «La cola en los issues»):
# el envoltorio de `gh` (límite de la API y falta de red), las etiquetas, los comentarios, editar y cerrar issues, y las dependencias
# `<repo>:<rama>`. Lo carga orquestador.sh con `source`; usa sus `REPO`, `EST`, `log`, `campo`, `ids`, `spec_de` y `estado_de`.
# El espejo (qué se sincroniza y cuándo) está en cola-github.sh.

BOT="🤖 orquestador:"
ETIQUETAS_COLA="cola cola:borrador cola:corriendo cola:esperando-ci cola:por-arreglar cola:trabada cola:integrada cola:omitida cola:urgente"
# Las de lo que entra solo a la cola (README.md): un pedido en texto libre y sus preguntas, la tarea mensual de dependencias, el aviso
# de la noche, la tarea semanal del flujo del kit y el cierre de la tanda. No son de estado: sincronizar_etiquetas no las toca
# (cola:pregunta sólo vive en un `pedido`, que no lleva `cola`).
ETIQUETAS_ENTRADA="pedido cola:pregunta deps noche-roja kit cierre"
SPEC_ISSUE="$ORQ/spec-issue.mjs"
: "${REPO:?github.sh lo carga orquestador.sh}"
# `cuenta/repo` del remoto origin; vacío si no es de GitHub (entonces la cola es sólo local).
REPO_GH=$(git -C "$REPO" remote get-url origin 2>/dev/null | sed -nE 's#.*github\.com[:/]([^/]+/[^/]+)$#\1#p' | sed 's/\.git$//')

# La cola vive en los issues salvo con ORQ_SOLO_LOCAL=1 (config.local.env) o sin remoto de GitHub.
con_issues() { [ "${ORQ_SOLO_LOCAL:-0}" != 1 ] && [ -n "$REPO_GH" ]; }

# Quien abre un issue o comenta y puede escribir en el repo (author_association de la API). Lo demás no entra a la cola.
CON_PERMISO='["OWNER","MEMBER","COLLABORATOR"]'
# El filtro de quien abre un issue: lo de arriba o la app del orquestador (app.sh), que abre las tareas que entran solas (la entrada,
# deps, kit, cierre, la urgente de main). Con su token de instalación GitHub la devuelve así: author_association CONTRIBUTOR (que no
# basta: lo es quien tenga un PR integrado), user.type Bot, user.login `<slug>[bot]` y performed_via_github_app nulo (sólo se llena
# cuando la app actúa en nombre de una persona). Se la reconoce por su login (identidad_app) y, si GitHub lo llenara, por su id
# (`performed_via_github_app.id` = APP_ID); siempre de tipo Bot, para que una persona con ese nombre no entre. Otro bot no entra.
# Uso: identidad_app; jq --argjson ok "$CON_PERMISO" --arg app "$APP_RECONOCIDA_ID" --arg login "$APP_RECONOCIDA_LOGIN" "$JQ_CON_PERMISO …".
JQ_CON_PERMISO=$(cat <<'JQ'
def de_la_app($app; $login): .user.type == "Bot"
  and (($login != "" and .user.login == $login)
    or ($app != "" and ((.performed_via_github_app.id // "") | tostring) == $app));
def con_permiso($ok; $app; $login): (.author_association as $a | $ok | index($a)) != null or de_la_app($app; $login);
JQ
)

# Cómo se reconoce a la app en un issue: deja APP_RECONOCIDA_ID (APP_ID) y APP_RECONOCIDA_LOGIN. El login sale de APP_LOGIN en
# config.env (sin red ni clave: vale aunque la app haya caído a la sesión de la persona) o, si está vacío, de la caché del token
# (token-app.sh --bot, que lo pidió a GET /app; sólo con la app configurada). Las dos vacías sin APP_ID o con ORQ_SIN_APP=1: nada
# entra por ser de la app. El login de la caché se recuerda en el proceso sólo si no vino vacío: el bucle vive días y lo vuelve a buscar.
APP_LOGIN_DE_LA_CACHE=""
identidad_app() {
  APP_RECONOCIDA_ID="" APP_RECONOCIDA_LOGIN=""
  { [ -n "${APP_ID:-}" ] && [ "${ORQ_SIN_APP:-0}" != 1 ]; } || return 0
  APP_RECONOCIDA_ID=$APP_ID
  if [ -n "${APP_LOGIN:-}" ]; then
    APP_RECONOCIDA_LOGIN=$APP_LOGIN
    return 0
  fi
  if [ -z "$APP_LOGIN_DE_LA_CACHE" ] && app_configurada; then
    APP_LOGIN_DE_LA_CACHE=$(APP_ID="$APP_ID" APP_INSTALACION="${APP_INSTALACION:-}" APP_CLAVE="${APP_CLAVE:-}" \
      bash "$TOKEN_APP" --bot 2>/dev/null)
  fi
  APP_RECONOCIDA_LOGIN=$APP_LOGIN_DE_LA_CACHE
  return 0
}

# El autor de un issue: además, github-actions[bot] en un issue `noche-roja`, el que abre el aviso de la noche (scripts/flujo/noche.mjs)
# con GITHUB_TOKEN, sin una asociación de escritura; un fork no tiene ese token con escritura. Otro issue de un bot (un `pedido`, una
# `cola` sin `noche-roja`) no entra. Ningún comentario de un bot cuenta como respuesta (buscar_respuestas, redaccion.mjs).
con_permiso() {
  identidad_app
  jq -e --argjson ok "$CON_PERMISO" --arg app "$APP_RECONOCIDA_ID" --arg login "$APP_RECONOCIDA_LOGIN" \
    "$JQ_CON_PERMISO"' con_permiso($ok; $app; $login)
    or (.user.login == "github-actions[bot]" and .user.type == "Bot"
      and any(.labels[]?; (if type == "string" then . else .name end) == "noche-roja"))' <<<"$1" >/dev/null
}

# La salida de un `ghc api --paginate …/issues` → 0 si algún issue (no un PR) lo abrió quien puede escribir en el repo o la app.
alguno_con_permiso() {
  identidad_app
  jq -s -e --argjson ok "$CON_PERMISO" --arg app "$APP_RECONOCIDA_ID" --arg login "$APP_RECONOCIDA_LOGIN" \
    "$JQ_CON_PERMISO"'[add[]? | select(has("pull_request") | not) | select(con_permiso($ok; $app; $login))] | length > 0' \
    <<<"$1" >/dev/null
}

huella() { sha256sum | cut -c1-16; }
ahora_utc() { date -u +%FT%TZ; }

# gh contra el repo propio. 0 bien; 1 sin red u otro error (el texto queda en estado/.gh-ultimo-error); 2 límite de la API: deja
# la pausa en estado/.gh-espera-hasta y el espejo no vuelve a llamar hasta entonces (la cola local sigue).
ghc() {
  local err rc
  err=$(mktemp)
  (cd "$REPO" && gh "$@") 2>"$err"
  rc=$?
  if [ "$rc" != 0 ]; then
    if grep -qiE 'rate limit|secondary rate|abuse detection' "$err"; then
      echo $(($(date +%s) + ${GH_ESPERA_LIMITE_MIN:-15} * 60)) >"$EST/.gh-espera-hasta"
      log "GitHub: límite de la API; el espejo de la cola espera hasta las $(date -d "@$(cat "$EST/.gh-espera-hasta")" '+%H:%M') (la cola local sigue)"
      rc=2
    else
      # Un permiso que le falta a la app se dice con su nombre (app.sh); otro error, como llegó.
      explicar_sin_permiso "$err" "$@" || head -c 300 "$err" | tr '\n' ' ' >"$EST/.gh-ultimo-error"
      rc=1
    fi
  fi
  rm -f "$err"
  return "$rc"
}
gh_en_espera() { [ "$(date +%s)" -lt "$(cat "$EST/.gh-espera-hasta" 2>/dev/null || echo 0)" ]; }

# ------------------------------------------------------------------------------------------------------------------ etiquetas

etiqueta_de_estado() { # estado borrador(si|no) → la etiqueta cola:* de ese estado (ninguna para una pendiente lista)
  case "$1" in
    pendiente) [ "$2" = si ] && echo cola:borrador ;;
    corriendo | por_retomar) echo cola:corriendo ;;
    esperando_ci) echo cola:esperando-ci ;;
    por_arreglar) echo cola:por-arreglar ;;
    trabada) echo cola:trabada ;;
    integrado) echo cola:integrada ;;
    omitida) echo cola:omitida ;;
  esac
  return 0
}

etiquetas_listas() { [ "${ETIQUETAS_LISTAS:-0}" = 1 ]; }
asegurar_etiquetas() { # crea las que falten en el repo (una vez por proceso)
  etiquetas_listas && return 0
  local hay e color desc
  hay=" $(ghc api --paginate "repos/{owner}/{repo}/labels?per_page=100" --jq '.[].name' | tr '\n' ' ') " || return $?
  for e in $ETIQUETAS_COLA $ETIQUETAS_ENTRADA; do
    [[ "$hay" == *" $e "* ]] && continue
    case "$e" in
      cola) color=5319e7 desc="Tarea de la cola del orquestador" ;;
      cola:borrador) color=d4c5f9 desc="La spec no está lista: no se lanza" ;;
      cola:corriendo) color=1d76db desc="Una sesión la está haciendo" ;;
      cola:esperando-ci) color=fbca04 desc="PR abierto, esperando al CI" ;;
      cola:por-arreglar) color=e99695 desc="El CI cayó o choca con main: va una sesión de arreglo" ;;
      cola:trabada) color=b60205 desc="Necesita tu respuesta: comenta en el issue" ;;
      cola:integrada) color=0e8a16 desc="Integrada en main" ;;
      cola:omitida) color=cfd3d7 desc="Se dio por hecha sin hacerla" ;;
      cola:urgente) color=d93f0b desc="Va primero al lanzar" ;;
      pedido) color=0052cc desc="Pedido en texto libre: una sesión lo redacta como spec" ;;
      cola:pregunta) color=c5def5 desc="La redacción del pedido necesita tus respuestas: comenta" ;;
      deps) color=0366d6 desc="La actualización mensual de dependencias" ;;
      noche-roja) color=e11d21 desc="El e2e de la noche cayó (scripts/flujo/noche.mjs)" ;;
      kit) color=bfd4f2 desc="Traer el flujo del kit (scripts/kit/actualizar.mjs)" ;;
      cierre) color=c2e0c6 desc="El cierre de la tanda: docs aplastados y retro (cierre-tanda.sh)" ;;
    esac
    ghc api -X POST "repos/{owner}/{repo}/labels" -f name="$e" -f color="$color" -f description="$desc" >/dev/null || return $?
    log "GitHub: etiqueta $e creada en $REPO_GH"
  done
  ETIQUETAS_LISTAS=1
}

# Cambia las etiquetas de un issue: `gh issue edit`; si falla en el repo (no por la red ni el límite), PATCH con la lista entera.
etiquetar() { # n "poner…" "quitar…" "actuales…"
  local n=$1 poner=$2 quitar=$3 actuales=$4 args=() e final=() rc
  [ -n "$poner$quitar" ] || return 0
  if [ "${ISSUE_EDIT_FALLA:-0}" != 1 ]; then
    for e in $poner; do args+=(--add-label "$e"); done
    for e in $quitar; do args+=(--remove-label "$e"); done
    ghc issue edit "$n" "${args[@]}" >/dev/null && return 0
    rc=$?
    [ "$rc" = 2 ] && return 2
    ISSUE_EDIT_FALLA=1
  fi
  args=()
  for e in $actuales $poner; do
    [[ " $quitar " == *" $e "* ]] && continue
    [[ " ${final[*]} " == *" $e "* ]] && continue
    final+=("$e")
    args+=(-f "labels[]=$e")
  done
  ghc api -X PATCH "repos/{owner}/{repo}/issues/$n" "${args[@]}" >/dev/null
}

# ------------------------------------------------------------------------------------------------------------------- issues

issues_abiertos() { # los issues abiertos con `cola` (sin los PR, que la API también lista), en un arreglo JSON
  local salida
  salida=$(ghc api --paginate "repos/{owner}/{repo}/issues?labels=cola&state=open&per_page=100") || return $?
  jq -s '[add[]? | select(has("pull_request") | not)]' <<<"$salida"
}
api_issue() { ghc api "repos/{owner}/{repo}/issues/$1"; }
nombres_de_etiquetas() { jq -r '[.labels[]? | if type == "string" then . else .name end] | join(" ")' <<<"$1"; }

crear_issue() { # titulo archivo-del-cuerpo etiquetas… → imprime el número
  local titulo=$1 cuerpo=$2 args=() e
  shift 2
  for e in "$@"; do args+=(-f "labels[]=$e"); done
  ghc api -X POST "repos/{owner}/{repo}/issues" -f title="$titulo" -F body=@"$cuerpo" "${args[@]}" --jq .number
}

editar_issue() { # n titulo(vacío: no se toca) archivo-del-cuerpo — `gh issue edit`; si falla en el repo, PATCH
  local n=$1 titulo=$2 cuerpo=$3 args=() rc
  if [ "${ISSUE_EDIT_FALLA:-0}" != 1 ]; then
    [ -n "$titulo" ] && args+=(--title "$titulo")
    ghc issue edit "$n" "${args[@]}" --body-file "$cuerpo" >/dev/null && return 0
    rc=$?
    [ "$rc" = 2 ] && return 2
    ISSUE_EDIT_FALLA=1
  fi
  args=()
  [ -n "$titulo" ] && args+=(-f title="$titulo")
  ghc api -X PATCH "repos/{owner}/{repo}/issues/$n" "${args[@]}" -F body=@"$cuerpo" >/dev/null
}

# Un comentario del orquestador en el issue de una tarea (empieza con «🤖 orquestador:»). Imprime su id; sin issue o sin red, nada
# (los comentarios no se reintentan: el estado sí).
comentar() { # ID texto
  local n f
  con_issues || return 0
  n=$(est_get "$1" issue)
  [ -n "$n" ] || return 0
  f=$(mktemp)
  printf '%s %s\n' "$BOT" "$2" >"$f"
  ghc api -X POST "repos/{owner}/{repo}/issues/$n/comments" -F body=@"$f" --jq .id || log "$1: no se pudo comentar en el issue #$n"
  rm -f "$f"
  return 0
}

enlace_issue() { # ID → la URL de su issue, o nada
  local n
  con_issues || return 0
  n=$(est_get "$1" issue)
  [ -n "$n" ] && echo "https://github.com/$REPO_GH/issues/$n"
  return 0
}

# Cierra el issue de una tarea terminada con su etiqueta de estado (integrada u omitida) y deja la marca `issue_cerrado`.
cerrar_issue_de() { # ID
  local id=$1 n j s razon actuales e args=()
  n=$(est_get "$id" issue)
  [ -n "$n" ] || return 0
  s=$(estado_de "$id")
  razon=completed
  [ "$s" = omitida ] && razon=not_planned
  j=$(api_issue "$n") || return $?
  actuales=$(nombres_de_etiquetas "$j")
  for e in $actuales; do
    if [[ "$e" == cola:* ]] && [ "$e" != cola:urgente ]; then continue; fi
    args+=(-f "labels[]=$e")
  done
  args+=(-f "labels[]=$(etiqueta_de_estado "$s" no)")
  if [ "$(jq -r .state <<<"$j")" = open ]; then args+=(-f state=closed -f state_reason="$razon"); fi
  ghc api -X PATCH "repos/{owner}/{repo}/issues/$n" "${args[@]}" >/dev/null || return $?
  est_set "$id" issue_cerrado "$(ahora_utc)"
}

# --------------------------------------------------------------------------------------------------------------- dependencias

# El `cuenta/repo` de un nombre de dependencia: `kit` es KIT_GITHUB; el nombre de este repo (PROYECTO o el del remoto), este; otro,
# el que da el manifiesto (.proyecto/proyecto.yaml). Nada si no se sabe.
repo_de_nombre() {
  local n=$1 g
  if [ "$n" = kit ]; then echo "${KIT_GITHUB:-imandresalpiri/kit}"; return 0; fi
  if [ -n "$REPO_GH" ] && { [ "$n" = "$PROYECTO" ] || [ "$n" = "${REPO_GH#*/}" ]; }; then echo "$REPO_GH"; return 0; fi
  [ -f "$REPO/.proyecto/proyecto.yaml" ] && g=$(node "$MANIFIESTO" github "$n" "$REPO" 2>/dev/null) && [ -n "$g" ] && echo "$g"
  return 0
}

# Una dependencia: `T<n>` (una tarea de esta cola) o `<repo>:<rama>` (un PR de esa rama integrado en ese repo). 0 lista; 1 no, con
# el porqué en DEP_MOTIVO. FRESCO=1 no usa lo que se recuerda de una consulta negativa (lo pide `plan`).
dep_lista() {
  DEP_MOTIVO=""
  case "$1" in
    T[0-9]*) dep_tarea "$1" ;;
    ?*:?*) dep_rama "${1%%:*}" "${1#*:}" ;;
    *) DEP_MOTIVO="$1 (no es T<n> ni <repo>:<rama>)"; return 1 ;;
  esac
}

dep_tarea() {
  local id=$1 j
  if spec_de "$id" >/dev/null; then
    case "$(estado_de "$id")" in integrado | omitida) return 0 ;; esac
    DEP_MOTIVO="$id"
    return 1
  fi
  # No está en la cola local (otra máquina, o se cargó antes de que existiera esta copia): la dice su issue.
  [ -f "$EST/.deps/$id" ] && return 0
  if con_issues && j=$(api_issue "${id#T}" 2>/dev/null) &&
    grep -qwE 'cola:integrada|cola:omitida' <<<"$(nombres_de_etiquetas "$j")"; then
    mkdir -p "$EST/.deps" && echo "integrada" >"$EST/.deps/$id"
    return 0
  fi
  DEP_MOTIVO="$id (no está en la cola)"
  return 1
}

dep_rama() {
  local nombre=$1 rama=$2 repo otra s cache cuenta tok n rc err
  repo=$(repo_de_nombre "$nombre")
  if [ -z "$repo" ]; then
    DEP_MOTIVO="$nombre:$rama (no sé qué repo es «$nombre»: no es kit, ni este, ni está en .proyecto/proyecto.yaml)"
    return 1
  fi
  # Del repo propio, si la rama es de una tarea de esta cola, manda su estado (una omitida no tiene PR y igual libera).
  if [ "$repo" = "$REPO_GH" ]; then
    for otra in $(ids); do
      [ "$(campo "$(spec_de "$otra")" rama)" = "$rama" ] || continue
      s=$(estado_de "$otra")
      case "$s" in integrado | omitida) return 0 ;; esac
      DEP_MOTIVO="$nombre:$rama (es $otra, $s)"
      return 1
    done
  fi
  mkdir -p "$EST/.deps"
  cache="$EST/.deps/$(printf '%s' "$repo:$rama" | tr '/:' '__')"
  if [ -f "$cache" ]; then
    if [ "$(head -n 1 "$cache")" = integrada ]; then return 0; fi
    if [ "${FRESCO:-0}" != 1 ] && [ "$(($(date +%s) - $(stat -c %Y "$cache")))" -lt "${DEPS_RECORDAR_S:-300}" ]; then
      DEP_MOTIVO=$(sed -n 2p "$cache")
      return 1
    fi
  fi
  cuenta=${repo%%/*}
  tok=$(gh auth token --user "$cuenta" 2>/dev/null) || tok=""
  # Un repo de una organización no tiene sesión de gh (docs/LECCIONES.md): vale el token de la máquina.
  [ -z "$tok" ] && tok=${GH_TOKEN:-}
  if [ -z "$tok" ]; then
    DEP_MOTIVO="$nombre:$rama (sin token de la cuenta $cuenta: gh auth login)"
  else
    err=$(mktemp)
    n=$(GH_TOKEN="$tok" gh pr list -R "$repo" --head "$rama" --state merged --limit 1 --json number --jq '.[0].number // empty' 2>"$err")
    rc=$?
    if [ "$rc" = 0 ] && [ -n "$n" ]; then
      printf 'integrada\n#%s\n' "$n" >"$cache"
      rm -f "$err"
      return 0
    elif [ "$rc" = 0 ]; then
      DEP_MOTIVO="$nombre:$rama (sin PR integrado de $rama en $repo)"
    elif grep -qiE 'rate limit' "$err"; then
      DEP_MOTIVO="$nombre:$rama (límite de la API de GitHub: se vuelve a mirar en un rato)"
    else
      DEP_MOTIVO="$nombre:$rama (sin red o sin acceso a $repo: $(head -c 120 "$err" | tr '\n' ' '))"
    fi
    rm -f "$err"
  fi
  printf 'no\n%s\n' "$DEP_MOTIVO" >"$cache"
  return 1
}
