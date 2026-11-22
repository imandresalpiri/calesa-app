#!/usr/bin/env bash
# El orquestador de ESTE proyecto: corre solo, durante días, una cola de tareas (scripts/orquestador/README.md).
# Cada proyecto lleva el suyo dentro de su repo y no sabe de los otros: su cola, su estado, su servicio y su lock son propios.
#
# La cola vive en los issues del repo con la etiqueta `cola` (el issue 57 es la tarea T57); .orquestador/cola/T*.md es su copia de
# trabajo, en espejo en cada vuelta (cola-github.sh). Entran solas la tarea mensual de dependencias, el aviso de la noche y un pedido en
# texto libre (`pedido`), que una sesión en modo plan redacta como spec (pedidos.sh). Por cada tarea lista (dependencias integradas,
# área libre, carril libre):
#   1. crea su worktree desde origin/main (en .orquestador/worktrees/) y lo vuelve un carril (scripts/worktree/preparar.sh);
#   2. si la spec lo pide, una sesión de `claude -p` en modo plan escribe el plan (el nivel capaz);
#   3. una sesión nueva de `claude -p` implementa, verifica y publica el PR con auto-merge (`publicar.sh --sin-esperar`): en verde
#      entra a la cola de integración, que lo prueba combinado con main y lo integra (integracion.sh);
#   4. suelta el carril y vigila el PR: integrado → borra el worktree y sigue la cola; CI rojo, choque o sacado de la cola de
#      integración → sesión de arreglo.
# Cada sesión arranca desde cero (nada de contexto heredado). Si se corta (límite del plan, reinicio, tiempo), se retoma desde lo
# commiteado en la rama. El estado vive en .orquestador/estado/<ID>/ como archivos de texto: sobrevive a reinicios. Lo que la spec
# pide hacer al integrarse (`al_integrar: etiquetar <nombre>`) lo hace al integrar y, si GitHub falla, lo reintenta el espejo (al-integrar.sh).
# Un PR integrado que toca flujo abre su tarea en el kit, y una vez por semana entra la de traer el flujo del kit (kit.sh). Al quedar
# quieta la cola tras una tanda, verifica main y encola el cierre de la tanda (cierre-tanda.sh).
#
#   bash scripts/orquestador/orquestador.sh                 el bucle (lo que corre el servicio)
#   … verificar        comprueba herramientas, cuentas, Docker, la cola y el aviso de prueba; crea las etiquetas cola:*
#   … nueva <tema>     crea la spec desde la plantilla, en borrador, y la publica como issue (ORQ_SOLO_LOCAL=1: nueva <ID> <tema>)
#   … entrada          publica ya lo de .orquestador/entrada/ (specs nuevas como issues; respuesta-T<n>.md como comentario)
#   … espejo           una vuelta del espejo entre la cola local y los issues, ahora
#   … vigilar          una vuelta de la vigilancia de los PR (CI, choques, la espera a un e2e roto en main), ahora
#   … estado           la tabla de la cola
#   … plan             qué lanzaría ahora y por qué espera cada una (no lanza nada)
#   … ver <ID>         lo que va diciendo la sesión en curso de esa tarea (Ctrl+C para salir)
#   … prompt <ID>      lo que recibiría ahora la sesión de esa tarea (no lanza nada)
#   … reintentar <ID>  vuelve a poner en marcha una trabada (retoma desde su rama)
#   … omitir <ID>      la da por hecha sin hacerla (sus dependientes pueden seguir)
#   … parar <ID>       corta la sesión en curso de esa tarea (queda para retomar)
#   … pausar | reanudar   no lanza sesiones nuevas (las que corren terminan)
#   … instalar | desinstalar   el servicio de usuario de systemd de este proyecto (orquestador-<PROYECTO>)
set -uo pipefail
shopt -u patsub_replacement 2>/dev/null || true # bash ≥ 5.2: que «&» en una spec no se reemplace al armar el prompt

ORQ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# La principal del repo, aunque esto se corra desde un worktree: el padre del directorio común de git.
REPO="$(dirname "$(git -C "$ORQ" rev-parse --path-format=absolute --git-common-dir)")"
# shellcheck source=config.env
source "$ORQ/config.env"
# Lo de esta máquina (tema de ntfy, paralelo, rutas): ignorado por git. Pisa lo de config.env.
DATOS="${ORQ_DATOS:-$REPO/.orquestador}"
# shellcheck disable=SC1091
[ -f "$DATOS/config.local.env" ] && source "$DATOS/config.local.env"
COLA="$DATOS/cola"
EST="$DATOS/estado"
WTS="$DATOS/worktrees"
PROMPTS="$ORQ/prompts"
mkdir -p "$COLA" "$EST" "$WTS"

export PATH="${PATH_EXTRA:+$PATH_EXTRA:}$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
  [ -f "$REPO/.nvmrc" ] && nvm use --silent "$(cat "$REPO/.nvmrc")" >/dev/null 2>&1
fi

# El repo propio, de su manifiesto (.proyecto/proyecto.yaml): PROYECTO si config.env o config.local.env no lo fijan, y la cuenta del
# token. Sin manifiesto, ni lo uno ni lo otro: PROYECTO tiene que venir fijado y la cuenta es la del remoto, como antes.
MANIFIESTO="$REPO/scripts/proyecto/manifiesto.mjs"
# Un campo del repo propio, o nada: sin manifiesto, o con uno inválido (el motivo sale por stderr: no se traga).
manifiesto() { if [ -f "$REPO/.proyecto/proyecto.yaml" ]; then node "$MANIFIESTO" "$1" "$REPO" || true; fi; }
# El kit es el kit: su manifiesto es el del proyecto de ejemplo y daría el nombre de ese proyecto.
[ -n "${PROYECTO:-}" ] || [ ! -f "$REPO/.kit/plantilla" ] || PROYECTO=kit
[ -n "${PROYECTO:-}" ] || PROYECTO=$(manifiesto nombre)
SERVICIO="orquestador-${PROYECTO:?falta PROYECTO: fíjalo en config.env o dalo en .proyecto/proyecto.yaml (node scripts/proyecto/manifiesto.mjs nombre)}"
TMP_TAREAS="${TMP_TAREAS:-${XDG_CACHE_HOME:-$HOME/.cache}/orquestador/$PROYECTO}"

# La cola en los issues: lo que habla con GitHub y el espejo.
# shellcheck source=github.sh
source "$ORQ/github.sh"
# GitHub como la app del orquestador (token_gh): su token de instalación, o la sesión de gh de la persona.
# shellcheck source=app.sh
source "$ORQ/app.sh"
# shellcheck source=cola-github.sh
source "$ORQ/cola-github.sh"
# shellcheck source=cola-entrada.sh
source "$ORQ/cola-entrada.sh"
# Un pedido en texto libre (un issue con `pedido`), redactado como spec por una sesión en modo plan.
# shellcheck source=pedidos.sh
source "$ORQ/pedidos.sh"
# shellcheck source=pedidos-salida.sh
source "$ORQ/pedidos-salida.sh"
# Los niveles de modelo (rapido, normal, capaz) y qué alias es cada uno.
# shellcheck source=niveles.sh
source "$ORQ/niveles.sh"
# Lo que comparten los orquestadores de la máquina: los turnos de sesión.
# shellcheck source=maquina.sh
source "$ORQ/maquina.sh"
# Ponerse al día con origin/main sin que nadie lo pida.
# shellcheck source=al-dia.sh
source "$ORQ/al-dia.sh"
# Lo que una tarea pide hacer al integrarse (`al_integrar: etiquetar <nombre>`).
# shellcheck source=al-integrar.sh
source "$ORQ/al-integrar.sh"
# Lo que se arregla sin abrir una sesión: relanzar lo ajeno al PR (e2e de otro lado, la máquina del CI), el choque sólo de docs y
# las migraciones que quedaron antes de una de main.
# shellcheck source=sin-sesion.sh
source "$ORQ/sin-sesion.sh"
# Un e2e que cae también en main no es de la rama que lo encuentra: su tarea urgente y la espera de quien lo encontró.
# shellcheck source=ajeno-de-main.sh
source "$ORQ/ajeno-de-main.sh"
# Las mejoras del flujo entre el kit y este proyecto: la tarea semanal y lo que sube al kit al integrar.
# shellcheck source=kit.sh
source "$ORQ/kit.sh"
# El cierre de la tanda: con la cola quieta tras una tanda, main verificado y la tarea que aplasta los docs y hace la retro.
# shellcheck source=cierre-tanda.sh
source "$ORQ/cierre-tanda.sh"
# shellcheck source=cierre-main.sh
source "$ORQ/cierre-main.sh"
# main en rojo frena lo nuevo: la red de seguridad si algo entra roto.
# shellcheck source=main-en-tanda.sh
source "$ORQ/main-en-tanda.sh"
# La cola de integración: encender el auto-merge, seguir el puesto y atender la salida de la cola.
# shellcheck source=integracion.sh
source "$ORQ/integracion.sh"

# ------------------------------------------------------------------------------------------------------------------ utilidades

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >>"$EST/orquestador.log"; printf '%s %s\n' "$(date '+%T')" "$*" >&2; }

avisar() { # titulo mensaje [prioridad: min|low|default|high|urgent] [etiquetas] [enlace: el issue de la tarea]
  local msj=$2 extra=()
  if [ -n "${5:-}" ]; then msj="$msj · $5" && extra=(-H "Click: $5"); fi
  log "AVISO · $1 · $msj"
  [ -n "${NTFY_TEMA:-}" ] || return 0
  # El título lleva el proyecto: varios orquestadores pueden avisar al mismo celular.
  curl -fsS -m 15 -H "Title: [$PROYECTO] $1" -H "Priority: ${3:-default}" -H "Tags: ${4:-robot}" "${extra[@]}" -d "$msj" \
    "${NTFY_SERVIDOR:-https://ntfy.sh}/$NTFY_TEMA" >/dev/null 2>&1 || log "no se pudo mandar el aviso a ntfy"
}

