# shellcheck shell=bash
# GitHub como la app del orquestador (README.md › «Como la app de GitHub»): el bucle, `correr`, la redacción y sus sesiones de claude
# escriben en GitHub con el token de instalación de la app (token-app.sh), y git empuja con el mismo token por su helper. Sin la clave
# (otra máquina, la app sin instalar), todo sigue con la sesión de gh de la persona y llega un aviso por motivo.
# Lo cargan con `source` orquestador.sh (que pone `log`, `avisar`, `EST`, `REPO_GH`, `ghr` y `dueno_del_repo`) y como-app.sh (que sólo
# usa `entrar_como_app`). Necesita `ORQ`.

TOKEN_APP="$ORQ/token-app.sh"

app_configurada() { [ -n "${APP_ID:-}" ] && [ -n "${APP_INSTALACION:-}" ] && [ "${ORQ_SIN_APP:-0}" != 1 ]; }

# Pide el token y deja el entorno de la app para este proceso y sus hijos: GH_TOKEN, el envoltorio gh-app/gh primero en el PATH (cada
# `gh` de una sesión larga pide su token fresco) y el helper de git por GIT_CONFIG_* (nada en ~/.gitconfig ni en el repo). La primera
# entrada vacía borra los helpers de la máquina (`!/usr/bin/gh auth git-credential`); un GIT_CONFIG_COUNT previo se respeta.
# 1 si no pudo: el motivo en APP_MOTIVO y el código de token-app.sh en APP_RC.
entrar_como_app() {
  local tok err n
  APP_MOTIVO="" APP_RC=0
  export APP_ID APP_INSTALACION APP_CLAVE
  err=$(mktemp)
  tok=$(bash "$TOKEN_APP" 2>"$err")
  APP_RC=$?
  if [ "$APP_RC" != 0 ] || [ -z "$tok" ]; then
    APP_MOTIVO=$(head -c 300 "$err" | tr '\n' ' ' | sed 's/ *$//')
    rm -f "$err"
    [ "$APP_RC" != 0 ] || APP_RC=6
    case "$APP_RC" in 3) APP_MOTIVO=${APP_MOTIVO:-la app no está configurada (APP_ID y APP_INSTALACION en config.env)} ;; esac
    APP_MOTIVO=${APP_MOTIVO:-token-app.sh salió con $APP_RC}
    return 1
  fi
  rm -f "$err"
  export GH_TOKEN="$tok" ORQ_GH_TOKEN_APP=1 GIT_TERMINAL_PROMPT=0
  case ":$PATH:" in *":$ORQ/gh-app:"*) ;; *) export PATH="$ORQ/gh-app:$PATH" ;; esac
  if [ "${ORQ_GIT_APP:-0}" != 1 ]; then
    n=${GIT_CONFIG_COUNT:-0}
    export "GIT_CONFIG_KEY_$n=credential.helper" "GIT_CONFIG_VALUE_$n="
    export "GIT_CONFIG_KEY_$((n + 1))=credential.helper" "GIT_CONFIG_VALUE_$((n + 1))=!bash '$TOKEN_APP' credencial"
    export GIT_CONFIG_COUNT=$((n + 2)) ORQ_GIT_APP=1
  fi
}

# El token con que el orquestador habla con GitHub. Con la app configurada, la app manda aunque haya un GH_TOKEN en el entorno; si
# falla, el aviso (uno por motivo) y la sesión de la persona: el GH_TOKEN de la máquina o el de la cuenta dueña del repo, aunque la
# activa sea otra (igual que publicar.sh). Nunca se traba por esto.
token_gh() {
  local d t
  if app_configurada; then
    if entrar_como_app; then
      app_de_vuelta
      return 0
    fi
    aviso_sin_app
    if [ "${ORQ_GH_TOKEN_APP:-0}" = 1 ]; then unset GH_TOKEN ORQ_GH_TOKEN_APP; fi
  fi
  [ -n "${GH_TOKEN:-}" ] && return 0
  d=$(dueno_del_repo)
  if [ -n "$d" ] && t=$(gh auth token --user "$d" 2>/dev/null) && [ -n "$t" ]; then export GH_TOKEN="$t"; fi
  return 0
}

