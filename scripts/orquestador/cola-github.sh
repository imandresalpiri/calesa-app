# shellcheck shell=bash
# El espejo entre la cola local (.orquestador/cola/T*.md, la copia de trabajo) y los issues con la etiqueta `cola` (la fuente de
# verdad): scripts/orquestador/README.md › «La cola en los issues». Lo carga orquestador.sh con `source`, después de github.sh.
#
# Una vuelta de `espejo`: la entrada → los issues abiertos → la adopción de lo local sin issue (esas dos, en cola-entrada.sh) → los
# issues cerrados a mano → las etiquetas de estado → las respuestas a las trabadas → los cierres pendientes → lo que quedó pendiente al
# integrar (al-integrar.sh) y los avisos al kit → la tarea mensual de dependencias (cola-entrada.sh) → la semanal del flujo del kit
# (kit.sh) → el cierre de la tanda (cierre-tanda.sh). Sin red o con el límite de la API, se salta entera y la cola local sigue: nada de lo local se pierde, y la vuelta siguiente
# lo reintenta.
#
# Cada tarea con issue lleva en estado/<ID>/: `issue` (su número), `issue_base` (la huella de la última forma en que archivo e
# issue coincidieron: con ella se sabe cuál de los dos cambió), y las marcas de lo que ya se avisó.

espejo() {
  con_issues || return 0
  gh_en_espera && return 0
  local abiertos j
  if ! asegurar_etiquetas || ! procesar_entrada || ! abiertos=$(issues_abiertos); then
    sin_red
    return 0
  fi
  if [ -f "$EST/.sin-red" ]; then rm -f "$EST/.sin-red" && log "GitHub responde otra vez: el espejo de la cola sigue"; fi
  while IFS= read -r j; do espejo_issue "$j"; done < <(jq -c 'sort_by(.number)[]' <<<"$abiertos")
  adoptar || { sin_red; return 0; }
  revisar_cerrados " $(jq -r '[.[].number] | join(" ")' <<<"$abiertos") " || { sin_red; return 0; }
  while IFS= read -r j; do sincronizar_etiquetas "$j"; done < <(jq -c '.[]' <<<"$abiertos")
  buscar_respuestas
  cerrar_terminales
  al_integrar_pendientes
  avisos_kit_pendientes
  deps_del_mes || sin_red
  kit_semanal || sin_red
  cierre_de_tanda || sin_red
}

sin_red() {
  gh_en_espera && return 0
  [ -f "$EST/.sin-red" ] && return 0
  touch "$EST/.sin-red"
  log "GitHub no responde ($(cat "$EST/.gh-ultimo-error" 2>/dev/null)): sigo con la cola local y reintento el espejo en la vuelta siguiente"
}

# El archivo de una tarea, con el nombre de su rama. Una tarea que ya empezó conserva su nombre (su worktree es de esa rama).
escribir_spec() { # ID texto
  local id=$1 viejo nuevo
  nuevo="$COLA/$id-$(node "$SPEC_ISSUE" tema "$(sed -n 's/^rama: //p' <<<"$2" | head -n 1)").md"
  viejo=$(spec_de "$id" || true)
  if [ -n "$viejo" ] && [ "$viejo" != "$nuevo" ]; then
    if [ "$(estado_de "$id")" = pendiente ] && [ ! -e "$WTS/$id" ]; then rm -f "$viejo"; else nuevo=$viejo; fi
  fi
  printf '%s' "$2" >"$nuevo.tmp" && mv "$nuevo.tmp" "$nuevo"
}

# Otra tarea viva (ni integrada ni omitida) con esa rama y un número menor que `menor_que` (vacío: cualquiera).
tarea_con_rama() { # rama ID-propio menor_que
  local otra
  for otra in $(ids); do
    [ "$otra" = "$2" ] && continue
    [ -n "$3" ] && [ "${otra#T}" -ge "$3" ] && continue
    [ "$(campo "$(spec_de "$otra")" rama)" = "$1" ] || continue
    case "$(estado_de "$otra")" in integrado | omitida) continue ;; esac
    echo "$otra"
    return 0
  done
  return 1
}

# ----------------------------------------------------------------------------------------------------------- issue → archivo

