# shellcheck shell=bash
# Un pedido desde el celular (README.md › «Un pedido desde el celular»): un issue con la etiqueta `pedido` (sin `cola`), de alguien con
# permiso de escritura, lo redacta como spec una sesión de `claude -p` en modo plan (sólo lee) sobre una copia de `main`. Termina en
# `SPEC:` (el issue pasa a ser la spec: título y cuerpo, −pedido +cola, y el espejo lo vuelve T<n>) o en `PREGUNTAS:` (un comentario
# con la marca de su ronda y cola:pregunta; la respuesta de la persona vuelve a lanzarla). A la tercera ronda que pregunta, cola:trabada.
# Una redacción a la vez por proyecto, con turno de la máquina y sin carril, después de las tareas. Lo puro (el hilo, la salida), en
# redaccion.mjs; lo que hace con la salida, en pedidos-salida.sh. Lo carga orquestador.sh con `source`; usa sus `EST`, `WTS`, `REPO`,
# `log`, `avisar`, `est_*`, `vivo`, `ids`, `campo`, `es_limite_del_plan` y `pausar_por_limite`, lo de github.sh y los turnos de
# maquina.sh.
#
# Lo local de cada pedido, en estado/P<n>/: `issue`, `pid`, `estado` (redactando, esperando, trabado, hecho; vacío, por redactar: lo
# lee `plan`), `previo` (el de antes de lanzarla), `ronda`, `fallos`, `espera_hasta` y `pedido-original.md`. Las rondas y la
# respuesta las dice el hilo del issue.

REDACCION="$ORQ/redaccion.mjs"
RONDAS_MAX=2

pedidos_abiertos() { # los issues abiertos con `pedido` (sin los PR), por número, en un arreglo JSON
  local salida
  salida=$(ghc api --paginate "repos/{owner}/{repo}/issues?labels=pedido&state=open&per_page=100") || return $?
  jq -s '[add[]? | select(has("pull_request") | not)] | sort_by(.number)' <<<"$salida"
}

# Un pedido que todavía se redacta: abierto, con `pedido` y sin `cola` ni `cola:trabada`.
por_redactar() { # json-del-issue
  jq -e '.state == "open" and ([.labels[]? | if type == "string" then . else .name end]
    | any(. == "pedido") and (any(. == "cola" or . == "cola:trabada") | not))' <<<"$1" >/dev/null
}

hilo_de() { # n json-del-issue → JSON {rondas, respondida, conversacion} (redaccion.mjs); 1 si GitHub no respondió
  local cs fissue fcom rc
  cs=$(ghc api --paginate "repos/{owner}/{repo}/issues/$1/comments?per_page=100") || return $?
  fissue=$(mktemp) && fcom=$(mktemp)
  printf '%s' "$2" >"$fissue"
  jq -s '[.[][]?]' <<<"$cs" >"$fcom"
  node "$REDACCION" hilo "$fissue" "$fcom" "$BOT" "$CON_PERMISO"
  rc=$?
  rm -f "$fissue" "$fcom"
  return "$rc"
}

pedido_listo() { # json-del-issue json-del-hilo — su autor tiene permiso, va en la ronda 0 o ya respondieron, y no está en espera
  local n hasta
  n=$(jq -r .number <<<"$1")
  if ! con_permiso "$1"; then
    [ -f "$EST/.ajenos/P$n" ] || { mkdir -p "$EST/.ajenos" && touch "$EST/.ajenos/P$n" && log "pedido #$n: lo abrió alguien sin permiso de escritura en el repo: no se redacta"; }
    return 1
  fi
  if [ -f "$EST/.ajenos/P$n" ]; then rm -f "$EST/.ajenos/P$n" && log "pedido #$n: ahora se redacta"; fi
  hasta=$(est_get "P$n" espera_hasta)
  [ -n "$hasta" ] && [ "$(date +%s)" -lt "$hasta" ] && return 1
  jq -e '.rondas == 0 or .respondida' <<<"$2" >/dev/null
}

