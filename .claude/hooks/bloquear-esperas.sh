# shellcheck shell=bash
# Las esperas sondeando en el hook de Bash y de Monitor: lo carga `bloquear-peligrosos.sh` (que pone `bloquear`, `CMD`, `HERRAMIENTA` y
# `SEGUNDO_PLANO`) y se prueba con él (`scripts/guardas/bloquear-esperas.casos.ts`). Una sesión que espera un proceso largo sondeándolo
# (`until grep …; do sleep 15; done`, `sleep 600`, un Monitor que sólo cuenta tiempo) paga un turno con todo el contexto en cada vuelta:
# lo que debe hacer es lanzarlo con `run_in_background` y esperar el aviso (docs/LECCIONES.md). Como el resto del hook, lee el texto del
# comando, no el de un guion que se corre (`bash scripts/x.sh`): mejor sobrar que faltar.
#
#   Bash en primer plano:  un bucle `until`/`while`/`for` con un `sleep`, o un `sleep` de más de 5 s. Con `run_in_background: true` pasa.
#   Monitor:               un comando que sólo cuenta tiempo (`sleep N; echo tick`, `while true; do sleep N; echo …; done`). Uno que
#                          lee algo (`tail -f log | grep`, `until grep -q … f; do sleep 5; done`) pasa.

MSJ_ESPERA="No esperes sondeando: lánzalo con run_in_background y espera el aviso (cada vuelta de un bucle, un sleep largo o un Monitor de intervalo relee todo el contexto de la sesión). No leas el log hasta el aviso."

# La cabeza de un segmento ($1): su primer comando de verdad, sin lo que lo envuelve (`do`, `then`, `!`, `VAR=x`, `time`, `nohup`,
# `timeout 600`, `env`, `bash -c`, `eval`…), y sus argumentos. Deja en `CAB` la palabra y en `ARGS_CAB` el resto.
cabeza_del_segmento() {
  local W=() t
  read -ra W <<<"${1//[\"\'\\]/}"
  CAB=""
  ARGS_CAB=()
  while [ "${#W[@]}" -gt 0 ]; do
    t="${W[0]}"
    case "$t" in
      '' | do | then | else | elif | '{' | '!' | time | command | exec | nohup | eval | env | sudo | setsid | stdbuf | nice)
        W=("${W[@]:1}") ;;
      [A-Za-z_]*=*) W=("${W[@]:1}") ;;
      timeout)
        W=("${W[@]:1}")
        while [ "${#W[@]}" -gt 0 ]; do
          case "${W[0]}" in
            -s | -k | --signal | --kill-after) W=("${W[@]:2}") ;;
            -* | [0-9]*) W=("${W[@]:1}") ;;
            *) break ;;
          esac
        done ;;
      bash | sh | zsh)
        if [[ "${W[1]:-}" == -*c* ]]; then W=("${W[@]:2}"); else break; fi ;;
      *) break ;;
    esac
  done
  [ "${#W[@]}" -gt 0 ] || return 0
  CAB="${W[0]##*/}"
  ARGS_CAB=("${W[@]:1}")
}

# Los segundos de lo que sigue a `sleep` ($1: `10`, `0.5`, `2m`, `1h`); vacío si no es un número (`$n`, `infinity` es mucho).
segundos_de() {
  case "$1" in
    infinity) printf '%s' 999999 ;;
    *)
      [[ "$1" =~ ^([0-9]+\.?[0-9]*|\.[0-9]+)([smhd]?)$ ]] || return 0
      awk -v n="${BASH_REMATCH[1]}" -v u="${BASH_REMATCH[2]}" 'BEGIN { m = (u == "m") ? 60 : (u == "h") ? 3600 : (u == "d") ? 86400 : 1; print n * m }' ;;
  esac
}

revisar_esperas() {
  [ "$HERRAMIENTA" = Monitor ] || [ "$SEGUNDO_PLANO" != true ] || return 0
  local segmento n bucle=0 duerme=0 largo=0 lee=0 s
  local SEGS
  SEGS=$(printf '%s' "$CMD" | sed -E 's/[0-9]*[<>]&[0-9-]*//g; s/&>>?/>/g' | sed -E 's/(&&|\|\||;|\||`|\$\(|\(|\)|&)/\n/g')
  while IFS= read -r segmento; do
    cabeza_del_segmento "$segmento"
    [ -n "$CAB" ] || continue
    case "$CAB" in
      until | while | for)
        bucle=1
        # `while sleep 10; do` y `while true`/`while :`/`until false`: lo segundo no lee nada, lo primero duerme.
        case "${ARGS_CAB[0]:-}" in
          sleep) duerme=1; s=$(segundos_de "${ARGS_CAB[1]:-}"); [ -n "$s" ] && awk -v s="$s" 'BEGIN { exit !(s > 5) }' && largo=1 ;;
          true | : | false) ;;
          *) lee=1 ;;
        esac ;;
      sleep)
        duerme=1
        s=$(segundos_de "${ARGS_CAB[0]:-}")
        if [ -n "$s" ] && awk -v s="$s" 'BEGIN { exit !(s > 5) }'; then largo=1; fi ;;
      done | fi | true | : | echo | printf | date) ;;
      *) lee=1 ;;
    esac
  done <<<"$SEGS"
  n=0
  if [ "$HERRAMIENTA" = Monitor ]; then
    # Un Monitor que sólo cuenta tiempo no mira nada: es un temporizador.
    [ "$duerme" = 1 ] && [ "$lee" = 0 ] && n=1
  else
    { [ "$bucle" = 1 ] && [ "$duerme" = 1 ]; } && n=1
    [ "$largo" = 1 ] && n=1
  fi
  [ "$n" = 1 ] && bloquear "$MSJ_ESPERA"
  return 0
}