# Frontmatter de una spec: `clave: valor` entre las dos primeras líneas `---`.
campo() {
  awk -v k="$2" 'NR==1 && $0!="---" {exit} NR>1 && $0=="---" {exit}
    NR>1 { i=index($0,":"); if (i && substr($0,1,i-1)==k) { v=substr($0,i+1); sub(/^[ \t]+/,"",v); sub(/[ \t]+$/,"",v); print v; exit } }' "$1"
}
cuerpo() { awk 'BEGIN{s=0} s<2 && $0=="---" {s++; next} s>=2' "$1"; }

# Los ids de la cola. Una spec cuyo `id` no es T<número> o no es el de su archivo no existe para el bucle: la nombra `cola_invalida`.
id_valido() { [[ "$(campo "$1" id)" =~ ^T[0-9]+$ ]] && [[ "$(basename "$1")" == "$(campo "$1" id)"[-.]* ]]; }
ids() { local f; for f in "$COLA"/T*.md; do [ -e "$f" ] && id_valido "$f" && campo "$f" id; done | sort -V; }
cola_invalida() { # imprime lo que está mal en la cola; devuelve 1 si hay algo
  local f id ok=0 vistos=" "
  for f in "$COLA"/*.md; do
    [ -e "$f" ] || continue
    id=$(campo "$f" id)
    if ! id_valido "$f"; then
      echo "✗ $(basename "$f"): su «id: ${id:-(vacío)}» no es T<número> o no es el de su nombre (T07-tema.md lleva «id: T07»). No se lanza."; ok=1
      continue
    fi
    if [[ "$vistos" == *" $id "* ]]; then echo "✗ $(basename "$f"): el id $id está repetido en la cola."; ok=1; fi
    vistos="$vistos$id "
  done
  return $ok
}
spec_de() { local f; for f in "$COLA/$1"-*.md "$COLA/$1".md; do [ -e "$f" ] && { echo "$f"; return 0; }; done; return 1; }

est_get() { cat "$EST/$1/$2" 2>/dev/null || true; }
est_set() { mkdir -p "$EST/$1"; printf '%s\n' "$3" >"$EST/$1/$2.tmp" && mv "$EST/$1/$2.tmp" "$EST/$1/$2"; }
est_del() { rm -f "$EST/$1/$2"; }
estado_de() { local e; e=$(est_get "$1" estado); echo "${e:-pendiente}"; }
num() { local n; n=$(est_get "$1" "$2"); echo "${n:-0}"; }
sumar() { est_set "$1" "$2" $(($(num "$1" "$2") + 1)); }

vivo() { local p; p=$(est_get "$1" pid); [ -n "$p" ] && kill -0 "$p" 2>/dev/null; }

dueno_del_repo() { # la cuenta del manifiesto; sin manifiesto, la del remoto
  local d; d=$(manifiesto cuenta)
  [ -n "$d" ] || d=$(git -C "$REPO" remote get-url origin | sed -nE 's#.*github\.com[:/]([^/]+)/.*#\1#p')
  echo "$d"
}
ghr() { (cd "$REPO" && gh "$@"); }

pausado() { # la pausa manual de este proyecto, o la de la máquina por el límite del plan (maquina.sh)
  [ -f "$EST/.pausa-manual" ] && return 0
  pausa_compartida_hasta >/dev/null
}

# ------------------------------------------------------------------------------------------------------------- cola y llaves

# La spec todavía se está escribiendo (`borrador: si`, que en el issue es cola:borrador) o su issue tiene el yaml roto: no se lanza.
borrador() { [ "$(campo "$1" borrador)" = si ] || [ -f "$EST/$(campo "$1" id)/issue-roto" ]; }
urgente() { [ "$(campo "$1" urgente)" = si ]; } # cola:urgente: va primero al lanzar

deps_listas() { # la spec no es un borrador y sus dependencias están listas (dep_lista); las que faltan, en DEPS_FALTAN
  local d
  DEPS_FALTAN=""
  borrador "$1" && return 1
  error_de_modelo "$1" >/dev/null && return 1
  for d in $(campo "$1" depende); do dep_lista "$d" || DEPS_FALTAN="$DEPS_FALTAN $DEP_MOTIVO"; done
  [ -z "$DEPS_FALTAN" ]
}

retiene_llaves() {
  case "$1" in
    corriendo | por_arreglar | por_retomar) return 0 ;;
    # Esperando a la urgente de un e2e roto en main no retiene su área: la urgente (`conflicto: e2e`) podría necesitarla.
    esperando_ci) [ -z "$(est_get "${2:-}" espera_a)" ] ;;
    trabada) [ "${TRABADA_RETIENE_LLAVES:-no}" = si ] ;;
    *) return 1 ;;
  esac
}

llave_ocupada_por() { # id [retomando] → imprime la tarea que retiene alguna llave de id, si hay
  local id=$1 retomando=${2:-} mias otra s k despues=no
  mias=$(campo "$(spec_de "$id")" conflicto)
  [ -n "$mias" ] || return 1
  for otra in $(ids); do
    [ "$otra" = "$id" ] && { despues=si; continue; }
    s=$(estado_de "$otra")
    retiene_llaves "$s" "$otra" || continue
    # Dos tareas por retomar o arreglar con una llave en común (las dos quedaron trabadas y se reintentaron): pasa primero la de
    # antes en la cola. Si cada una esperara a la otra, no correría ninguna.
    if [ -n "$retomando" ] && [ "$despues" = si ] && [[ "$s" == por_* ]]; then continue; fi
    for k in $(campo "$(spec_de "$otra")" conflicto); do
      if [[ " $mias " == *" $k "* ]]; then echo "$otra ($k)"; return 0; fi
    done
  done
  return 1
}

corriendo_ahora() { local n=0 id; for id in $(ids); do [ "$(estado_de "$id")" = corriendo ] && n=$((n + 1)); done; echo $n; }

# ------------------------------------------------------------------------------------------------------------------- el bucle

bucle() {
  # Sin flock, el `flock -n` de abajo fallaría y diría que ya hay otro orquestador.
  command -v flock >/dev/null || { echo "Falta flock: sudo apt install util-linux" >&2; exit 69; }
  # Relanzado con `exec` (al_dia_y_relanzar), el fd 8 sigue abierto con el candado: los hijos en curso comparten esa descripción, y
  # reabrirlo la soltaría y el `flock -n` chocaría con ellos.
  if [ "${ORQ_RELANZADO:-0}" != 1 ] || ! { : >&8; } 2>/dev/null; then exec 8>"$EST/.orquestador.lock"; fi
  flock -n 8 || { echo "Ya hay un orquestador corriendo (.orquestador/estado/.orquestador.lock)." >&2; exit 75; }
  local malos
  if malos=$(niveles_invalidos); then
    log "no arranco: los niveles de modelo de la configuración no valen: $(tr '\n' ' ' <<<"$malos")"
    printf '%s\n' "$malos" >&2
    exit 78
  fi
  while IFS= read -r malos; do [ -n "$malos" ] && log "$malos"; done < <(modelos_heredados)
  pasar_pausa_vieja
  token_gh
  leer_turnos
  log "orquestador arriba · paralelo $PARALELO · turnos de la máquina $TURNOS · niveles rapido=$NIVEL_RAPIDO normal=$NIVEL_NORMAL capaz=$NIVEL_CAPAZ · $(ids | wc -w) tareas en la cola"
  ORQ_CARGADA=$(version_del_orquestador)
  while :; do
    token_gh
    al_dia_y_relanzar
    avisar_turnos
    revisar_procesos
    vigilar_prs
    vigilar_main
    espejo
    con_issues || { al_integrar_pendientes; avisos_kit_pendientes; } # sin espejo: lo que un corte dejó pendiente
    probar_fin_de_pausa
    if ! pausado; then
      lanzar
      lanzar_redaccion
      cola_terminada
    fi
    sleep "${INTERVALO:-60}"
  done
}

# Una tarea «corriendo» cuyo proceso ya no existe (reinicio de la máquina, kill): se retoma.
revisar_procesos() {
  local id
  for id in $(ids); do
    [ "$(estado_de "$id")" = corriendo ] || continue
    vivo "$id" && continue
    log "$id: su proceso ya no está (¿reinicio?): queda para retomar"
    est_set "$id" motivo_retomar "La sesión anterior se cortó sin terminar (se reinició la máquina o el orquestador)."
    est_set "$id" estado por_retomar
  done
}

# Imprime qué está lleno si /tmp, el disco del repo o el de las carpetas temporales pasan del tope (inodos o espacio); 1 si hay lugar.
# Una tarea lanzada sin lugar se traba a mitad (sin pruebas, sin publicar) y otra ni crea su worktree: mejor no lanzar y esperar.
sin_lugar() {
  local d punto uso_i uso_b tope=$((100 - ${MIN_LIBRE_PCT:-5})) llenos="" vistos=" "
  [ -n "${TMP_TAREAS:-}" ] && mkdir -p "$TMP_TAREAS" 2>/dev/null
  for d in /tmp "$REPO" ${TMP_TAREAS:+"$TMP_TAREAS"}; do
    read -r punto uso_i uso_b < <(df --output=target,ipcent,pcent "$d" 2>/dev/null | tail -n 1) || continue
    [[ "$vistos" == *" $punto "* ]] && continue
    vistos="$vistos$punto "
    uso_i=${uso_i%\%} uso_b=${uso_b%\%}
    [[ "$uso_i" =~ ^[0-9]+$ ]] || uso_i=0 # btrfs y otros no cuentan inodos: «-»
    [[ "$uso_b" =~ ^[0-9]+$ ]] || uso_b=0
    [ "$uso_i" -ge "$tope" ] && llenos="$llenos $punto con el $uso_i % de los inodos usados;"
    [ "$uso_b" -ge "$tope" ] && llenos="$llenos $punto con el $uso_b % del espacio usado;"
  done
  [ -n "$llenos" ] || return 1
  llenos=${llenos# }
  echo "${llenos%;}"
}

lanzar() {
  local libres id s quien orden turnos lleno
  libres=$((PARALELO - $(corriendo_ahora)))
  [ "$libres" -gt 0 ] || return 0
  if lleno=$(sin_lugar); then
    if [ ! -f "$EST/.sin-lugar" ]; then
      touch "$EST/.sin-lugar"
      log "máquina sin lugar: no lanzo tareas ($lleno)"
      avisar "Máquina sin lugar" "No lanzo tareas: $lleno. Sigo solo cuando se libere; las que corren siguen." high floppy_disk
    fi
    return 0
  fi
  if [ -f "$EST/.sin-lugar" ]; then
    rm -f "$EST/.sin-lugar"
    log "la máquina tiene lugar otra vez: sigo lanzando"
  fi
  # El tope del proyecto y el de la máquina: no se lanza un hijo que no va a tener turno.
  turnos=$(turnos_libres)
  if [ "$turnos" = 0 ]; then
    [ -f "$EST/.sin-turno" ] || { touch "$EST/.sin-turno" && log "sin turno en la máquina: espero a que se libere uno"; }
    return 0
  fi
  rm -f "$EST/.sin-turno"
  [ "$turnos" -lt "$libres" ] && libres=$turnos
  # Primero lo que ya tiene trabajo hecho (arreglar y retomar), después lo nuevo: las urgentes y luego el orden de la cola.
  orden="$(for id in $(ids); do urgente "$(spec_de "$id")" && echo "$id"; done) $(for id in $(ids); do urgente "$(spec_de "$id")" || echo "$id"; done)"
  for pasada in arreglos nuevas; do
    for id in $orden; do
      [ "$libres" -gt 0 ] || return 0
      s=$(estado_de "$id")
      case "$pasada:$s" in
        arreglos:por_arreglar | arreglos:por_retomar)
          # Una trabada no retiene sus llaves: al reintentarla, otra tarea de su área puede estar corriendo o esperando al CI.
          quien=$(llave_ocupada_por "$id" retomando) && continue
          ;;
        nuevas:pendiente)
          deps_listas "$(spec_de "$id")" || continue
          frena_lo_nuevo "$(spec_de "$id")" && continue
          quien=$(llave_ocupada_por "$id") && continue
          ;;
        *) continue ;;
      esac
      [ -n "$(est_get "$id" espera_carril_hasta)" ] && [ "$(date +%s)" -lt "$(est_get "$id" espera_carril_hasta)" ] && continue
      est_set "$id" previo "$s"
      est_set "$id" estado corriendo
      rm -f "$EST/.terminada-avisada"
      setsid bash "$ORQ/orquestador.sh" correr "$id" >>"$EST/$id/correr.log" 2>&1 </dev/null &
      est_set "$id" pid "$!"
      log "$id: lanzada ($s → corriendo)"
      libres=$((libres - 1))
    done
  done
}

cola_terminada() {
  local id s activos=0 listas=0 bloqueadas="" trab="" hechas=0
  for id in $(ids); do
    s=$(estado_de "$id")
    case "$s" in
      integrado | omitida) hechas=$((hechas + 1)) ;;
      trabada) trab="$trab $id" ;;
      pendiente)
        if deps_listas "$(spec_de "$id")"; then listas=$((listas + 1)); else bloqueadas="$bloqueadas $id"; fi
        ;;
      *) activos=$((activos + 1)) ;;
    esac
  done
  # Sigue habiendo trabajo posible: nada que avisar.
  [ "$activos" = 0 ] && [ "$listas" = 0 ] || return 0
  [ -f "$EST/.terminada-avisada" ] && return 0
  touch "$EST/.terminada-avisada"
  if [ -n "$trab" ]; then
    avisar "Cola detenida" "$hechas integradas. Trabadas:$trab.${bloqueadas:+ Esperando:$bloqueadas.} bash scripts/orquestador/orquestador.sh estado" high warning
  else
    avisar "Cola terminada" "Las $hechas tareas están integradas en main.$(linea_cierre)" default tada
  fi
}

# -------------------------------------------------------------------------------------------------------------- vigilar los PR

vigilar_prs() {
  local id pr j state mergeable listo
  for id in $(ids); do
    [ "$(estado_de "$id")" = esperando_ci ] || continue
    pr=$(est_get "$id" pr)
    [ -n "$pr" ] || continue
    j=$(ghr pr view "$pr" --json state,mergeable,mergeStateStatus,statusCheckRollup,headRefOid 2>/dev/null) || continue
    state=$(jq -r .state <<<"$j")
    mergeable=$(jq -r .mergeable <<<"$j")
    listo=$(jq -r '[.statusCheckRollup[]? | select(.__typename == "CheckRun" and (.name | startswith("Listo"))) | .conclusion] | last // ""' <<<"$j")
    case "$state" in
      MERGED) integrada "$id" "$pr"; continue ;;
      CLOSED) trabar "$id" "El PR #$pr se cerró sin integrarse."; continue ;;
    esac
    if esperar_al_arreglo_de_main "$id" "$pr" "$j"; then
      continue # espera a la urgente de un e2e roto en main (ajeno-de-main.sh), o recién puesta al día tras ella
    elif [ "$mergeable" = CONFLICTING ]; then
      poner_al_dia_sin_sesion "$id" "$pr" ||
        a_arreglar "$id" "El PR #$pr choca con main (conflicto de merge). Lo integrado mientras tanto en main tocó lo mismo." choque
    elif [ "$listo" = FAILURE ] || [ "$listo" = CANCELLED ]; then
      migraciones_tras_main "$id" "$pr" || reintentar_ci_ajeno "$id" "$pr" "$j" || a_arreglar "$id" "$(motivo_ci "$pr" "$j")"
    elif [ "$listo" = SUCCESS ]; then
      # En verde: la cola de integración lo prueba combinado con main y lo integra (integracion.sh).
      atender_la_cola_de_integracion "$id" "$pr" "$j"
    elif [ -z "$listo" ] && cayo_lo_del_pr "$id" "$j"; then
      # El CI sigue en los e2e, pero ya cayó lo que es del PR: la sesión empieza ahora (su push cancela la corrida vieja).
      migraciones_tras_main "$id" "$pr" || a_arreglar "$id" "$(motivo_ci "$pr" "$j")"
    fi
  done
}

# La primera línea nombra los jobs caídos: es la que llevan el log, el aviso al celular y el resumen de la tanda.
motivo_ci() { # pr json → texto con los jobs caídos y el final del log de cada uno (no el del agregador «Listo», que no dice nada)
  local pr=$1 j=$2 caidos filtro
  filtro='.statusCheckRollup[]? | select(.__typename == "CheckRun" and (.conclusion == "FAILURE" or .conclusion == "CANCELLED") and ((.name | startswith("Listo")) | not))'
  caidos=$(jq -r "[$filtro | .name] | join(\", \")" <<<"$j")
  echo "El CI del PR #$pr cayó: ${caidos:-ningún job en rojo a la vista (sólo el agregador)}."
  echo
  echo "Jobs en rojo:"
  jq -r "$filtro | \"- \\(.name) (\\(.conclusion)): \\(.detailsUrl)\"" <<<"$j"
  finales_de_logs "$(jobs_caidos "$j")"
}

# id motivo [choque] — un choque con main lo causa lo que otra tarea integró: no gasta un intento de MAX_ARREGLOS (que es para lo
# que la tarea rompió) sino de MAX_CHOQUES.
a_arreglar() {
  local id=$1 motivo=$2 cuenta=arreglos tope=${MAX_ARREGLOS:-4}
  if [ "${3:-}" = choque ]; then cuenta=choques tope=${MAX_CHOQUES:-8}; fi
  ajeno_olvidar "$id"
  sumar "$id" "$cuenta"
  if [ "$(num "$id" "$cuenta")" -gt "$tope" ]; then
    trabar "$id" "Se intentó arreglar el PR $(est_get "$id" pr) $tope veces ($cuenta) y sigue sin integrarse. Último motivo: $(head -n 3 <<<"$motivo" | tr '\n' ' ')"
    return
  fi
  printf '%s\n' "$motivo" >"$EST/$id/motivo.md"
  est_set "$id" estado por_arreglar
  log "$id: a arreglar ($cuenta: $(num "$id" "$cuenta")): $(head -n 1 <<<"$motivo")"
  avisar "$id: CI rojo" "Va el arreglo $(num "$id" "$cuenta") ($cuenta). $(head -n 1 <<<"$motivo")" low wrench "$(enlace_issue "$id")"
}

integrada() {
  local id=$1 pr=$2 wt rama
  wt="$WTS/$id"
  rama=$(campo "$(spec_de "$id")" rama)
  if [ -d "$wt" ]; then
    [ -f "$wt/.env.carril" ] && (cd "$wt" && bash scripts/worktree/quitar.sh >>"$EST/$id/preparar.log" 2>&1 9>&-)
    git -C "$REPO" worktree remove --force "$wt" >>"$EST/$id/correr.log" 2>&1 || log "$id: no se pudo borrar el worktree $wt (bórralo a mano)"
  fi
  git -C "$REPO" worktree prune >/dev/null 2>&1
  git -C "$REPO" branch -D "$rama" >/dev/null 2>&1 || true
  rm -rf "${TMP_TAREAS:?}/$id"
  marcar_al_integrar "$id"
  marcar_aviso_kit "$id"
  est_set "$id" estado integrado
  est_set "$id" integrado_en "$(date '+%F %T')"
  avisar "$id integrada ✓" "PR #$pr en main: $(campo "$(spec_de "$id")" titulo)" default white_check_mark "$(enlace_issue "$id")"
  if con_issues && [ -n "$(est_get "$id" issue)" ]; then
    comentar "$id" "integrada en main con el PR #$pr ✓" >/dev/null
    cerrar_issue_de "$id" || log "$id: no se pudo cerrar el issue: se reintenta en la vuelta siguiente"
  fi
  hacer_al_integrar "$id"
  avisar_al_kit "$id"
  cierre_al_integrar "$id"
}

trabar() {
  local id=$1 motivo=$2 wt
  wt="$WTS/$id"
  [ -f "$wt/.env.carril" ] && (cd "$wt" && bash scripts/worktree/quitar.sh >>"$EST/$id/preparar.log" 2>&1 9>&-)
  est_set "$id" estado trabada
  printf '%s\n' "$motivo" >"$EST/$id/trabada.md"
  if con_issues && [ -n "$(est_get "$id" issue)" ]; then
    # La respuesta es el primer comentario posterior a éste que no es del orquestador (buscar_respuestas).
    est_set "$id" trabada_en "$(ahora_utc)"
    est_set "$id" trabada_comentario "$(comentar "$id" "me trabé: $motivo

Responde en un comentario de este issue: tu respuesta se suma a «Decisiones ya tomadas» y la tarea se retoma desde su rama.")"
    avisar "$id trabada" "$motivo — responde en un comentario del issue" high warning "$(enlace_issue "$id")"
  else
    avisar "$id trabada" "$motivo — revisa .orquestador/estado/$id/ y luego bash scripts/orquestador/orquestador.sh reintentar $id" high warning
  fi
}

# ----------------------------------------------------------------------------------------------------- correr una tarea (hijo)

correr() {
  ID=$1
  SPEC=$(spec_de "$ID") || { echo "no existe la spec de $ID" >&2; exit 64; }
  RAMA=$(campo "$SPEC" rama)
  TITULO=$(campo "$SPEC" titulo)
  WT="$WTS/$ID"
  # Su propia carpeta temporal (TMPDIR), vacía en cada corrida y fuera de /tmp: lo que las pruebas y las herramientas dejan sin borrar
  # no se acumula en el tmpfs de la máquina, que tiene tope de archivos y frena a todos los proyectos cuando se llena.
  export TMPDIR="$TMP_TAREAS/$ID"
  rm -rf "$TMPDIR" && mkdir -p "$TMPDIR"
  PREVIO=$(est_get "$ID" previo)
  est_set "$ID" pid "$$"
  token_gh
  if ! modelos_de_la_tarea; then
    trabar "$ID" "la spec tiene un error: $MOTIVO_MODELO. Cámbiala (en el issue, el bloque yaml) y responde para retomarla."
    exit 0
  fi
  # El turno se toma antes de preparar nada (un carril de Docker que después no puede correr) y se sostiene hasta salir.
  tomar_turno || { volver "sin turno en la máquina"; exit 0; }
  # Otro orquestador pudo llegar al límite del plan entre que el bucle miró y ahora.
  local hasta
  if hasta=$(pausa_compartida_hasta); then volver "pausa compartida por el límite del plan hasta las $(date -d "@$hasta" '+%H:%M')"; exit 0; fi
  log "$ID: turno $TURNO de $TURNOS de la máquina"
  log "$ID: empieza ($PREVIO) en $WT"
  case "$PREVIO" in
    por_arreglar) comentar "$ID" "arreglo el PR #$(est_get "$ID" pr): $(head -n 1 "$EST/$ID/motivo.md" 2>/dev/null)" >/dev/null ;;
    por_retomar) comentar "$ID" "retomo la tarea: $(est_get "$ID" motivo_retomar)" >/dev/null ;;
    *) comentar "$ID" "empiezo la tarea en la rama \`$RAMA\`." >/dev/null ;;
  esac

  preparar_worktree || exit 0
  preparar_carril || exit 0

  case "$PREVIO" in
    por_arreglar) sesion arreglar || exit 0 ;;
    *)
      if [ "$(campo "$SPEC" planificar)" = si ] && [ ! -s "$EST/$ID/plan.md" ]; then
        planificar || exit 0
      fi
      if [ "$PREVIO" = por_retomar ]; then sesion retomar || exit 0; else sesion tarea || exit 0; fi
      ;;
  esac
  despues_de_la_sesion
}

modelos_de_la_tarea() { # deja MODELO_PLAN y MODELO_SESION (niveles.sh), o MOTIVO_MODELO y devuelve 1
  elegir_modelo "$SPEC" _plan "$NIVEL_PLANIFICAR" || return 1
  MODELO_PLAN=$ELEGIDO
  elegir_modelo "$SPEC" "" "$NIVEL_EJECUTAR" || return 1
  MODELO_SESION=$ELEGIDO
}

volver() { # deja la tarea como estaba antes de lanzarla (sin gastar intentos)
  est_set "$ID" estado "${PREVIO:-pendiente}"
  log "$ID: vuelve a $PREVIO ($1)"
}

preparar_worktree() {
  if [ -e "$WT/.git" ]; then return 0; fi
  if ! git -C "$REPO" fetch -q origin main 2>>"$EST/$ID/correr.log"; then
    est_set "$ID" espera_carril_hasta $(($(date +%s) + 300))
    volver "no se pudo hacer git fetch (¿sin red?)"
    return 1
  fi
  git -C "$REPO" worktree prune >/dev/null 2>&1
  if git -C "$REPO" show-ref -q --verify "refs/heads/$RAMA"; then
    git -C "$REPO" worktree add -q "$WT" "$RAMA"
  elif git -C "$REPO" fetch -q origin "$RAMA" 2>/dev/null; then
    git -C "$REPO" worktree add -q -b "$RAMA" "$WT" FETCH_HEAD
  else
    git -C "$REPO" worktree add -q -b "$RAMA" "$WT" origin/main
  fi 2>>"$EST/$ID/correr.log" || {
    # Casi siempre es la máquina (disco o /tmp llenos), no la tarea: se reintenta como un preparar.sh que cayó, sin trabarla a la primera.
    [ -d "$WT" ] && [ ! -e "$WT/.git" ] && rm -rf "$WT"
    git -C "$REPO" worktree prune >/dev/null 2>&1
    sumar "$ID" fallos_carril
    if [ "$(num "$ID" fallos_carril)" -ge 3 ]; then
      trabar "$ID" "No se pudo crear el worktree $WT para la rama $RAMA 3 veces (mira .orquestador/estado/$ID/correr.log)."
    else
      est_set "$ID" espera_carril_hasta $(($(date +%s) + 300))
      volver "no se pudo crear el worktree (intento $(num "$ID" fallos_carril)); se reintenta en 5 min"
    fi
    return 1
  }
  local f d
  for f in $INCLUIR; do [ -f "$REPO/$f" ] && cp -p "$REPO/$f" "$WT/$f"; done
  for d in $COMPARTIDAS; do
    if [ -e "$REPO/$d" ] && [ ! -e "$WT/$d" ]; then mkdir -p "$(dirname "$WT/$d")" && ln -s "$REPO/$d" "$WT/$d"; fi
  done
  log "$ID: worktree creado en la rama $RAMA"
}

preparar_carril() {
  local salida rc
  # `9>&-`: lo que preparar.sh deje corriendo no retiene el turno de la máquina.
  salida=$(cd "$WT" && bash scripts/worktree/preparar.sh 2>&1 9>&-)
  rc=$?
  printf '%s\n%s\n' "--- $(date '+%F %T')" "$salida" >>"$EST/$ID/preparar.log"
  [ "$rc" = 0 ] && { est_del "$ID" fallos_carril; return 0; }
  if grep -q 'tres carriles' <<<"$salida"; then
    est_set "$ID" espera_carril_hasta $(($(date +%s) + 180))
    volver "los tres carriles están ocupados (¿tienes uno abierto con Orca?)"
    return 1
  fi
  # Un preparar.sh que cayó a mitad dejó `.env.carril`: esa letra seguiría contando como usada y las demás tareas verían «los tres
  # carriles ocupados» sin que nadie los use. Se suelta (baja lo que haya quedado de su stack) antes de volver a la cola.
  soltar_carril
  sumar "$ID" fallos_carril
  if [ "$(num "$ID" fallos_carril)" -ge 3 ]; then
    trabar "$ID" "preparar.sh falló 3 veces (Docker, Supabase o pnpm). Mira .orquestador/estado/$ID/preparar.log."
  else
    est_set "$ID" espera_carril_hasta $(($(date +%s) + 300))
    volver "preparar.sh falló (intento $(num "$ID" fallos_carril)); se reintenta en 5 min"
  fi
  return 1
}

soltar_carril() { [ -f "$WT/.env.carril" ] && (cd "$WT" && bash scripts/worktree/quitar.sh >>"$EST/$ID/preparar.log" 2>&1 9>&-); return 0; }

reemplazar() { # plantilla → prompt (las llaves {{X}} se reemplazan)
  local t
  t=$(<"$1")
  # Lo que la spec permite (`permite: dependencias`): un párrafo que levanta el «cambiar dependencias» de «No hagas». Va antes que
  # la spec y el plan, que podrían nombrar la llave como texto.
  local permite=""
  if [[ " $(campo "$SPEC" permite | tr ',' ' ') " == *" dependencias "* ]]; then
    permite=$(<"$PROMPTS/permite-dependencias.md")$'\n\n'
  fi
  t=${t//$'{{PERMITE}}\n'/$permite}
  t=${t//'{{ID}}'/$ID}
  t=${t//'{{TITULO}}'/$TITULO}
  t=${t//'{{RAMA}}'/$RAMA}
  t=${t//'{{WT}}'/$WT}
  t=${t//'{{PR}}'/$(est_get "$ID" pr)}
  t=${t//'{{FECHA}}'/$(TZ=America/La_Paz date +%F)}
  t=${t//'{{CONTEXTO}}'/${CONTEXTO:-}}
  t=${t//'{{PROMPT}}'/${PROMPT_ARCHIVO:-}}
  t=${t//'{{PLAN}}'/$(if [ -s "$EST/$ID/plan.md" ]; then cat "$EST/$ID/plan.md"; else echo "(Esta tarea no lleva plan previo: planifica tú mismo antes de tocar código.)"; fi)}
  t=${t//'{{MOTIVO}}'/$(cat "$EST/$ID/motivo.md" 2>/dev/null)}
  t=${t//'{{SPEC}}'/$(cuerpo "$SPEC")}
  # Con la cola en issues, el PR cierra el issue de la tarea (`Closes #<n>`); sólo local, no hay nada que cerrar.
  local cierra=""
  if con_issues && [ -n "$(est_get "$ID" issue)" ]; then
    cierra=$(<"$PROMPTS/cierra-issue.md") && cierra="${cierra//'{{N}}'/$(est_get "$ID" issue)}"$'\n'
  fi
  t=${t//$'{{CIERRA_ISSUE}}\n'/$cierra}
  printf '%s\n' "$t"
}

# El tope de contexto de una sesión (AUTOCOMPACT_SESION) como argumentos de `claude -p`: nada si está vacío o no es un número de 100000 a
# 1000000 (`verificar` lo dice). Lo usan las sesiones de aquí y la redacción de un pedido (pedidos.sh).
autocompact_valido() { [[ "${AUTOCOMPACT_SESION:-}" =~ ^[0-9]+$ ]] && [ "$AUTOCOMPACT_SESION" -ge 100000 ] && [ "$AUTOCOMPACT_SESION" -le 1000000 ]; }
args_autocompact() { autocompact_valido && printf '%s\n%s\n' --autocompact "$AUTOCOMPACT_SESION"; return 0; }

# Corre `claude -p` y deja la salida (stream-json) en estado/<ID>/. Devuelve 0 si la sesión terminó; 1 si hay que cortar aquí
# (límite del plan o tiempo agotado: la tarea ya quedó en el estado que corresponde).
claude_en_el_worktree() { # nombre modelo effort modo prompt_archivo [args extra…]
  local nombre=$1 modelo=$2 effort=$3 modo=$4 prompt=$5
  shift 5
  local salida="$EST/$ID/$nombre.jsonl" rc compacta=()
  mapfile -t compacta < <(args_autocompact)
  ln -sfn "$salida" "$EST/$ID/sesion-actual.jsonl"
  log "$ID: sesión $nombre ($modelo · $effort · $modo${PERMITE_SESION:+ · permite $PERMITE_SESION})"
  # ORQ_PERMITE siempre explícito (vacío si la spec no permite nada): el hook de Bash lo lee del entorno del proceso `claude`, y el
  # del servicio no se hereda.
  (cd "$WT" && ORQ_PERMITE="${PERMITE_SESION:-}" timeout --kill-after=120 "${TIEMPO_MAX_SESION:-5h}" \
    claude -p --model "$modelo" --effort "$effort" --permission-mode "$modo" "${compacta[@]}" \
    --output-format stream-json --verbose "$@" <"$prompt") >"$salida" 2>"$salida.err" 9>&-
  # (`9>&-`: un proceso que la sesión deje vivo no retiene el turno de la máquina.)
  rc=$?
  RESULTADO_JSON=$(jq -c 'select(.type == "result")' "$salida" 2>/dev/null | tail -n 1)
  local rj=${RESULTADO_JSON:-'{}'} es_error
  RESULTADO_TEXTO=$(jq -r '.result // ""' <<<"$rj" 2>/dev/null)
  es_error=$(jq -r '.is_error // false' <<<"$rj" 2>/dev/null)

  if [ "$rc" = 124 ] || [ "$rc" = 137 ]; then
    soltar_carril
    retomar_luego "La sesión anterior ($nombre) se pasó de ${TIEMPO_MAX_SESION} y se cortó."
    return 1
  fi
  if { [ "$rc" != 0 ] || [ "$es_error" = true ] || [ -z "$RESULTADO_JSON" ]; } && es_limite_del_plan "$salida"; then
    soltar_carril
    est_set "$ID" motivo_retomar "La sesión anterior ($nombre) se cortó por el límite del plan de Claude."
    est_set "$ID" estado "$([ "$PREVIO" = por_arreglar ] && echo por_arreglar || echo por_retomar)"
    pausar_por_limite "$ID"
    return 1
  fi
  if [ "$rc" != 0 ] && [ -z "$RESULTADO_JSON" ]; then
    soltar_carril
    retomar_luego "La sesión anterior ($nombre) terminó con error $rc sin resultado: $(tail -n 3 "$salida.err" | tr '\n' ' ')"
    return 1
  fi
  return 0
}

# La salida de una sesión (el stream-json y su .err) dice que llegó al límite del plan de Claude. La usan esta sesión y la redacción
# de un pedido (pedidos.sh).
ES_LIMITE='usage limit|limit reached|hit your limit|limit will reset|resets at|out of (extra )?usage|rate[ _-]?limit'
es_limite_del_plan() { # salida
  grep -qiE "$ES_LIMITE" "$1.err" <(tail -n 5 "$1")
}

# El límite es de la cuenta: la pausa es de todos los orquestadores de la máquina (si otro puso una más tardía, queda ésa).
pausar_por_limite() { # quien (lo que se cortó, para el aviso)
  local hasta=$(($(date +%s) + ${PAUSA_POR_LIMITE_MIN:-30} * 60))
  fijar_pausa_compartida "$hasta" || log "no se pudo escribir la pausa compartida ($PAUSA_COMPARTIDA)"
  hasta=$(pausa_compartida_hasta) || hasta=$(($(date +%s) + ${PAUSA_POR_LIMITE_MIN:-30} * 60))
  avisar "Pausa: límite del plan" "$1 se cortó por el límite de Claude. Reintento a las $(date -d "@$hasta" '+%H:%M') (vale para todos los orquestadores de la máquina)." low hourglass
}

# Con la pausa compartida por el límite en curso, cada PROBAR_PAUSA_MIN minutos una pregunta mínima al modelo capaz (el de casi todas
# las sesiones): si responde, el límite ya pasó o la cuenta cambió de plan, y la pausa se quita para todos sin esperar a que venza.
probar_fin_de_pausa() {
  local ult modelo salida
  [ "${PROBAR_PAUSA_MIN:-5}" -gt 0 ] || return 0
  pausa_compartida_hasta >/dev/null || return 0
  ult=$(cat "$EST/.pausa-probada" 2>/dev/null)
  [ "$(date +%s)" -ge $((${ult:-0} + ${PROBAR_PAUSA_MIN:-5} * 60)) ] || return 0
  date +%s >"$EST/.pausa-probada"
  modelo=$(modelo_de_nivel capaz) || return 0
  # Fuera del repo: la prueba no carga los hooks ni el CLAUDE.md del proyecto.
  mkdir -p "$TMP_TAREAS"
  salida=$(cd "$TMP_TAREAS" && timeout 120 claude -p --model "$modelo" "Responde sólo: ok" 2>&1 </dev/null) || return 0
  grep -qiE "$ES_LIMITE" <<<"$salida" && return 0
  quitar_pausa_compartida
  log "el modelo $modelo volvió a responder: quito la pausa por el límite del plan antes de que venza"
  avisar "Fin de la pausa" "Claude volvió a responder: sigo lanzando sin esperar a que venza la pausa." low arrow_forward
}

retomar_luego() {
  sumar "$ID" retomas
  if [ "$(num "$ID" retomas)" -gt "${MAX_RETOMAS:-3}" ]; then
    trabar "$ID" "Se retomó ${MAX_RETOMAS} veces sin publicar. Último motivo: $1"
  else
    est_set "$ID" motivo_retomar "$1"
    est_set "$ID" estado por_retomar
    log "$ID: para retomar ($(num "$ID" retomas)/${MAX_RETOMAS}): $1"
  fi
}

planificar() {
  local p="$EST/$ID/prompt-plan.md" modelo=$MODELO_PLAN effort
  effort=$(campo "$SPEC" effort_plan); effort=${effort:-$EFFORT_PLANIFICAR}
  PERMITE_SESION="" # el plan sólo lee: ningún permiso
  PROMPT_ARCHIVO=$p
  reemplazar "$PROMPTS/planificar.md" >"$p"
  claude_en_el_worktree plan "$modelo" "$effort" plan "$p" --disallowedTools ExitPlanMode || return 1
  if [ "${#RESULTADO_TEXTO}" -lt 800 ]; then
    soltar_carril
    retomar_luego "La sesión de plan devolvió un plan vacío o demasiado corto."
    return 1
  fi
  printf '%s\n' "$RESULTADO_TEXTO" >"$EST/$ID/plan.md"
  log "$ID: plan escrito (${#RESULTADO_TEXTO} caracteres)"
}

contexto_retomar() { # retomar.md con el motivo y la respuesta de la persona a la trabada, si la hay
  local t respuesta="(Esta retoma no viene de una respuesta de la persona.)"
  [ -s "$EST/$ID/respuesta.md" ] && respuesta=$(<"$EST/$ID/respuesta.md")
  t=$(<"$PROMPTS/retomar.md")
  t=${t//'{{MOTIVO_RETOMAR}}'/$(est_get "$ID" motivo_retomar)}
  printf '%s' "${t//'{{RESPUESTA}}'/$respuesta}"
}

sesion() { # tarea | retomar | arreglar
  local tipo=$1 p modelo effort n
  n=$(($(num "$ID" sesiones) + 1))
  est_set "$ID" sesiones "$n"
  p="$EST/$ID/prompt-$n-$tipo.md"
  PROMPT_ARCHIVO=$p
  modelo=$MODELO_SESION
  effort=$(campo "$SPEC" effort); effort=${effort:-$EFFORT_EJECUTAR}
  PERMITE_SESION=$(campo "$SPEC" permite)
  CONTEXTO=""
  case "$tipo" in
    retomar)
      CONTEXTO=$(contexto_retomar)
      reemplazar "$PROMPTS/tarea.md" >"$p"
      # La respuesta de la persona va en esta retoma; en la siguiente, si la hay, ya está en la spec.
      [ -s "$EST/$ID/respuesta.md" ] && mv "$EST/$ID/respuesta.md" "$EST/$ID/respuesta-usada-$n.md"
      ;;
    arreglar)
      if [ "$(num "$ID" arreglos)" -ge 3 ]; then
        modelo=$(modelo_de_nivel "$NIVEL_ARREGLAR_DIFICIL") || modelo=$MODELO_SESION
        effort=$EFFORT_ARREGLAR_DIFICIL
      fi
      reemplazar "$PROMPTS/arreglar.md" >"$p"
      ;;
    *) reemplazar "$PROMPTS/tarea.md" >"$p" ;;
  esac
  local extra=()
  [ -n "${HERRAMIENTAS_EXTRA:-}" ] && extra=(--allowedTools "$HERRAMIENTAS_EXTRA")
  claude_en_el_worktree "sesion-$n-$tipo" "$modelo" "$effort" "${MODO_EJECUTAR:-auto}" "$p" "${extra[@]}"
}

despues_de_la_sesion() {
  local linea pr local_head remoto
  linea=$(grep -oE 'RESULTADO: (PUBLICADO #[0-9]+|TRABADA.*|AJENO.*)' <<<"$RESULTADO_TEXTO" | tail -n 1)
  soltar_carril

  # Un e2e que cae también en main: la tarea espera a su urgente (ajeno-de-main.sh); si el AJENO no vale, es una trabada.
  if [[ "$linea" == "RESULTADO: AJENO"* ]]; then
    ajeno_de_la_sesion "$ID" "$linea" || trabar "$ID" "$AJENO_MOTIVO"
    return
  fi

  if [[ "$linea" == "RESULTADO: TRABADA"* ]]; then
    trabar "$ID" "${linea#RESULTADO: }"
    return
  fi

  pr=$(ghr pr list --head "$RAMA" --state open --json number --jq '.[0].number // empty' 2>/dev/null)
  git -C "$WT" fetch -q origin "$RAMA" 2>/dev/null
  local_head=$(git -C "$WT" rev-parse HEAD 2>/dev/null)

  # Un PR chico puede integrarse antes de que esta función mire: ya no está abierto y GitHub borró su rama. Si el PR integrado
  # es el de esta punta y no quedó nada sin commitear, la tarea terminó: no se retoma.
  if [ -z "$pr" ] && [ -n "$local_head" ] && [ -z "$(git -C "$WT" status --porcelain 2>/dev/null)" ]; then
    local hecho
    hecho=$(ghr pr list --head "$RAMA" --state merged --json number,headRefOid \
      --jq "[.[] | select(.headRefOid == \"$local_head\")][0].number // empty" 2>/dev/null)
    if [ -n "$hecho" ]; then
      est_set "$ID" pr "$hecho"
      est_del "$ID" motivo_retomar
      log "$ID: el PR #$hecho ya estaba integrado al terminar la sesión"
      integrada "$ID" "$hecho"
      return
    fi
  fi
  remoto=$(git -C "$WT" rev-parse "origin/$RAMA" 2>/dev/null || true)

  if [ -n "$pr" ] && [ "$local_head" = "$remoto" ] && [ -z "$(git -C "$WT" status --porcelain 2>/dev/null)" ]; then
    est_set "$ID" pr "$pr"
    est_set "$ID" estado esperando_ci
    est_del "$ID" motivo_retomar
    log "$ID: publicado, PR #$pr esperando al CI"
    if [ "$(est_get "$ID" pr_comentado)" != "$pr" ]; then
      comentar "$ID" "abrí el PR #$pr (https://github.com/$REPO_GH/pull/$pr): se integra solo cuando el CI quede en verde." >/dev/null
      est_set "$ID" pr_comentado "$pr"
    fi
    return
  fi
  local por_que="La sesión anterior terminó sin dejar el PR publicado y al día."
  [ -z "$pr" ] && por_que="$por_que No hay PR abierto para $RAMA."
  [ -n "$pr" ] && [ "$local_head" != "$remoto" ] && por_que="$por_que La rama local tiene commits sin empujar."
  [ -n "$(git -C "$WT" status --porcelain 2>/dev/null)" ] && por_que="$por_que Quedaron cambios sin commitear."
  [ -n "$pr" ] && est_set "$ID" pr "$pr"
  if [ "$PREVIO" = por_arreglar ]; then
    printf '%s\n\n(%s)\n' "$(cat "$EST/$ID/motivo.md" 2>/dev/null)" "$por_que" >"$EST/$ID/motivo.md"
    sumar "$ID" arreglos
    if [ "$(num "$ID" arreglos)" -gt "${MAX_ARREGLOS:-4}" ]; then trabar "$ID" "$por_que"; else est_set "$ID" estado por_arreglar; fi
  else
    retomar_luego "$por_que"
  fi
}

# --------------------------------------------------------------------------------------------------------------- comandos

cmd_estado() {
  local id s pr extra lleno
  cola_invalida
  printf '%-4s %-13s %-6s %-5s %s\n' ID ESTADO PR INT TÍTULO
  for id in $(ids); do
    s=$(estado_de "$id")
    pr=$(est_get "$id" pr)
    extra=""
    [ "$s" = corriendo ] && ! vivo "$id" && extra=" (proceso muerto)"
    [ "$s" = esperando_ci ] && extra=$(linea_de_espera "$id")
    printf '%-4s %-13s %-6s %-5s %s%s\n' "$id" "$s" "${pr:+#$pr}" "$(num "$id" retomas)/$(num "$id" arreglos)" \
      "$(campo "$(spec_de "$id")" titulo | cut -c1-70)" "$extra"
  done
  echo
  leer_turnos
  echo "Turnos de la máquina: $(turnos_libres) de $TURNOS libres${TURNOS_AVISO:+ ($TURNOS_AVISO)}."
  if [ -f "$EST/.pausa-manual" ]; then echo "⏸  En pausa manual (bash scripts/orquestador/orquestador.sh reanudar)."; fi
  linea_de_pausa
  if lleno=$(sin_lugar); then echo "⛔ Máquina sin lugar, no lanza tareas: $lleno."; fi
  echo "INT = retomas/arreglos. Trabadas: el motivo está en .orquestador/estado/<ID>/trabada.md"
}

# Las tareas de la cola que el cuerpo de una spec nombra («igual que T33», «usa lo de T33») sin tenerlas en `depende`: arrancaría sin
# lo que necesita y chocaría al integrar (en una tanda costó un arreglo y casi una hora). `plan` lo avisa; no frena.
nombra_sin_depender() { # spec → ids separados por espacio, o nada
  local f=$1 propio deps t salida=""
  propio=$(campo "$f" id)
  deps=" $(campo "$f" depende) "
  for t in $(cuerpo "$f" | grep -oE '\bT[0-9]+\b' | sort -uV); do
    [ "$t" = "$propio" ] && continue
    [[ "$deps" == *" $t "* ]] && continue
    spec_de "$t" >/dev/null || continue
    salida="$salida $t"
  done
  echo "${salida# }"
}

cmd_plan() {
  local id s quien motivo libres sin_turno="" lleno nombra
  leer_turnos
  libres=$(turnos_libres)
  echo "$PROYECTO · turnos de la máquina: $libres de $TURNOS libres · paralelo $PARALELO"
  [ -n "$TURNOS_AVISO" ] && echo "⚠ $TURNOS_AVISO"
  linea_de_pausa
  [ -f "$EST/.pausa-manual" ] && echo "⏸  en pausa manual: no lanza nuevas (bash scripts/orquestador/orquestador.sh reanudar)"
  motivo=$(motivo_para_no_tocar_la_principal) && echo "· $motivo"
  if lleno=$(sin_lugar); then echo "⛔ Máquina sin lugar, no lanza tareas: $lleno."; fi
  [ "$libres" = 0 ] && sin_turno="espera: sin turno en la máquina ($TURNOS de $TURNOS ocupados: $(turnos_ocupados_por))"
  cola_invalida
  for id in $(ids); do
    s=$(estado_de "$id")
    case "$s" in
      pendiente)
        if borrador "$(spec_de "$id")"; then
          echo "$id  borrador (quita «borrador: si» o la etiqueta cola:borrador del issue cuando la spec esté lista)"
        elif motivo=$(error_de_modelo "$(spec_de "$id")"); then echo "$id  spec con error: $motivo"
        elif ! FRESCO=1 deps_listas "$(spec_de "$id")"; then echo "$id  espera dependencias:$DEPS_FALTAN"
        elif quien=$(llave_ocupada_por "$id"); then echo "$id  espera el área que ocupa $quien"
        elif [ -n "$sin_turno" ]; then echo "$id  $sin_turno"
        else echo "$id  LISTA para lanzar"; fi
        nombra=$(nombra_sin_depender "$(spec_de "$id")")
        [ -z "$nombra" ] || echo "    ⚠ nombra $nombra y no depende de ella: si usa lo que esa tarea hace, súmala a «depende»"
        ;;
      por_arreglar | por_retomar)
        if quien=$(llave_ocupada_por "$id" retomando); then echo "$id  $s, espera el área que ocupa $quien"; else echo "$id  $s"; fi
        ;;
      *) echo "$id  $s$(linea_de_espera "$id")$(linea_al_integrar "$id")$(linea_aviso_kit "$id")" ;;
    esac
  done
  # Un issue que nunca se pudo leer no tiene archivo en la cola, pero tampoco se lanza: se nombra igual.
  local f
  for f in "$EST"/T*/issue-roto; do
    [ -e "$f" ] || continue
    id=$(basename "$(dirname "$f")")
    spec_de "$id" >/dev/null || echo "$id  borrador (su issue no se lee: el motivo está en el comentario del orquestador)"
  done
  # Los pedidos en texto libre que se están redactando como spec (pedidos.sh).
  for f in "$EST"/P*/estado; do
    [ -e "$f" ] && linea_de_pedido "$(basename "$(dirname "$f")")"
  done
  return 0
}

