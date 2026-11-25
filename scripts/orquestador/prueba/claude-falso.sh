#!/usr/bin/env bash
# Un `claude` falso para las pruebas del orquestador (prueba/maquina.ts, prueba/escenario.ts): no habla con nadie. Anota en
# $CLAUDE_FALSO_LOG «inicio <ns> <pwd> <modelo> <pid>» y, al terminar, «fin <ns> <pid>»; en $CLAUDE_FALSO_ARGS, una línea por llamada
# con el ORQ_PERMITE que recibió («(sin definir)» si no vino) y sus argumentos; en $CLAUDE_FALSO_PROMPT, el prompt de la última
# llamada; en $CLAUDE_FALSO_TMPDIR, «<TMPDIR> <cuántas entradas tenía>», y deja ahí un `sobrante` (lo que una prueba no borra).
# Según CLAUDE_FALSO_MODO:
#   trabada (por defecto)  duerme CLAUDE_FALSO_DUERME segundos y devuelve «RESULTADO: TRABADA …»
#   limite                 dice por stderr que llegó al límite del plan y sale con 1
#   limite-evento          como un límite real: un rate_limit_event rejected (resetsAt = $CLAUDE_FALSO_RESETS, epoch; tipo
#                          $CLAUDE_FALSO_TIPO, por defecto seven_day) y un result con error cuyo texto es $CLAUDE_FALSO_TEXTO
#                          (por defecto «You have hit your weekly limit»); duerme CLAUDE_FALSO_DUERME antes; sale con 1
#   limite-texto           sólo el result con error y el texto de $CLAUDE_FALSO_TEXTO, sin evento; sale con 1
#   uso                    un rate_limit_event allowed (seven_day, utilization $CLAUDE_FALSO_USO, resetsAt $CLAUDE_FALSO_RESETS) y
#                          el resultado de «trabada»
#   identidad              devuelve un resultado con modelUsage, como `claude -p --output-format json`
#   salida                 devuelve como resultado el texto del archivo $CLAUDE_FALSO_SALIDA
set -uo pipefail
if [ -n "${CLAUDE_FALSO_ARGS:-}" ]; then
  printf 'ORQ_PERMITE=%s · %s\n' "${ORQ_PERMITE-(sin definir)}" "$*" >>"$CLAUDE_FALSO_ARGS"
fi
modelo=""
while [ $# -gt 0 ]; do
  case "$1" in
    --model) modelo=${2:-} && shift ;;
  esac
  shift
done
if [ -n "${CLAUDE_FALSO_TMPDIR:-}" ]; then
  printf '%s %s\n' "${TMPDIR-}" "$(find "${TMPDIR:-/no-existe}" -mindepth 1 2>/dev/null | wc -l)" >>"$CLAUDE_FALSO_TMPDIR"
  [ -n "${TMPDIR:-}" ] && touch "$TMPDIR/sobrante"
fi
if [ -n "${CLAUDE_FALSO_PROMPT:-}" ]; then cat >"$CLAUDE_FALSO_PROMPT"; else cat >/dev/null; fi
anotar() { [ -n "${CLAUDE_FALSO_LOG:-}" ] && printf '%s\n' "$*" >>"$CLAUDE_FALSO_LOG"; return 0; }
anotar "inicio $(date +%s%N) $PWD ${modelo:-?} $$"
case "${CLAUDE_FALSO_MODO:-trabada}" in
  limite)
    echo "Claude usage limit reached." >&2
    anotar "fin $(date +%s%N) $$"
    exit 1
    ;;
  limite-evento)
    sleep "${CLAUDE_FALSO_DUERME:-1}"
    jq -nc --arg r "${CLAUDE_FALSO_RESETS:?falta CLAUDE_FALSO_RESETS}" --arg t "${CLAUDE_FALSO_TIPO:-seven_day}" \
      '{type: "rate_limit_event", rate_limit_info: {status: "rejected", resetsAt: ($r | tonumber), rateLimitType: $t, utilization: 1}}'
    jq -nc --arg t "${CLAUDE_FALSO_TEXTO:-You have hit your weekly limit}" '{type: "result", subtype: "success", is_error: true, result: $t}'
    anotar "fin $(date +%s%N) $$"
    exit 1
    ;;
  limite-texto)
    jq -nc --arg t "${CLAUDE_FALSO_TEXTO:?falta CLAUDE_FALSO_TEXTO}" '{type: "result", subtype: "success", is_error: true, result: $t}'
    anotar "fin $(date +%s%N) $$"
    exit 1
    ;;
  uso)
    jq -nc --arg r "${CLAUDE_FALSO_RESETS:?falta CLAUDE_FALSO_RESETS}" --arg u "${CLAUDE_FALSO_USO:?falta CLAUDE_FALSO_USO}" \
      '{type: "rate_limit_event", rate_limit_info: {status: "allowed", resetsAt: ($r | tonumber), rateLimitType: "seven_day", utilization: ($u | tonumber)}}'
    echo '{"type":"result","result":"RESULTADO: TRABADA prueba del claude falso","is_error":false}'
    ;;
  identidad)
    echo '{"type":"result","result":"Soy el modelo falso","modelUsage":{"modelo-falso":{}}}'
    ;;
  salida)
    jq -cRs '{type: "result", result: ., is_error: false}' <"${CLAUDE_FALSO_SALIDA:?falta CLAUDE_FALSO_SALIDA}"
    ;;
  *)
    sleep "${CLAUDE_FALSO_DUERME:-1}"
    echo '{"type":"result","result":"RESULTADO: TRABADA prueba del claude falso","is_error":false}'
    ;;
esac
anotar "fin $(date +%s%N) $$"