# Un aviso cuando cambia el motivo (el código de token-app.sh: la clave, el reloj, GitHub), no uno por proceso: el bucle vive días. Sin
# red no avisa: queda en el log, como cualquier falta de red. El motivo avisado queda en estado/.app-sin-app.
aviso_sin_app() {
  local f="$EST/.app-sin-app"
  [ "$(head -n 1 "$f" 2>/dev/null)" = "$APP_RC" ] && return 0
  printf '%s\n%s\n' "$APP_RC" "$APP_MOTIVO" >"$f"
  if [ "$APP_RC" = 1 ]; then
    log "GitHub sin la app: $APP_MOTIVO. Sigo con la sesión de gh de la persona."
  else
    avisar "GitHub sin la app" "GitHub sin la app: $APP_MOTIVO. Sigo con la sesión de gh de la persona." high warning
  fi
}
app_de_vuelta() {
  [ -f "$EST/.app-sin-app" ] || return 0
  rm -f "$EST/.app-sin-app"
  log "GitHub: vuelvo a actuar como la app"
}

# ---------------------------------------------------------------------------------------------------------- el permiso que falta

# Los argumentos de una llamada a gh → el permiso de la app que pide (pura).
permiso_de_llamada() {
  local a=" $* "
  case "$a" in
    *" pr merge "*) echo "contents: write y pull_requests: write" ;;
    *" workflow run "* | *"/dispatches"* | *" run rerun "* | *"actions/"*) echo "actions: write" ;;
    *" graphql "*) echo "merge_queues o pull_requests" ;;
    *" pr "* | *"/pulls"*) echo "pull_requests: write" ;;
    *"/labels"* | *"/issues"* | *"/comments"* | *" issue "*) echo "issues: write" ;;
    *"/contents"* | *"/git/refs"*) echo "contents: write" ;;
    *) echo "el que pide ese pedido" ;;
  esac
}

# archivo-con-el-error args-de-gh… → 0 si el error es un permiso que le falta a la app: lo deja en estado/.gh-ultimo-error y en el
# log, y avisa una vez por permiso (estado/.app-sin-permiso-<permiso>). El texto queda en SIN_PERMISO_TEXTO. 1 si es otro error.
SIN_PERMISO_TEXTO=""
explicar_sin_permiso() {
  local f=$1 permiso github nombre marca
  shift
  SIN_PERMISO_TEXTO=""
  [ "${ORQ_GH_TOKEN_APP:-0}" = 1 ] || return 1
  github=$(grep -oiE 'Resource not accessible by integration|[^.:]*without [^.]*permission[^.]*' "$f" 2>/dev/null | head -n 1)
  [ -n "$github" ] || return 1
  permiso=$(permiso_de_llamada "$@")
  nombre=$(bash "$TOKEN_APP" --bot 2>/dev/null)
  nombre=${nombre%\[bot\]}
  SIN_PERMISO_TEXTO="La app ${nombre:-del orquestador} no tiene «$permiso» en ${REPO_GH:-el repo} (GitHub: $github). Dáselo en la configuración de la app y acepta el cambio en la instalación."
  printf '%s' "$SIN_PERMISO_TEXTO" >"$EST/.gh-ultimo-error"
  log "GitHub: $SIN_PERMISO_TEXTO"
  marca="$EST/.app-sin-permiso-$(printf '%s' "$permiso" | tr -c 'a-z_' '-')"
  [ -f "$marca" ] && return 0
  touch "$marca"
  avisar "GitHub: a la app le falta un permiso" "$SIN_PERMISO_TEXTO" high warning
  return 0
}

# ------------------------------------------------------------------------------------------------------------------- verificar

