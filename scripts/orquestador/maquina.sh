# shellcheck shell=bash
# Lo que comparten todos los orquestadores de una máquina (scripts/orquestador/README.md › «Uno por proyecto»): los turnos de sesión
# y la pausa por el límite del plan.
# Cada proyecto tiene su orquestador, pero la RAM es de la máquina y el límite del plan, de la cuenta de Claude: un hijo sólo
# corre su sesión con un turno tomado (`flock` sobre ~/.local/state/orquestador/turno-<k>.lock, k = 1…TURNOS_MAQUINA), y el
# kernel lo suelta si el proceso muere. Lo carga orquestador.sh con `source`; usa su `PROYECTO`, `ID`, `EST`, `log` y `avisar`.
#
# Las rutas no siguen XDG a propósito: el servicio de systemd y una terminal con otro XDG tienen que ver los mismos archivos.

MAQUINA_ENV="$HOME/.config/orquestador/maquina.env"
MAQUINA_EST="$HOME/.local/state/orquestador"
TURNOS_POR_DEFECTO=3

# TURNOS_MAQUINA de maquina.env (se lee sin `source`: un valor roto no rompe el bucle). Deja TURNOS y, si el valor no sirve,
# TURNOS_AVISO. Sin archivo o sin la línea: 3, sin aviso. Se relee en cada vuelta: editarlo vale sin reiniciar.
leer_turnos() {
  local linea v
  TURNOS=$TURNOS_POR_DEFECTO
  TURNOS_AVISO=""
  [ -f "$MAQUINA_ENV" ] || return 0
  linea=$(grep -E '^[[:space:]]*TURNOS_MAQUINA=' "$MAQUINA_ENV" 2>/dev/null | tail -n 1)
  [ -n "$linea" ] || return 0
  v=$(cut -d= -f2- <<<"$linea" | sed 's/#.*//' | tr -d "\"' \t\r")
  if [[ "$v" =~ ^[1-9][0-9]?$ ]]; then
    TURNOS=$v
  else
    TURNOS_AVISO="${MAQUINA_ENV/#"$HOME"/\~}: TURNOS_MAQUINA=«$v» no es un número de 1 a 99: uso $TURNOS_POR_DEFECTO."
  fi
}

asegurar_maquina_env() { # lo crea si falta (y lo dice)
  [ -f "$MAQUINA_ENV" ] && return 0
  mkdir -p "$(dirname "$MAQUINA_ENV")"
  cat >"$MAQUINA_ENV" <<EOF
# Lo de esta máquina, para todos los orquestadores que corren en ella (scripts/orquestador/README.md › «Uno por proyecto»).
# Sesiones de claude a la vez entre todos los proyectos (de 1 a 99): la RAM es de la máquina y el límite del plan, de la cuenta.
TURNOS_MAQUINA=$TURNOS_POR_DEFECTO
EOF
  echo "✓ creé ~/.config/orquestador/maquina.env (TURNOS_MAQUINA=$TURNOS_POR_DEFECTO)"
}

# Un turno está libre si se puede tomar ahora: se toma y se suelta en el acto (`flock -n lock true`).
turno_libre() { mkdir -p "$MAQUINA_EST" && flock -n "$MAQUINA_EST/turno-$1.lock" true 2>/dev/null; }

turnos_libres() { # cuántos de los TURNOS de la máquina están libres
  local k n=0
  leer_turnos
  for ((k = 1; k <= TURNOS; k++)); do turno_libre "$k" && n=$((n + 1)); done
  echo "$n"
}

turnos_ocupados_por() { # «calesa-app T12, kit T6» (quién tiene cada turno ocupado)
  local k quien lista=""
  leer_turnos
  for ((k = 1; k <= TURNOS; k++)); do
    turno_libre "$k" && continue
    quien=$(cat "$MAQUINA_EST/turno-$k.quien" 2>/dev/null)
    lista="$lista${lista:+, }${quien:-?}"
  done
  echo "$lista"
}

