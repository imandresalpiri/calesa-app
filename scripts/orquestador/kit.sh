# shellcheck shell=bash
# Las mejoras del flujo entre el kit y este proyecto (docs/KIT.md › «El flujo entre el kit y los proyectos»; README.md › «La tarea
# semanal del flujo del kit» y «Lo que sube al kit»):
#   - del kit al proyecto: una vez por semana (UTC), si `.kit/version` está atrás del main del kit en algún archivo de flujo y no hay
#     un issue `kit` abierto, la tarea «traer el flujo del kit» (plantillas/traer-flujo-del-kit.md, que corre scripts/kit/actualizar.mjs);
#   - del proyecto al kit: al integrar un PR que toca flujo (scripts/kit/flujo.txt), un issue `cola` «traer de <repo> el PR #<n>» en el
#     kit (plantillas/traer-de-proyecto.md), con el token de la cuenta dueña del kit.
# El kit mismo no hace ninguno de los dos. Lo carga orquestador.sh con `source`, después de al-integrar.sh; usa sus `REPO`, `ORQ`, `EST`,
# `log`, y de github.sh y cola-entrada.sh `ghc`, `REPO_GH`, `publicar_entrada` y `PUBLICADA`.

# Sin acceso al kit, la revisión semanal se vuelve a intentar a las 6 h; a los KIT_FALLOS_AVISO seguidos (un día) avisa una vez, y sigue
# intentando. Si la tarea falla al correr, se traba como cualquiera.
KIT_REINTENTO_S=21600
KIT_FALLOS_AVISO=4

es_el_kit() { [ -f "$REPO/.kit/plantilla" ]; }
# El proyecto puede traer el flujo: tiene la versión del kit de la que salió y el guion que trae.
kit_aplica() { ! es_el_kit && [ -f "$REPO/.kit/version" ] && [ -f "$REPO/scripts/kit/actualizar.mjs" ]; }

# ------------------------------------------------------------------------------------------------ del kit al proyecto, cada semana

# Devuelve 1 sólo si GitHub no respondió al listar los issues de este repo (el espejo lo trata como sin red). Sólo cuenta un issue
# `kit` abierto por quien puede escribir en el repo o por la app del orquestador (alguno_con_permiso). La marca de la semana resuelta
# queda en estado/.kit-semana; la espera tras un fallo al mirar el kit, en estado/.kit-reintento (epoch), y los fallos seguidos, en
# estado/.kit-fallos.
kit_semanal() {
  [ "${KIT_SEMANAL:-si}" = si ] || return 0
  kit_aplica || return 0
  local semana salida rc f
  semana=$(date -u +%G-W%V)
  [ "$(cat "$EST/.kit-semana" 2>/dev/null)" = "$semana" ] && return 0
  [ "$(date +%s)" -lt "$(cat "$EST/.kit-reintento" 2>/dev/null || echo 0)" ] && return 0
  salida=$(ghc api --paginate "repos/{owner}/{repo}/issues?labels=kit&state=open&per_page=100") || return 1
  if alguno_con_permiso "$salida"; then
    echo "$semana" >"$EST/.kit-semana"
    return 0
  fi
  salida=$(cd "$REPO" && KIT_GITHUB="${KIT_GITHUB:-}" node scripts/kit/actualizar.mjs --revisar 2>&1)
  rc=$?
  [ "$rc" = 0 ] || [ "$rc" = 10 ] || { kit_no_responde "$salida"; return 0; }
  rm -f "$EST/.kit-fallos"
  if [ "$rc" = 0 ]; then
    echo "$semana" >"$EST/.kit-semana"
    log "el flujo sigue al día con el kit ($(tail -n 1 <<<"$salida"))"
    return 0
  fi
  f="$EST/traer-kit-$semana.md"
  [ -e "$f" ] || sed -e "s/{{SEMANA}}/$semana/g" -e "s/{{RAMA_SEMANA}}/${semana,,}/g" "$ORQ/plantillas/traer-flujo-del-kit.md" >"$f"
  publicar_entrada "$f" kit || return 1
  if [ -n "$PUBLICADA" ]; then
    echo "$semana" >"$EST/.kit-semana"
    log "$PUBLICADA: la tarea de traer el flujo del kit ($(tail -n 1 <<<"$salida")), a la cola"
  elif [ -f "$f.error" ]; then
    # Una plantilla que no se lee es del repo: se dice una vez y no se reintenta hasta la semana siguiente.
    echo "$semana" >"$EST/.kit-semana"
    log "✗ la tarea de traer el flujo del kit no se publica: plantillas/traer-flujo-del-kit.md no se lee ($(cat "$f.error"))"
  fi
}