espejo_issue() { # el JSON de un issue abierto con `cola`
  local j=$1 n id spec gen loc base hloc hgen err rc rama otra
  n=$(jq -r .number <<<"$j")
  id="T$n"
  # La spec es el prompt de una sesión autónoma: sólo entra el issue de quien puede escribir en el repo.
  # La marca de ajeno sólo evita repetir el log: cada vuelta lo vuelve a mirar y, si ahora pasa (la app recién reconocida), la quita.
  if ! con_permiso "$j"; then
    [ -f "$EST/.ajenos/$n" ] || { mkdir -p "$EST/.ajenos" && touch "$EST/.ajenos/$n" && log "issue #$n: lo abrió alguien sin permiso de escritura en el repo: no entra a la cola"; }
    return 0
  fi
  if [ -f "$EST/.ajenos/$n" ]; then rm -f "$EST/.ajenos/$n" && log "issue #$n: ahora entra a la cola"; fi
  err=$(mktemp)
  gen=$(node "$SPEC_ISSUE" de-issue <<<"$j" 2>"$err")
  rc=$?
  if [ "$rc" != 0 ]; then
    [ "$rc" = 3 ] && issue_roto "$id" "$j" "$(cat "$err")"
    [ "$rc" = 3 ] || log "$id: no se pudo leer el issue #$n: $(head -c 200 "$err")"
    rm -f "$err"
    return 0
  fi
  rm -f "$err"
  mkdir -p "$EST/$id"
  est_set "$id" issue "$n"
  if [ -f "$EST/$id/issue-roto" ]; then rm -f "$EST/$id/issue-roto" && log "$id: el bloque yaml del issue ya se lee"; fi
  # Dos tareas con la misma rama: la segunda (la de número mayor) queda en borrador.
  rama=$(sed -n 's/^rama: //p' <<<"$gen" | head -n 1)
  if ! grep -qx 'borrador: si' <<<"$gen" && otra=$(tarea_con_rama "$rama" "$id" "$n"); then
    etiquetar "$n" cola:borrador "" "$(nombres_de_etiquetas "$j")"
    if [ "$(est_get "$id" issue_rama_dup)" != "$otra" ]; then
      comentar "$id" "la rama \`$rama\` ya es de $otra: esta queda en borrador. Cambia la rama en el bloque yaml (o cierra una de las dos) y quita la etiqueta cola:borrador." >/dev/null
      est_set "$id" issue_rama_dup "$otra"
    fi
    gen=$(jq -c '.labels += [{"name": "cola:borrador"}]' <<<"$j" | node "$SPEC_ISSUE" de-issue) || return 0
  fi
  hgen=$(huella <<<"$gen")
  spec=$(spec_de "$id" || true)
  if [ -z "$spec" ]; then
    escribir_spec "$id" "$gen"
    est_set "$id" issue_base "$hgen"
    log "$id: nueva en la cola desde el issue #$n"
    return 0
  fi
  loc=$(node "$SPEC_ISSUE" canon "$spec" "$id" 2>/dev/null) || loc=""
  if [ "$loc" = "$gen" ]; then est_set "$id" issue_base "$hgen"; return 0; fi
  base=$(est_get "$id" issue_base)
  hloc=$(huella <<<"$loc")
  # Sólo cambió el archivo: se sube al issue.
  if [ -n "$loc" ] && [ "$hgen" = "$base" ]; then
    subir_spec "$id" "$spec" && est_set "$id" issue_base "$hloc"
    return 0
  fi
  # Cambió el issue: si la tarea corre, se toma en la siguiente retoma (y se avisa una vez).
  if [ "$(estado_de "$id")" = corriendo ]; then
    if [ "$(est_get "$id" issue_visto)" != "$hgen" ]; then
      comentar "$id" "vi el cambio del issue mientras la tarea corre: la sesión en curso sigue con la spec de cuando empezó y el cambio se toma en la siguiente retoma." >/dev/null
      est_set "$id" issue_visto "$hgen"
    fi
    return 0
  fi
  if [ -n "$loc" ] && [ "$hloc" != "$base" ]; then
    cp "$spec" "$EST/$id/spec-local-$(date +%Y%m%d-%H%M%S).md"
    log "$id: cambiaron el issue y el archivo: manda el issue (la copia del archivo quedó en estado/$id/)"
  fi
  escribir_spec "$id" "$gen"
  est_set "$id" issue_base "$hgen"
  log "$id: actualizada desde el issue #$n"
}