# Toma el primer turno libre en el fd 9 y lo sostiene hasta que este proceso termine. Deja TURNO=k; 1 si no hay ninguno libre.
# Nunca dentro de `$(…)`: la subshell se llevaría el fd. Lo que este proceso lance y pueda sobrevivirlo va con `9>&-`.
tomar_turno() {
  local k
  leer_turnos
  TURNO=""
  mkdir -p "$MAQUINA_EST"
  for ((k = 1; k <= TURNOS; k++)); do
    exec 9>>"$MAQUINA_EST/turno-$k.lock"
    if flock -n 9; then
      TURNO=$k
      printf '%s %s\n' "$PROYECTO" "${ID:-}" >"$MAQUINA_EST/turno-$k.quien"
      return 0
    fi
    exec 9>&-
  done
  return 1
}

# ----------------------------------------------------------------------------------------------- la pausa por el límite del plan
# El límite es de la cuenta: el orquestador que lo detecta escribe la hora de fin en ~/.local/state/orquestador/pausa-hasta y todos
# la leen antes de lanzar. Se escribe y se borra bajo pausa.lock: dos que llegan al límite a la vez no se pisan (queda la más tardía),
# y nadie borra una pausa recién puesta.
PAUSA_COMPARTIDA="$MAQUINA_EST/pausa-hasta"

pausa_compartida_hasta() { # imprime la hora de fin (epoch) si está en el futuro; vencida o basura, la borra y devuelve 1
  local h
  h=$(cat "$PAUSA_COMPARTIDA" 2>/dev/null) || return 1
  if [[ "$h" =~ ^[0-9]+$ ]] && [ "$h" -gt "$(date +%s)" ]; then
    echo "$h"
    return 0
  fi
  mkdir -p "$MAQUINA_EST"
  (
    flock -w 5 7 || exit 0
    h=$(cat "$PAUSA_COMPARTIDA" 2>/dev/null) || exit 0
    if ! [[ "$h" =~ ^[0-9]+$ ]] || [ "$h" -le "$(date +%s)" ]; then rm -f "$PAUSA_COMPARTIDA"; fi
  ) 7>>"$MAQUINA_EST/pausa.lock"
  return 1
}

# Imprime «nueva» si ahora la pausa es una que no había o termina más de 5 min después de la que corría: quien avisa de la pausa lo decide
# aquí, bajo el candado, para que dos que se cortan a la vez no avisen los dos.
fijar_pausa_compartida() { # epoch — guarda el máximo entre la que había y ésta
  local h
  mkdir -p "$MAQUINA_EST"
  (
    flock -w 5 7 || exit 1
    h=$(cat "$PAUSA_COMPARTIDA" 2>/dev/null)
    if [[ "$h" =~ ^[0-9]+$ ]] && [ "$h" -ge "$1" ]; then exit 0; fi
    printf '%s\n' "$1" >"$PAUSA_COMPARTIDA.$$" && mv "$PAUSA_COMPARTIDA.$$" "$PAUSA_COMPARTIDA"
    if ! [[ "$h" =~ ^[0-9]+$ ]] || [ "$h" -le "$(date +%s)" ] || [ "$1" -gt $((h + 300)) ]; then echo nueva; fi
  ) 7>>"$MAQUINA_EST/pausa.lock"
}

quitar_pausa_compartida() {
  mkdir -p "$MAQUINA_EST"
  (
    flock -w 5 7
    rm -f "$PAUSA_COMPARTIDA"
  ) 7>>"$MAQUINA_EST/pausa.lock"
}

# ------------------------------------------------------------------------------------- la hora del límite y el uso semanal
# De la salida de una sesión (stream-json) sale cuándo se renueva el límite: el `rate_limit_event` trae `resetsAt` (epoch) y, en el
# semanal (`seven_day`), la `utilization` de la cuenta (0 a 1). Una hora que no está en el futuro o que cae a más de 8 días no vale.
USO_SEMANAL="$MAQUINA_EST/uso-semanal" # «<utilization> <resetsAt>»: lo más alto visto en cualquier sesión de la máquina
MARGEN_DEL_LIMITE=120 # segundos que se esperan de más después de la hora de renovación
HORIZONTE_DEL_LIMITE=$((8 * 24 * 3600))

hora_valida() { # epoch — 0 si está en el futuro y a no más de 8 días
  local ahora
  [[ "$1" =~ ^[0-9]+$ ]] || return 1
  ahora=$(date +%s)
  [ "$1" -gt "$ahora" ] && [ "$1" -le $((ahora + HORIZONTE_DEL_LIMITE)) ]
}