kit_no_responde() { # salida de actualizar.mjs --revisar
  local n
  echo $(($(date +%s) + KIT_REINTENTO_S)) >"$EST/.kit-reintento"
  n=$(($(cat "$EST/.kit-fallos" 2>/dev/null || echo 0) + 1))
  echo "$n" >"$EST/.kit-fallos"
  log "✗ no pude mirar el kit: $(tail -n 1 <<<"$1") (se vuelve a mirar en 6 h)"
  [ "$n" = "$KIT_FALLOS_AVISO" ] &&
    avisar "no puedo mirar el kit desde hace un día" "$(tail -n 1 <<<"$1"). Sigo intentando cada 6 h; a mano: node scripts/kit/actualizar.mjs --revisar" default warning
  return 0
}

# ------------------------------------------------------------------------------------------------- del proyecto al kit, al integrar

# Al integrar un PR que toca flujo, su tarea en el kit. Como al-integrar.sh: `integrada` la marca pendiente antes de dejar la tarea
# integrada y la intenta al final; si GitHub falla, el espejo la reintenta cada AL_INTEGRAR_ESPERA segundos, hasta AL_INTEGRAR_MAX_FALLOS.
# El estado, en estado/<ID>/: `aviso_kit` (pendiente | hecho | nada | fallido), `aviso_kit_fallos`, `aviso_kit_intento` (epoch),
# `aviso_kit_issue` (la URL del issue del kit), `aviso_kit.md` (lo último que pasó), `al-kit.md` (la spec), y `al-kit-titulo` y
# `al-kit-cuerpo.md` (el issue). Una tarea de traer el flujo del kit (rama chore/flujo-del-kit-*) no avisa: lo que trae ya es del kit.
kit_avisa() { [ "${KIT_AVISAR:-si}" = si ] && ! es_el_kit && [ -f "$REPO/scripts/kit/flujo.mjs" ] && [ -n "$REPO_GH" ]; }
kit_del_kit() { echo "${KIT_GITHUB:-imandresalpiri/kit}"; }
# `gh` con el token del dueño del kit sólo en esta llamada (KIT_TOK, local de quien llama): la cuenta activa no cambia.
ghk() { local -x GH_TOKEN="$KIT_TOK"; ghc "$@"; }

marcar_aviso_kit() { # ID — antes de `estado integrado`: si el proceso muere entre medio, el aviso queda pendiente
  local id=$1
  kit_avisa || return 0
  [ -n "$(est_get "$id" pr)" ] || return 0
  [ -z "$(est_get "$id" aviso_kit)" ] || return 0
  [[ "$(campo "$(spec_de "$id")" rama)" == chore/flujo-del-kit-* ]] && return 0
  est_set "$id" aviso_kit pendiente
  est_set "$id" aviso_kit_fallos 0
}

avisar_al_kit() { # ID
  local id=$1 pr kit archivos lista j err titulo url rc KIT_TOK
  [ "$(est_get "$id" aviso_kit)" = pendiente ] || return 0
  est_set "$id" aviso_kit_intento "$(date +%s)"
  pr=$(est_get "$id" pr)
  kit=$(kit_del_kit)
  archivos=$(ghc api --paginate "repos/{owner}/{repo}/pulls/$pr/files?per_page=100")
  rc=$?
  [ "$rc" = 0 ] || { aviso_kit_fallo "$id" "no pude leer los archivos del PR #$pr" "$rc"; return 0; }
  # --paginate concatena un arreglo por página.
  lista=$(jq -s 'add // []' <<<"$archivos") || { aviso_kit_fallo "$id" "los archivos del PR #$pr no se leen" final; return 0; }
  err=$(mktemp)
  if ! node "$REPO/scripts/kit/flujo.mjs" spec-al-kit "$ORQ/plantillas/traer-de-proyecto.md" "$REPO_GH" "$PROYECTO" "$pr" \
    <<<"$lista" >"$EST/$id/al-kit.md" 2>"$err"; then
    aviso_kit_fallo "$id" "no pude armar la tarea del kit: $(head -c 200 "$err")" final
    rm -f "$err"
    return 0
  fi
  if [ ! -s "$EST/$id/al-kit.md" ]; then
    rm -f "$err" "$EST/$id/al-kit.md"
    est_set "$id" aviso_kit nada
    return 0
  fi
  if ! j=$(node "$SPEC_ISSUE" a-issue "$EST/$id/al-kit.md" 2>"$err"); then
    aviso_kit_fallo "$id" "la tarea del kit no se lee: $(head -c 200 "$err")" final
    rm -f "$err"
    return 0
  fi
  rm -f "$err"
  titulo=$(jq -r .titulo <<<"$j")
  printf '%s\n' "$titulo" >"$EST/$id/al-kit-titulo"
  jq -r .cuerpo <<<"$j" >"$EST/$id/al-kit-cuerpo.md"
  # Como la app, su token (la misma instalación cubre el kit). Sin ella, el del dueño del kit; un kit de una organización no tiene
  # sesión de gh (docs/LECCIONES.md): vale el de la máquina.
  if [ "${ORQ_GH_TOKEN_APP:-0}" = 1 ]; then
    KIT_TOK=$GH_TOKEN
  else
    KIT_TOK=$(gh auth token --user "${kit%%/*}" 2>/dev/null) || KIT_TOK=""
    [ -n "$KIT_TOK" ] || KIT_TOK=${GH_TOKEN:-$(gh auth token 2>/dev/null)}
  fi
  [ -n "$KIT_TOK" ] || { aviso_kit_fallo "$id" "sin sesión de gh de ${kit%%/*} (gh auth login)"; return 0; }
  url=$(ghk api -X POST "repos/$kit/issues" -f title="$titulo" -F body=@"$EST/$id/al-kit-cuerpo.md" -f 'labels[]=cola' --jq .html_url)
  rc=$?
  [ "$rc" = 0 ] || { aviso_kit_fallo "$id" "no pude crear el issue en $kit" "$rc"; return 0; }
  est_set "$id" aviso_kit hecho
  est_set "$id" aviso_kit_issue "$url"
  log "$id: llevé al kit lo de flujo del PR #$pr: $url"
  comentar "$id" "llevé al kit lo de flujo de este PR: $url" >/dev/null
}