redaccion_viva() { # alguna redacción de este proyecto corriendo (su proceso vive)
  local d id
  for d in "$EST"/P*/; do
    [ -d "$d" ] || continue
    id=$(basename "$d")
    [ "$(est_get "$id" estado)" = redactando ] && vivo "$id" && return 0
  done
  return 1
}

# El bucle, después de lanzar las tareas: la primera redacción lista, si no hay otra corriendo y queda turno en la máquina. Un pedido
# local que ya no es un `pedido` abierto (pasó a la cola, se cerró) queda hecho.
lanzar_redaccion() {
  con_issues || return 0
  gh_en_espera && return 0
  redaccion_viva && return 0
  [ "$(turnos_libres)" -gt 0 ] || return 0
  uso_semanal_alto >/dev/null && return 0 # la redacción es de plan y del nivel capaz: con la cuenta al borde del límite semanal, espera
  local pedidos j n hilo d
  pedidos=$(pedidos_abiertos) || { sin_red; return 0; }
  for d in "$EST"/P*/; do
    [ -d "$d" ] || continue
    n=$(basename "$d") && n=${n#P}
    jq -e --argjson n "$n" 'any(.[]; .number == $n)' <<<"$pedidos" >/dev/null && continue
    [ "$(est_get "P$n" estado)" = hecho ] || est_set "P$n" estado hecho
  done
  while IFS= read -r j; do
    por_redactar "$j" || continue
    n=$(jq -r .number <<<"$j")
    hilo=$(hilo_de "$n" "$j") || { sin_red; return 0; }
    pedido_listo "$j" "$hilo" || continue
    est_set "P$n" issue "$n"
    est_set "P$n" previo "$(est_get "P$n" estado)"
    est_set "P$n" estado redactando
    setsid bash "$ORQ/orquestador.sh" redactar "$n" >>"$EST/P$n/redactar.log" 2>&1 </dev/null &
    est_set "P$n" pid "$!"
    log "P$n: redacción lanzada (pedido #$n)"
    return 0
  done < <(jq -c '.[]' <<<"$pedidos")
}

# ------------------------------------------------------------------------------------------------------------- la redacción (hijo)

redactar() { # n
  local j hilo ronda prompt hasta
  N=$1
  ID="P$N"
  WT="$WTS/P$N"
  est_set "$ID" issue "$N"
  est_set "$ID" pid "$$"
  token_gh
  # Lo que vio el bucle pudo cambiar: se relee, y si ya no está para redactar, no se toca nada.
  if ! j=$(api_issue "$N") || ! por_redactar "$j" || ! hilo=$(hilo_de "$N" "$j") || ! pedido_listo "$j" "$hilo"; then
    volver_pedido "el pedido #$N ya no está para redactar (o GitHub no respondió)"
    return 0
  fi
  tomar_turno || { volver_pedido "sin turno en la máquina: vuelve a esperar"; return 0; }
  if hasta=$(pausa_compartida_hasta); then
    volver_pedido "pausa compartida por el límite del plan hasta las $(date -d "@$hasta" '+%H:%M')"
    return 0
  fi
  # Trabado aquí y sin cola:trabada en el issue: la persona quitó la traba para reintentar. Los fallos de antes no cuentan.
  [ "$(est_get "$ID" estado)" = trabado ] || [ "$(est_get "$ID" previo)" = trabado ] && est_del "$ID" fallos
  est_set "$ID" estado redactando
  ronda=$(($(jq -r .rondas <<<"$hilo") + 1))
  etiquetar "$N" cola:corriendo cola:pregunta "$(nombres_de_etiquetas "$j")"
  [ "$ronda" -gt 1 ] && comentar "$ID" "recibí tus respuestas: vuelvo a redactar la spec (ronda $ronda)." >/dev/null
  [ -f "$EST/$ID/pedido-original.md" ] || jq -r '.body // ""' <<<"$j" >"$EST/$ID/pedido-original.md"
  preparar_lectura
  case $? in
    0) ;;
    2)
      # Sin red y sin un origin/main local: no es un fallo de la redacción; se espera.
      est_set "$ID" espera_hasta $(($(date +%s) + 300))
      est_set "$ID" estado ""
      etiquetas_del_pedido "" cola:corriendo
      log "$ID: sin git fetch y sin origin/main: se reintenta en 5 min"
      return 0
      ;;
    *) fallo_de_redaccion "no se pudo crear la copia de main en $WT"; return 0 ;;
  esac
  prompt="$EST/$ID/prompt-$ronda.md"
  reemplazar_redaccion "$ronda" "$(jq -r .conversacion <<<"$hilo")" >"$prompt"
  claude_de_redaccion "$prompt" "$ronda"
  local rc=$?
  quitar_lectura
  [ "$rc" = 0 ] && aplicar_redaccion "$ronda"
  return 0
}