# La sección GitHub de `verificar` con la app configurada (token_gh ya corrió). 1 si hay algo que arreglar.
verificar_app() {
  local ok=0 modo bot vence repos r falta cola=false
  command -v openssl >/dev/null || { echo "✗ falta openssl (firma el JWT de la app): sudo apt install openssl"; return 1; }
  if [ ! -r "${APP_CLAVE:-}" ]; then
    echo "✗ no puedo leer la clave de la app en ${APP_CLAVE:-(APP_CLAVE vacía)}: créala en la organización y deja su clave ahí (README.md › «Como la app de GitHub»)"
    return 1
  fi
  modo=$(stat -c %a "$APP_CLAVE")
  case "$modo" in
    600 | 400) echo "✓ la clave de la app en $APP_CLAVE (modo $modo)" ;;
    *) echo "✗ la clave de la app la pueden leer otros (modo $modo): chmod 600 $APP_CLAVE"; ok=1 ;;
  esac
  if [ "${ORQ_GH_TOKEN_APP:-0}" != 1 ]; then
    echo "✗ gh no actúa como la app: ${APP_MOTIVO:-sin motivo}"
    return 1
  fi
  bot=$(bash "$TOKEN_APP" --bot 2>/dev/null)
  vence=$(bash "$TOKEN_APP" --vence 2>/dev/null)
  echo "✓ gh como la app ${bot:-(sin login)} (el token vence a las $(date -d "@${vence:-0}" +%H:%M))"
  repos=$(ghr api --paginate installation/repositories --jq '.repositories[].full_name' 2>/dev/null)
  for r in "$REPO_GH" "${KIT_GITHUB:-}"; do
    [ -n "$r" ] || continue
    if grep -qixF "$r" <<<"$repos"; then echo "✓ la app está instalada en $r"
    else echo "✗ la app no está instalada en $r: instálala ahí (la configuración de la app › Install App)"; ok=1; fi
  done
  [ "$(cd "$REPO" && cola_activa 2>/dev/null)" = true ] && cola=true
  falta=$(bash "$TOKEN_APP" --permisos 2>/dev/null | jq -r --argjson cola "$cola" '. as $p
    | {actions: "write", contents: "write", issues: "write", pull_requests: "write", workflows: "write",
       checks: "read", statuses: "read", metadata: "read"} + (if $cola then {merge_queues: "write"} else {} end)
    | to_entries[] | select(($p[.key] // "") as $g | ($g == "write" or (.value == "read" and $g == "read")) | not)
    | "\(.key): \(.value)"' | paste -sd ',' | sed 's/,/, /g')
  if [ -z "$falta" ]; then
    echo "✓ la app tiene los permisos que usa el orquestador"
    rm -f "$EST"/.app-sin-permiso-*
  else
    echo "✗ a la app le faltan permisos: $falta (dáselos en la configuración de la app y acepta el cambio en la instalación)"
    ok=1
  fi
  echo "· la app no debe estar en el bypass del ruleset de main: su PR también espera al CI"
  return "$ok"
}

# La línea de `verificar` sobre cómo se reconoce a la app en un issue (identidad_app en github.sh; token_gh ya corrió). 1 si no se
# reconocería: sin login, o un APP_LOGIN distinto del que dice GitHub (la caché del token).
verificar_login_app() {
  local cache=""
  if [ -z "${APP_ID:-}" ]; then
    echo "· sin la app: sólo entra a la cola el issue de quien puede escribir en el repo"
    return 0
  fi
  if [ "${ORQ_SIN_APP:-0}" = 1 ]; then
    echo "· ORQ_SIN_APP=1: un issue que abra la app no entra a la cola"
    return 0
  fi
  identidad_app
  if [ -z "$APP_RECONOCIDA_LOGIN" ]; then
    echo "✗ no sé el login de la app: los issues que abre (entrada, cierre, kit, dependencias) no entran a la cola. Pon APP_LOGIN=\"<slug>[bot]\" en scripts/orquestador/config.env"
    return 1
  fi
  app_configurada && cache=$(bash "$TOKEN_APP" --bot 2>/dev/null)
  if [ -n "${APP_LOGIN:-}" ] && [ -n "$cache" ] && [ "$APP_LOGIN" != "$cache" ]; then
    echo "✗ APP_LOGIN ($APP_LOGIN) no es el login de la app ($cache): corrígelo en config.env"
    return 1
  fi
  echo "✓ un issue de $APP_RECONOCIDA_LOGIN entra a la cola como uno de la persona"
}