issue_roto() { # ID json motivo — comentario con el error (una vez por versión del cuerpo) y cola:borrador
  local id=$1 j=$2 n h
  n=$(jq -r .number <<<"$j")
  h=$(jq -r '.body // ""' <<<"$j" | huella)
  mkdir -p "$EST/$id"
  est_set "$id" issue "$n"
  if [ "$(est_get "$id" issue-roto)" != "$h" ]; then
    comentar "$id" "no puedo leer el bloque yaml del issue: $3. La tarea queda en borrador: arregla el cuerpo (empieza con un bloque \`\`\`yaml con titulo, rama y los demás campos) y quita la etiqueta cola:borrador." >/dev/null
    est_set "$id" issue-roto "$h"
    log "$id: el issue #$n tiene el bloque yaml roto ($3): queda en borrador"
  fi
  grep -qw 'cola:borrador' <<<"$(nombres_de_etiquetas "$j")" || etiquetar "$n" cola:borrador "" "$(nombres_de_etiquetas "$j")"
}

# ----------------------------------------------------------------------------------------------------------- archivo → issue

subir_spec() { # ID archivo — el título y el cuerpo del issue, desde el archivo (las etiquetas las pone sincronizar_etiquetas)
  local id=$1 n j f rc
  n=$(est_get "$id" issue)
  j=$(node "$SPEC_ISSUE" a-issue "$2" 2>/dev/null) || { log "$id: el archivo no se puede subir al issue (spec rota)"; return 1; }
  f=$(mktemp)
  jq -r .cuerpo <<<"$j" >"$f"
  editar_issue "$n" "$(jq -r .titulo <<<"$j")" "$f"
  rc=$?
  rm -f "$f"
  [ "$rc" = 0 ] && log "$id: el archivo cambió: subido al issue #$n"
  return "$rc"
}

# Las etiquetas de estado de un issue abierto, según el estado local (una sola cola:* de estado; cola y cola:urgente aparte).
sincronizar_etiquetas() { # el JSON del issue, como vino de la lista
  local j=$1 n id spec actuales deseadas b poner="" quitar="" e
  n=$(jq -r .number <<<"$j")
  id="T$n"
  spec=$(spec_de "$id") || return 0
  [ "$(est_get "$id" issue)" = "$n" ] || return 0
  actuales=$(nombres_de_etiquetas "$j")
  b=no
  borrador "$spec" && b=si
  deseadas="cola $(etiqueta_de_estado "$(estado_de "$id")" "$b")"
  [ "$(campo "$spec" urgente)" = si ] && deseadas="$deseadas cola:urgente"
  for e in $deseadas; do [[ " $actuales " == *" $e "* ]] || poner="$poner $e"; done
  for e in $actuales; do
    [[ "$e" == cola:* ]] || continue
    [[ " $deseadas " == *" $e "* ]] || quitar="$quitar $e"
  done
  etiquetar "$n" "${poner# }" "${quitar# }" "$actuales"
}

# --------------------------------------------------------------------------------------------------- cerrados, respuestas, cierres