# El worktree desprendido en origin/main donde lee la sesión (nunca la principal, que puede estar en otra rama). 0 listo; 2 sin
# origin/main (sin red y nunca traído); 1 si git no pudo crearlo.
preparar_lectura() {
  if ! GIT_TERMINAL_PROMPT=0 git -C "$REPO" fetch -q origin main 2>>"$EST/$ID/redactar.log"; then
    git -C "$REPO" rev-parse -q --verify refs/remotes/origin/main >/dev/null || return 2
    log "$ID: git fetch no respondió (¿sin red?): leo el origin/main que hay"
  fi
  quitar_lectura
  [ -e "$WT" ] && [[ "$WT" == "$WTS"/P* ]] && rm -rf -- "$WT"
  git -C "$REPO" worktree add -q --detach "$WT" origin/main >>"$EST/$ID/redactar.log" 2>&1 || return 1
  # Por si corre un hook de la sesión; y el mapa, que se lee antes que grep.
  [ -e "$REPO/node_modules" ] && ln -s "$REPO/node_modules" "$WT/node_modules"
  (cd "$WT" && bash scripts/mapa.sh >/dev/null 2>&1 9>&-)
  return 0
}

quitar_lectura() {
  git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
  git -C "$REPO" worktree prune >/dev/null 2>&1
  return 0
}

cola_viva() { # las tareas vivas de la cola, una por línea: «- T<n> · titulo · rama · estado»
  local id s f hay=""
  for id in $(ids); do
    s=$(estado_de "$id")
    case "$s" in integrado | omitida) continue ;; esac
    f=$(spec_de "$id")
    printf -- '- %s · %s · %s · %s\n' "$id" "$(campo "$f" titulo)" "$(campo "$f" rama)" "$s"
    hay=1
  done
  [ -n "$hay" ] || echo "(la cola no tiene tareas vivas)"
}