# Los eventos de límite de un stream-json: {"type":"rate_limit_event","rate_limit_info":{status,resetsAt,rateLimitType,utilization}}
# (o los mismos campos sueltos). Una `resetsAt` en milisegundos se pasa a segundos.
eventos_de_limite() { # archivo.jsonl → una línea «status tipo resetsAt utilization» por evento (vacío si falta)
  jq -r 'select(.type == "rate_limit_event") | (.rate_limit_info // .)
    | [.status // "-", .rateLimitType // "-", ((.resetsAt // "-") | if type == "number" and . > 100000000000 then . / 1000 | floor else . end), (.utilization // "-")] | join(" ")' \
    "$1" 2>/dev/null
}

hora_del_evento_de_limite() { # archivo.jsonl — el resetsAt del último evento rejected, si vale
  local h
  h=$(eventos_de_limite "$1" | awk '$1 == "rejected" && $3 != "-" {h = $3} END {print h}')
  hora_valida "$h" && echo "$h"
}

# «resets 1pm (America/La_Paz)», «resets at 5pm», «resets Nov 28, 1pm»: la próxima vez que el reloj de ese huso marque esa hora.
hora_del_texto_de_limite() { # texto
  local frase hora fecha tz t ahora
  frase=$(grep -oiE 'resets?( at)? +([A-Z][a-z]{2} [0-9]{1,2},? +(at +)?)?[0-9]{1,2}(:[0-9]{2})? ?[ap]m( *\([A-Za-z_/+-]+\))?' <<<"$1" | tail -n 1)
  [ -n "$frase" ] || return 1
  hora=$(grep -oiE '[0-9]{1,2}(:[0-9]{2})? ?[ap]m' <<<"$frase" | tail -n 1)
  fecha=$(grep -oE '[A-Z][a-z]{2} [0-9]{1,2}' <<<"$frase" | head -n 1)
  tz=$(sed -nE 's/.*\(([A-Za-z_/+-]+)\).*/\1/p' <<<"$frase")
  [ -n "$tz" ] && [ ! -e "/usr/share/zoneinfo/$tz" ] && tz="" # un huso que no existe se leería como UTC: mejor el de la máquina
  ahora=$(date +%s)
  if [ -n "$fecha" ]; then
    t=$(TZ=${tz:-$(cat /etc/timezone 2>/dev/null || echo UTC)} date -d "$fecha $hora" +%s 2>/dev/null) || return 1
  else
    t=$(TZ=${tz:-$(cat /etc/timezone 2>/dev/null || echo UTC)} date -d "today $hora" +%s 2>/dev/null) || return 1
    [ "$t" -gt "$ahora" ] || t=$(TZ=${tz:-$(cat /etc/timezone 2>/dev/null || echo UTC)} date -d "tomorrow $hora" +%s 2>/dev/null) || return 1
  fi
  hora_valida "$t" && echo "$t"
}

# Hasta cuándo esperar tras el límite (epoch, ya con el margen), de la salida de la sesión: el evento primero; si no, el texto de «resets …»
# (el `result`, el stderr o el final del stream). Sin ninguno de los dos devuelve 1 y queda la pausa por defecto.
hora_de_fin_del_limite() { # archivo.jsonl
  local h texto
  h=$(hora_del_evento_de_limite "$1")
  if [ -z "$h" ]; then
    texto=$(jq -r 'select(.type == "result") | .result // ""' "$1" 2>/dev/null | tail -n 5)$'\n'$(cat "$1.err" 2>/dev/null)$'\n'$(tail -n 5 "$1" 2>/dev/null | cut -c1-2000)
    h=$(hora_del_texto_de_limite "$texto")
  fi
  [ -n "$h" ] || return 1
  echo $((h + MARGEN_DEL_LIMITE))
}

anotar_uso_semanal() { # archivo.jsonl — guarda la utilization semanal más alta de la renovación más lejana que vio la sesión
  local u h antes au ah
  read -r u h < <(eventos_de_limite "$1" | awk '$2 == "seven_day" && $3 != "-" && $4 != "-" {u = $4; h = $3} END {if (h != "") print u, h}')
  [ -n "${h:-}" ] && [[ "$h" =~ ^[0-9]+$ ]] && [[ "$u" =~ ^[0-9]*\.?[0-9]+$ ]] || return 0
  hora_valida "$h" || return 0
  mkdir -p "$MAQUINA_EST"
  (
    flock -w 5 7 || exit 0
    { read -r au ah <"$USO_SEMANAL"; } 2>/dev/null
    if [[ "${ah:-}" =~ ^[0-9]+$ ]] && { [ "$ah" -gt "$h" ] || { [ "$ah" -eq "$h" ] && awk -v a="$au" -v b="$u" 'BEGIN {exit !(a >= b)}'; }; }; then exit 0; fi
    printf '%s %s\n' "$u" "$h" >"$USO_SEMANAL.$$" && mv "$USO_SEMANAL.$$" "$USO_SEMANAL"
  ) 7>>"$MAQUINA_EST/pausa.lock"
}

# La utilization semanal de la cuenta llegó al umbral y la semana aún no se renueva: imprime la hora de renovación (epoch). Con
# UMBRAL_USO_SEMANAL en 0 no hace nada.
uso_semanal_alto() {
  local u h umbral=${UMBRAL_USO_SEMANAL:-0.95}
  awk -v u="$umbral" 'BEGIN {exit !(u > 0)}' || return 1
  { read -r u h <"$USO_SEMANAL"; } 2>/dev/null || return 1
  [[ "$u" =~ ^[0-9]*\.?[0-9]+$ ]] || return 1
  hora_valida "${h:-}" || return 1
  awk -v a="$u" -v b="$umbral" 'BEGIN {exit !(a >= b)}' || return 1
  echo "$h"
}

# -------------------------------------------------------------------------------------------- lo que usan el bucle y verificar

pasar_pausa_vieja() { # la pausa por límite de antes era de cada proyecto ($EST/.pausa-hasta): si sigue en curso, pasa a la compartida
  local h
  h=$(cat "$EST/.pausa-hasta" 2>/dev/null) || return 0
  if [[ "$h" =~ ^[0-9]+$ ]] && [ "$h" -gt "$(date +%s)" ]; then
    fijar_pausa_compartida "$h" >/dev/null && log "la pausa por el límite del plan (hasta las $(date -d "@$h" '+%H:%M')) ahora es de la máquina"
  fi
  rm -f "$EST/.pausa-hasta"
}

avisar_turnos() { # un TURNOS_MAQUINA inválido se avisa una vez por valor (el bucle sigue con 3)
  leer_turnos
  if [ -z "$TURNOS_AVISO" ]; then rm -f "$EST/.turnos-avisado"; return 0; fi
  [ "$(cat "$EST/.turnos-avisado" 2>/dev/null)" = "$TURNOS_AVISO" ] && return 0
  printf '%s\n' "$TURNOS_AVISO" >"$EST/.turnos-avisado"
  avisar "Turnos de la máquina" "$TURNOS_AVISO" default warning
}

linea_de_pausa() { # la pausa compartida, si la hay, y la espera por el uso semanal
  local h
  if h=$(uso_semanal_alto); then
    echo "⏸  uso semanal de la cuenta al límite: no lanza planes ni sesiones del nivel capaz hasta que se renueve ($(date -d "@$h" '+%a %H:%M'))"
  fi
  h=$(pausa_compartida_hasta) || return 0
  echo "⏸  pausa compartida por el límite del plan hasta las $(date -d "@$h" '+%H:%M'): no lanza nada (vale para todos los orquestadores de la máquina)"
}

paquete_de() { # herramienta → cómo se instala
  case "$1" in
    flock | setsid) echo "sudo apt install util-linux" ;;
    timeout) echo "sudo apt install coreutils" ;;
    *) echo "instala $1" ;;
  esac
}

verificar_maquina() { # la sección «Máquina» de verificar: maquina.env (lo crea si falta) y los turnos; 1 si algo no vale
  local ok=0 ocupados
  echo "== Máquina (lo que comparten los orquestadores de esta máquina)"
  asegurar_maquina_env
  leer_turnos
  if [ -n "$TURNOS_AVISO" ]; then echo "✗ $TURNOS_AVISO"; ok=1; fi
  if command -v flock >/dev/null; then
    ocupados=$(turnos_ocupados_por)
    echo "✓ turnos de sesión: $(turnos_libres) de $TURNOS libres${ocupados:+ (ocupados: $ocupados)}"
  fi
  linea_de_pausa
  return $ok
}