# Una tarea viva cuyo issue ya no está abierto: con cola:integrada o su PR integrado → integrada; cerrado a mano → omitida.
revisar_cerrados() { # " números de los abiertos "
  local id n s j pr
  for id in $(ids); do
    n=$(est_get "$id" issue)
    [ -n "$n" ] || continue
    [[ "$1" == *" $n "* ]] && continue
    s=$(estado_de "$id")
    case "$s" in integrado | omitida) continue ;; esac
    j=$(api_issue "$n") || return 1
    if [ "$(jq -r .state <<<"$j")" = open ]; then
      # Recién creado (la entrada de esta misma vuelta), la lista de abiertos de GitHub puede no traerlo todavía: si el issue
      # sigue con `cola`, nadie se la quitó y no hay nada que avisar.
      [[ " $(nombres_de_etiquetas "$j") " == *" cola "* ]] && continue
      [ -f "$EST/$id/sin-cola-avisada" ] || { log "$id: el issue #$n está abierto pero ya no tiene la etiqueta cola: no se toca"; touch "$EST/$id/sin-cola-avisada"; }
      continue
    fi
    if grep -qw 'cola:integrada' <<<"$(nombres_de_etiquetas "$j")"; then
      est_set "$id" estado integrado
      est_set "$id" issue_cerrado "$(ahora_utc)"
      continue
    fi
    pr=$(est_get "$id" pr)
    if [ -n "$pr" ] && [ "$(ghr pr view "$pr" --json state --jq .state 2>/dev/null)" = MERGED ]; then
      integrada "$id" "$pr"
      continue
    fi
    vivo "$id" && cortar_sesion "$id"
    est_set "$id" estado omitida
    log "$id: su issue #$n se cerró a mano sin integrarse: queda omitida"
    comentar "$id" "cerraste el issue sin que se integrara: la tarea queda omitida (las que dependen de ella siguen)." >/dev/null
    cerrar_issue_de "$id" || true
  done
}

# La respuesta a una trabada: el primer comentario posterior al de la trabada que no es del orquestador ni de un bot.
buscar_respuestas() {
  local id n cid en cs r
  for id in $(ids); do
    [ "$(estado_de "$id")" = trabada ] || continue
    n=$(est_get "$id" issue)
    cid=$(est_get "$id" trabada_comentario)
    en=$(est_get "$id" trabada_en)
    [[ -n "$n" && -n "$cid$en" ]] || continue
    cs=$(ghc api --paginate "repos/{owner}/{repo}/issues/$n/comments?per_page=100") || return 0
    # Sólo cuenta quien puede escribir en el repo (en un repo público, cualquiera puede comentar), y nunca un bot.
    r=$(jq -s -r --arg bot "$BOT" --argjson cid "${cid:-0}" --arg en "$en" --argjson ok "$CON_PERMISO" \
      '[add[]? | select((.body // "" | startswith($bot)) | not) | select(.author_association as $a | $ok | index($a))
        | select((.user.type // "User") != "Bot")
        | select(if $cid > 0 then .id > $cid else .created_at > $en end)] | first | .body // empty' <<<"$cs")
    [ -n "$r" ] && aplicar_respuesta "$id" "$n" "$r"
  done
  return 0
}

aplicar_respuesta() { # ID n texto
  local id=$1 n=$2 j f gen
  printf '%s\n' "$3" >"$EST/$id/respuesta.md"
  j=$(api_issue "$n") || return 0
  f=$(mktemp)
  jq -r '.body // ""' <<<"$j" | node "$SPEC_ISSUE" decision "$(TZ=America/La_Paz date +%F)" "$EST/$id/respuesta.md" >"$f"
  editar_issue "$n" "" "$f" || { rm -f "$f"; return 0; }
  if gen=$(jq -c --rawfile b "$f" '.body = $b' <<<"$j" | node "$SPEC_ISSUE" de-issue 2>/dev/null); then
    escribir_spec "$id" "$gen"
    est_set "$id" issue_base "$(huella <<<"$gen")"
  fi
  rm -f "$f"
  est_del "$id" trabada_comentario
  est_del "$id" trabada_en
  reintentar_tarea "$id" "La persona respondió a lo que trabó la tarea: su respuesta está abajo y ya quedó en la spec, en «Decisiones ya tomadas». Revisa qué quedó hecho en la rama y termina la tarea con esa decisión."
  log "$id: llegó la respuesta a la trabada: $(estado_de "$id")"
  comentar "$id" "recibí tu respuesta: la sumé a «Decisiones ya tomadas» y retomo la tarea." >/dev/null
}

cerrar_terminales() { # las integradas u omitidas cuyo issue no se pudo cerrar todavía (sin red cuando terminaron)
  local id s
  for id in $(ids); do
    s=$(estado_de "$id")
    case "$s" in integrado | omitida) ;; *) continue ;; esac
    [[ -n "$(est_get "$id" issue)" && ! -f "$EST/$id/issue_cerrado" ]] || continue
    cerrar_issue_de "$id" || return 0
  done
}