reemplazar_redaccion() { # ronda conversación → el prompt (la conversación va al final: es texto del issue)
  local t
  t=$(<"$PROMPTS/redactar.md")
  t=${t//'{{NUMERO}}'/$N}
  t=${t//'{{PROMPT}}'/$EST/$ID/prompt-$1.md}
  t=${t//'{{RONDA}}'/$1}
  t=${t//'{{FECHA}}'/$(TZ=America/La_Paz date +%F)}
  t=${t//'{{WT}}'/$WT}
  t=${t//'{{REPO_GH}}'/$REPO_GH}
  t=${t//'{{COLA}}'/$(cola_viva)}
  local plantilla
  plantilla=$(<"$ORQ/plantilla-tarea.md")
  t=${t//'{{PLANTILLA}}'/${plantilla//'{{TEMA}}'/<tema>}}
  t=${t//'{{CONVERSACION}}'/$2}
  printf '%s\n' "$t"
}

# La sesión, en modo plan y sin permisos. Deja RESULTADO_TEXTO. 0 si terminó; 1 si se cortó (y ya quedó dicho qué sigue).
claude_de_redaccion() { # prompt ronda
  local salida="$EST/$ID/redaccion-$2.jsonl" modelo effort=${EFFORT_REDACTAR:-high} rc rj es_error compacta=()
  mapfile -t compacta < <(args_autocompact)
  modelo=$(modelo_de_nivel "${NIVEL_REDACTAR:-capaz}") || modelo=$(modelo_de_nivel capaz)
  log "$ID: redacción del pedido #$N (ronda $2 · $modelo · $effort)"
  (cd "$WT" && ORQ_PERMITE="" timeout --kill-after=60 "${TIEMPO_MAX_REDACCION:-45m}" \
    claude -p --model "$modelo" --effort "$effort" --permission-mode plan --disallowedTools ExitPlanMode "${compacta[@]}" \
    --output-format stream-json --verbose <"$1") >"$salida" 2>"$salida.err" 9>&-
  rc=$?
  RESULTADO_JSON=$(jq -c 'select(.type == "result")' "$salida" 2>/dev/null | tail -n 1)
  rj=${RESULTADO_JSON:-'{}'}
  RESULTADO_TEXTO=$(jq -r '.result // ""' <<<"$rj" 2>/dev/null)
  es_error=$(jq -r '.is_error // false' <<<"$rj" 2>/dev/null)
  if [ "$rc" = 124 ] || [ "$rc" = 137 ]; then
    fallo_de_redaccion "se pasó de ${TIEMPO_MAX_REDACCION:-45m}"
    return 1
  fi
  anotar_uso_semanal "$salida"
  if { [ "$rc" != 0 ] || [ "$es_error" = true ] || [ -z "$RESULTADO_JSON" ]; } && es_limite_del_plan "$salida"; then
    # No gasta nada: vuelve a esperar a que pase la pausa.
    etiquetas_del_pedido "" cola:corriendo
    est_set "$ID" estado ""
    pausar_por_limite "$ID (la redacción del pedido #$N)" "$salida"
    return 1
  fi
  if [ "$rc" != 0 ] && [ -z "$RESULTADO_JSON" ]; then
    fallo_de_redaccion "terminó con error $rc: $(tail -n 3 "$salida.err" | tr '\n' ' ' | cut -c1-200)"
    return 1
  fi
  return 0
}

volver_pedido() { # motivo — vuelve a como estaba antes de que el bucle lanzara la redacción (sin gastar nada)
  [ "$(est_get "$ID" estado)" = redactando ] && est_set "$ID" estado "$(est_get "$ID" previo)"
  log "$ID: $1"
}

etiquetas_del_pedido() { # poner quitar [json] — sobre las etiquetas releídas del issue
  local j=${3:-}
  [ -n "$j" ] || j=$(api_issue "$N") || return 1
  etiquetar "$N" "$1" "$2" "$(nombres_de_etiquetas "$j")"
}

fallo_de_redaccion() { # motivo — suma un fallo y espera 5 min; al tercero, trabado
  sumar "$ID" fallos
  if [ "$(num "$ID" fallos)" -ge 3 ]; then
    trabar_pedido "la sesión de redacción falló 3 veces ($1)"
    return
  fi
  est_set "$ID" espera_hasta $(($(date +%s) + 300))
  est_set "$ID" estado ""
  etiquetas_del_pedido "" cola:corriendo
  log "$ID: la redacción falló ($(num "$ID" fallos) de 3): $1; se reintenta en 5 min"
}

linea_de_pedido() { # P<n> — la línea de `plan` de un pedido, o nada si ya está hecho
  local id=$1
  case "$(est_get "$id" estado)" in
    hecho) ;;
    redactando)
      if vivo "$id"; then echo "$id  pedido: redactando"; else echo "$id  pedido: por redactar (la redacción anterior se cortó)"; fi
      ;;
    esperando) echo "$id  pedido: esperando tus respuestas (ronda $(est_get "$id" ronda))" ;;
    trabado) echo "$id  pedido: trabado (el motivo está en el comentario del issue y en .orquestador/estado/$id/trabado.md)" ;;
    *) echo "$id  pedido: por redactar" ;;
  esac
}