cmd_prompt() { # lo que recibiría ahora la sesión de ejecutar de una tarea (no lanza nada)
  ID=$1
  SPEC=$(spec_de "$ID") || { echo "no existe $ID" >&2; exit 64; }
  RAMA=$(campo "$SPEC" rama)
  TITULO=$(campo "$SPEC" titulo)
  WT="$WTS/$ID"
  CONTEXTO=""
  PROMPT_ARCHIVO="$EST/$ID/prompt-$(($(num "$ID" sesiones) + 1))-tarea.md"
  [ "$(estado_de "$ID")" = por_retomar ] && CONTEXTO=$(contexto_retomar)
  reemplazar "$PROMPTS/tarea.md"
}

cmd_ver() {
  local f="$EST/$1/sesion-actual.jsonl"
  [ -e "$f" ] || { echo "$1 no tiene sesión todavía." >&2; exit 1; }
  echo "Siguiendo $(readlink -f "$f") (Ctrl+C para salir)…"
  tail -n +1 -F "$f" | jq --unbuffered -r '
    if .type == "assistant" then (.message.content[]? | if .type == "text" then "💬 " + .text elif .type == "tool_use" then "🔧 " + .name + " " + ((.input.command // .input.file_path // .input.pattern // .input.description // "") | tostring | .[0:160]) else empty end)
    elif .type == "result" then "🏁 " + (.result // "" | .[-400:])
    else empty end' 2>/dev/null
}

cmd_reintentar() {
  spec_de "$1" >/dev/null || { echo "no existe $1" >&2; exit 64; }
  reintentar_tarea "$1" "La persona pidió reintentar esta tarea después de que quedó trabada. Revisa qué quedó hecho y termínala."
  echo "$1 → $(estado_de "$1")"
}

reintentar_tarea() { # ID motivo-para-retomar
  local id=$1
  est_set "$id" retomas 0
  est_set "$id" arreglos 0
  est_del "$id" choques
  est_del "$id" ajenos
  ajeno_olvidar "$id"
  est_del "$id" fallos_carril
  est_del "$id" espera_carril_hasta
  rm -f "$EST/$id/trabada.md"
  if [ -n "$(est_get "$id" pr)" ] && [ -s "$EST/$id/motivo.md" ]; then
    est_set "$id" estado por_arreglar
  elif [ -e "$WTS/$id/.git" ]; then
    est_set "$id" motivo_retomar "$2"
    est_set "$id" estado por_retomar
  else
    est_set "$id" estado pendiente
  fi
}

cortar_sesion() { # corta la sesión en curso de una tarea y suelta su carril
  local id=$1 p
  p=$(est_get "$id" pid)
  # setsid le dio su propia sesión: se corta todo lo que cuelga de ella (timeout y claude incluidos).
  [ -n "$p" ] && pkill -TERM -s "$p" 2>/dev/null
  sleep 3
  [ -n "$p" ] && pkill -KILL -s "$p" 2>/dev/null
  [ -f "$WTS/$id/.env.carril" ] && (cd "$WTS/$id" && bash scripts/worktree/quitar.sh)
  return 0
}

cmd_parar() {
  local id=$1
  cortar_sesion "$id"
  est_set "$id" motivo_retomar "La persona cortó la sesión anterior a mano."
  est_set "$id" estado por_retomar
  echo "$id cortada; queda para retomar (bash scripts/orquestador/orquestador.sh pausar si no quieres que vuelva a arrancar)."
}

cmd_verificar() {
  local ok=1 c d id f lleno
  echo "== Herramientas"
  for c in git gh jq claude pnpm node docker flock timeout setsid curl; do
    if command -v "$c" >/dev/null; then echo "✓ $c"; else echo "✗ falta $c ($(paquete_de "$c"))"; ok=0; fi
  done
  claude --version 2>/dev/null | sed 's/^/  claude /'
  claude --help 2>/dev/null | grep -q -- '--effort' || { echo "✗ tu claude no tiene --effort: claude update"; ok=0; }
  if [ -z "${AUTOCOMPACT_SESION:-}" ]; then
    echo "· AUTOCOMPACT_SESION vacío: las sesiones no compactan hasta el tope de la ventana (contexto caro en las largas)"
  elif autocompact_valido; then
    if claude --help 2>/dev/null | grep -q -- '--autocompact'; then echo "✓ las sesiones compactan su contexto a $AUTOCOMPACT_SESION tokens (--autocompact)"
    else echo "✗ tu claude no tiene --autocompact: claude update (o AUTOCOMPACT_SESION vacío en config.local.env)"; ok=0; fi
  else
    echo "✗ AUTOCOMPACT_SESION=\"$AUTOCOMPACT_SESION\" no es un número de 100000 a 1000000: no se pasa --autocompact"; ok=0
  fi
  echo "== Repo ($PROYECTO)"
  if [ -d "$REPO/.git" ]; then echo "✓ $REPO"; else echo "✗ no hay repo en $REPO"; ok=0; fi
  git -C "$REPO" check-ignore -q "$DATOS/estado" 2>/dev/null || [ "${DATOS#"$REPO"/}" = "$DATOS" ] ||
    { echo "✗ $DATOS está dentro del repo y git no lo ignora (.gitignore)"; ok=0; }
  echo "✓ datos en $DATOS"
  for f in $INCLUIR; do [ -f "$REPO/$f" ] && echo "✓ $f" || echo "· falta $f en la principal (preparar.sh puede quejarse)"; done
  # Una sesión en un worktree pide el trust de la principal: sin él, `claude -p` ignora los permissions.allow del proyecto.
  if jq -e --arg r "$(cd "$REPO" && pwd -P)" '.projects[$r].hasTrustDialogAccepted == true' "$HOME/.claude.json" >/dev/null 2>&1; then
    echo "✓ la principal es de confianza para Claude Code (las sesiones leen los permissions.allow del proyecto)"
  else
    echo "✗ la principal no es de confianza para Claude Code: las sesiones ignoran los permissions.allow de .claude/settings.json." \
      "Abre claude una vez en $REPO y acepta, o pon projects[\"$REPO\"].hasTrustDialogAccepted: true en ~/.claude.json"
    ok=0
  fi
  echo "== GitHub"
  token_gh
  if app_configurada; then verificar_app || ok=0
  elif ghr api user --jq .login >/dev/null 2>&1; then echo "✓ gh con la cuenta $(ghr api user --jq .login)"; else echo "✗ gh sin sesión para $(dueno_del_repo) (gh auth login)"; ok=0; fi
  verificar_login_app || ok=0
  if [ "$(ghr api 'repos/{owner}/{repo}' --jq .allow_auto_merge 2>/dev/null)" = true ]; then echo "✓ auto-merge permitido en el repo"; else echo "✗ el repo no permite auto-merge"; ok=0; fi
  # No frena: sin la cola, el auto-merge integra como siempre (el kit decide si es opcional).
  if [ "$(cd "$REPO" && cola_activa)" = true ]; then echo "✓ main exige la cola de integración"
  else echo "· main no exige la cola de integración: el PR entra sin probarse combinado (docs/FLUJO.md › «GitHub»)"; fi
  echo "== Cola en los issues"
  if [ "${ORQ_SOLO_LOCAL:-0}" = 1 ]; then
    echo "· ORQ_SOLO_LOCAL=1: la cola es sólo local (.orquestador/cola/)"
  elif [ -z "$REPO_GH" ]; then
    echo "✗ el remoto origin no es de GitHub: la cola queda sólo local"; ok=0
  elif asegurar_etiquetas; then
    echo "✓ issues de $REPO_GH con las etiquetas $ETIQUETAS_COLA y las de lo que entra solo: $ETIQUETAS_ENTRADA"
  else
    echo "✗ no se pudieron crear las etiquetas de la cola en $REPO_GH: $(cat "$EST/.gh-ultimo-error" 2>/dev/null)"; ok=0
  fi
  echo "== Docker"
  if docker info >/dev/null 2>&1; then echo "✓ docker responde"; else echo "✗ docker no responde"; ok=0; fi
  free -g 2>/dev/null | awk '/Mem:/ {print "  RAM: " $2 " GB en total, " $7 " GB disponibles (cada carril con Supabase y un e2e ronda 3-4 GB)"}'
  echo "== Lugar (/tmp, el repo y las carpetas temporales; tope: ${MIN_LIBRE_PCT:-5} % libre)"
  if lleno=$(sin_lugar); then echo "✗ $lleno"; ok=0; else echo "✓ hay lugar"; fi
  verificar_maquina || ok=0
  verificar_niveles || ok=0
  echo "== Claude (una llamada mínima)"
  if echo 'Responde exactamente: ok' | claude -p --model "$(modelo_de_nivel normal || echo sonnet)" --effort low --permission-mode "${MODO_EJECUTAR:-auto}" --output-format json 2>/dev/null | jq -e '.result | test("ok"; "i")' >/dev/null; then
    echo "✓ claude -p responde en modo ${MODO_EJECUTAR:-auto}"
  else
    echo "✗ claude -p no respondió en modo ${MODO_EJECUTAR:-auto} (¿sesión iniciada? ¿tu versión tiene ese modo? prueba MODO_EJECUTAR=acceptEdits)"; ok=0
  fi
  echo "== Cola"
  cola_invalida || ok=0
  for id in $(ids); do
    f=$(spec_de "$id")
    [[ -n "$(campo "$f" rama)" && -n "$(campo "$f" titulo)" ]] || { echo "✗ $id sin rama o título"; ok=0; }
    for d in $(campo "$f" depende); do
      case "$d" in
        T[0-9]*) ;;
        ?*:?*) [ -n "$(repo_de_nombre "${d%%:*}")" ] || { echo "✗ $id depende de $d: no sé qué repo es «${d%%:*}»"; ok=0; } ;;
        *) echo "✗ $id depende de «$d»: va T<n> o <repo>:<rama>"; ok=0 ;;
      esac
    done
  done
  echo "✓ $(ids | wc -w) tareas leídas"
  echo "== Estado del repo (scripts/flujo/estado.sh: un PR abierto o un CI en rojo van antes que la cola)"
  (cd "$REPO" && bash scripts/flujo/estado.sh 2>&1 | sed 's/^/  /') || true
  echo "== Aviso de prueba"
  avisar "Orquestador $PROYECTO" "Aviso de prueba: si lo ves en el celular, ntfy funciona." low test_tube
  echo "  (mira el celular)"
  echo
  if [ "$ok" = 1 ]; then echo "Todo listo."; else echo "Hay cosas que arreglar arriba."; exit 1; fi
}

cmd_nueva() { # tema (con la cola en issues) | ID tema (ORQ_SOLO_LOCAL=1)
  con_issues && { nueva_en_issues "$@"; return; }
  local id=${1:-} tema=${2:-} f
  [[ "$id" =~ ^T[0-9]+$ && -n "$tema" ]] || { echo "uso (cola sólo local): nueva T23 tema-en-kebab" >&2; exit 64; }
  spec_de "$id" >/dev/null && { echo "ya existe $(spec_de "$id")" >&2; exit 64; }
  f="$COLA/$id-$tema.md"
  [[ "$tema" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "el tema va en kebab (minúsculas, números y guiones): $tema" >&2; exit 64; }
  sed -e "1a id: $id" -e "s/{{TEMA}}/$tema/g" "$ORQ/plantilla-tarea.md" >"$f"
  # La plantilla tiene que haber dejado una spec que el bucle lea: si un formateador le tocó los marcadores, se dice aquí y no al lanzar.
  if ! id_valido "$f" || grep -q '{{' "$f"; then
    rm -f "$f"
    echo "✗ scripts/orquestador/plantilla-tarea.md está dañada: no dejó «id: $id» o le quedaron marcadores {{…}} sin reemplazar." >&2
    exit 70
  fi
  echo "Escribe la spec en $f y quita la línea «borrador: si»: recién entonces el orquestador la toma."
}

nueva_en_issues() { # tema — la spec en borrador va a la entrada y se publica ya como issue (sin red, en la vuelta siguiente)
  local tema=${1:-} f spec
  [[ -n "$tema" && -z "${2:-}" ]] || { echo "uso: nueva tema-en-kebab (el id es el número del issue que se crea)" >&2; exit 64; }
  [[ "$tema" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "el tema va en kebab (minúsculas, números y guiones): $tema" >&2; exit 64; }
  mkdir -p "$DATOS/entrada"
  f="$DATOS/entrada/$tema.md"
  [ -e "$f" ] && { echo "ya existe $f" >&2; exit 64; }
  sed -e "s/{{TEMA}}/$tema/g" "$ORQ/plantilla-tarea.md" >"$f"
  if grep -q '{{' "$f" || ! node "$SPEC_ISSUE" a-issue "$f" >/dev/null 2>&1; then
    rm -f "$f"
    echo "✗ scripts/orquestador/plantilla-tarea.md está dañada: le quedaron marcadores {{…}} o no es una spec que se lea." >&2
    exit 70
  fi
  token_gh
  if asegurar_etiquetas && publicar_entrada "$f" && [ -n "$PUBLICADA" ]; then
    spec=$(spec_de "$PUBLICADA")
    echo "$PUBLICADA: issue $(enlace_issue "$PUBLICADA") (en borrador)."
    echo "Escribe la spec en el issue o en $spec, y quita la etiqueta cola:borrador (o la línea «borrador: si»): recién entonces el orquestador la toma."
  else
    echo "GitHub no respondió: la spec quedó en $f y se publica en la vuelta siguiente (o con «entrada»)."
  fi
}

cmd_entrada() {
  local f
  con_issues || { echo "La cola es sólo local (ORQ_SOLO_LOCAL=1 o sin remoto de GitHub): no hay entrada que publicar." >&2; exit 64; }
  token_gh
  if ! asegurar_etiquetas || ! procesar_entrada; then
    echo "✗ GitHub no respondió ($(cat "$EST/.gh-ultimo-error" 2>/dev/null)): lo que falta sigue en .orquestador/entrada/ y se reintenta en la vuelta siguiente." >&2
    exit 1
  fi
  for f in "$DATOS/entrada"/*.md; do
    [ -e "$f" ] || continue
    echo "· sigue en la entrada: $(basename "$f")"
    [ -f "$f.error" ] && echo "  $(cat "$f.error")"
  done
  echo "Entrada publicada. La cola: bash scripts/orquestador/orquestador.sh estado"
}

cmd_omitir() {
  est_set "$1" estado omitida
  echo "$1 omitida"
  if con_issues && [ -n "$(est_get "$1" issue)" ]; then
    token_gh
    comentar "$1" "la persona la dio por hecha sin hacerla: queda omitida (las que dependen de ella siguen)." >/dev/null
    cerrar_issue_de "$1" || echo "(el issue se cierra en la vuelta siguiente: GitHub no respondió)"
  fi
}

cmd_instalar() {
  local u="$HOME/.config/systemd/user/$SERVICIO.service"
  mkdir -p "$(dirname "$u")"
  cat >"$u" <<UNIT
# Lo escribe \`bash scripts/orquestador/orquestador.sh instalar\` en $REPO. No se edita: se vuelve a instalar.
[Unit]
Description=Orquestador de la cola de tareas de $PROYECTO (claude -p)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$REPO
ExecStart=/usr/bin/env bash $ORQ/orquestador.sh
Restart=on-failure
RestartSec=60
# Al parar el servicio se cortan también las sesiones en curso; al volver, se retoman desde su rama.
KillMode=control-group
TimeoutStopSec=30
Environment=HOME=$HOME
Environment=PATH=${PATH_EXTRA:+$PATH_EXTRA:}/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable --now "$SERVICIO"
  echo "✓ $SERVICIO instalado y en marcha. Su log: journalctl --user -u $SERVICIO -f"
  echo "  Para que siga sin sesión abierta y arranque al encender (una vez por máquina): loginctl enable-linger \"\$USER\""
}

cmd_desinstalar() {
  systemctl --user disable --now "$SERVICIO" 2>/dev/null || true
  rm -f "$HOME/.config/systemd/user/$SERVICIO.service"
  systemctl --user daemon-reload
  echo "✓ $SERVICIO quitado. La cola y el estado siguen en $DATOS."
}

# Los comandos. Cargado con `source` y ORQ_SOLO_FUNCIONES=1 (las pruebas), sólo define las funciones: no corre ninguno.
principal() {
  case "${1:-bucle}" in
    bucle) bucle ;;
    correr) correr "$2" ;;
    redactar) redactar "$2" ;;
    estado) cmd_estado ;;
    plan) cmd_plan ;;
    ver) cmd_ver "$2" ;;
    prompt) cmd_prompt "$2" ;;
    reintentar) cmd_reintentar "$2" ;;
    omitir) cmd_omitir "$2" ;;
    parar) cmd_parar "$2" ;;
    pausar) touch "$EST/.pausa-manual" && echo "En pausa: no lanza nuevas; las que corren terminan." ;;
    reanudar)
      rm -f "$EST/.pausa-manual" "$EST/.pausa-hasta" && quitar_pausa_compartida
      echo "Reanudado (y sin la pausa compartida por el límite del plan, que es de todos los orquestadores de la máquina)."
      ;;
    verificar) cmd_verificar ;;
    nueva) shift && cmd_nueva "$@" ;;
    entrada) cmd_entrada ;;
    espejo) token_gh && espejo && echo "Espejo hecho (lo que pasó: .orquestador/estado/orquestador.log)." ;;
    vigilar) token_gh && vigilar_prs && echo "Vigilancia hecha (lo que pasó: .orquestador/estado/orquestador.log)." ;;
    instalar) cmd_instalar ;;
    desinstalar) cmd_desinstalar ;;
    *) sed -n '2,33p' "$0"; exit 64 ;;
  esac
}

[ "${ORQ_SOLO_FUNCIONES:-}" = 1 ] || principal "$@"