aviso_kit_fallo() { # ID motivo [final | el código de ghc: 1 GitHub falló, 2 el límite de la API (no cuenta como fallo)]
  local id=$1 motivo=$2 n pr kit a_mano
  if [ "${3:-}" = 2 ] && con_issues; then return 0; fi
  [ "${3:-}" = 1 ] && motivo="$motivo: $(cat "$EST/.gh-ultimo-error" 2>/dev/null)"
  sumar "$id" aviso_kit_fallos
  n=$(num "$id" aviso_kit_fallos)
  printf '%s · intento %s: %s\n' "$(date '+%F %T')" "$n" "$motivo" >"$EST/$id/aviso_kit.md"
  if [ "${3:-}" != final ] && [ "$n" -lt "$AL_INTEGRAR_MAX_FALLOS" ] && con_issues; then
    log "$id: no pude llevar al kit el PR (intento $n de $AL_INTEGRAR_MAX_FALLOS): $motivo; se reintenta en el espejo"
    return 0
  fi
  est_set "$id" aviso_kit fallido
  pr=$(est_get "$id" pr)
  kit=$(kit_del_kit)
  a_mano="revisa estado/$id/al-kit.md"
  if [ -s "$EST/$id/al-kit-cuerpo.md" ]; then
    if [ "${ORQ_GH_TOKEN_APP:-0}" = 1 ]; then
      a_mano="bash scripts/orquestador/como-app.sh gh api -X POST repos/$kit/issues -f title='$(cat "$EST/$id/al-kit-titulo")'"
    else
      a_mano="GH_TOKEN=\$(gh auth token --user ${kit%%/*}) gh api -X POST repos/$kit/issues -f title='$(cat "$EST/$id/al-kit-titulo")'"
    fi
    a_mano="$a_mano -F body=@$EST/$id/al-kit-cuerpo.md -f 'labels[]=cola'"
  fi
  echo "A mano: $a_mano" >>"$EST/$id/aviso_kit.md"
  comentar "$id" "no pude llevar al kit lo de flujo del PR #$pr: $motivo. A mano: \`$a_mano\`" >/dev/null
  avisar "$id: no pude llevar al kit el PR #$pr" "$motivo. A mano: $a_mano" high warning "$(enlace_issue "$id")"
}

# El espejo reintenta los pendientes una vez cada AL_INTEGRAR_ESPERA. Con la cola sólo local no hay espejo: el primer fallo ya es
# `fallido`, y el bucle sólo recoge lo que un corte dejó pendiente.
avisos_kit_pendientes() {
  local id ult ahora
  ahora=$(date +%s)
  for id in $(ids); do
    [ "$(estado_de "$id")" = integrado ] || continue
    [ "$(est_get "$id" aviso_kit)" = pendiente ] || continue
    ult=$(est_get "$id" aviso_kit_intento)
    [ $((ahora - ${ult:-0})) -ge "$AL_INTEGRAR_ESPERA" ] || continue
    avisar_al_kit "$id"
  done
  return 0
}

linea_aviso_kit() { # ID → el sufijo que muestra `plan`
  case "$(est_get "$1" aviso_kit)" in
    pendiente) echo " · falta llevar al kit" ;;
    fallido) echo " · no se pudo llevar al kit (estado/$1/aviso_kit.md)" ;;
  esac
  return 0
}
