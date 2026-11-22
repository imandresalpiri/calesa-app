# shellcheck shell=bash
# El cierre de la tanda (README.md › «El cierre de la tanda»): cuando la cola se queda quieta después de una tanda de actualizaciones,
# el orquestador verifica `main` de punta a punta (el e2e de escritorio por workflow_dispatch) y encola la tarea que aplasta los docs,
# saca lo que sobra y hace la retro con datos (plantillas/cerrar-tanda.md, con el resumen de resumen-tanda.mjs). Si main está en rojo,
# encola antes la tarea urgente de dejarlo verde (plantillas/main-en-rojo.md). Al integrarse el cierre, la tanda siguiente cuenta desde
# ahí y se podan los transcriptos de las sesiones de la tanda cerrada.
#
# Sólo con la cola en issues, nunca en el kit ni en un repo en construcción (ése tiene su cierre de la construcción). CIERRE_TANDA="no"
# lo apaga. Lo llama `espejo` en cada vuelta (cola-github.sh), después de kit_semanal; `integrada` llama a cierre_al_integrar.
#
# El estado, en estado/: `.cierre-desde` (epoch: lo integrado antes no cuenta; se crea la primera vez, para no cerrar la historia
# vieja), `.cierre-run` («<sha> <id de la corrida | -> <epoch del disparo>»: la verificación de main en curso), `.cierre-rojo` (el sha
# cuyo rojo ya se encoló), `.cierre-publicado` (el T<n> del cierre en camino), `.cierre-trabadas` y `.cierre-frenado` (lo ya dicho en
# el log), `.cierre-roto` (el sha con el que una plantilla no se leyó) y, en estado/<ID>/, `cierre_hecho`. Lo carga orquestador.sh con
# `source`, después de kit.sh; usa sus `campo`, `spec_de`, `ids`, `estado_de`, `est_get`, `deps_listas`, `manifiesto`, `log` y `avisar`,
# de github.sh `ghc`, `con_issues`, `REPO_GH` y `alguno_con_permiso`, de cola-entrada.sh `publicar_entrada` y `PUBLICADA`, y de kit.sh
# `es_el_kit`. La verificación de main está en cierre-main.sh.

# Las ramas de lo que entra solo a la cola: no son de la tanda. La de dependencias sale de su plantilla; la de la noche roja, de
# scripts/flujo/noche-textos.mjs (`fix/e2e-noche-<n>`); la del flujo del kit, de plantillas/traer-flujo-del-kit.md.
CIERRE_RAMAS_SOLAS="chore/flujo-del-kit- fix/e2e-noche-"

cierre_aplica() {
  [ "${CIERRE_TANDA:-si}" = si ] && con_issues && ! es_el_kit && [ "$(manifiesto etapa)" != construccion ]
}

# El prefijo de la rama de la tarea mensual de dependencias (chore/dependencias-{{MES}} → chore/dependencias-).
rama_de_deps() { sed -n 's/^rama: //p' "$ORQ/plantillas/dependencias.md" | head -n 1 | sed 's/{{.*//'; }

# Una tarea que no cuenta para la tanda: la del cierre y las mejoras que abre (`cierre:`), y lo que entra solo a la cola.
no_cuenta() { # spec
  local rama p
  [ -n "$(campo "$1" cierre)" ] && return 0
  rama=$(campo "$1" rama)
  for p in $CIERRE_RAMAS_SOLAS $(rama_de_deps); do [[ "$rama" == "$p"* ]] && return 0; done
  return 1
}

terminada_en() { # ID → epoch en que se integró (u omitió): integrado_en, si no el cierre del issue, si no cuándo cambió su estado
  local f
  for f in "$(est_get "$1" integrado_en)" "$(est_get "$1" issue_cerrado)"; do
    [ -n "$f" ] && date -d "$f" +%s 2>/dev/null && return 0
  done
  stat -c %Y "$EST/$1/estado" 2>/dev/null || echo 0
}

tareas_de_la_tanda() { # desde (epoch) → los ids integrados desde entonces que cuentan
  local id
  for id in $(ids); do
    [ "$(estado_de "$id")" = integrado ] || continue
    [ "$(terminada_en "$id")" -ge "$1" ] || continue
    no_cuenta "$(spec_de "$id")" || echo "$id"
  done
}

# Nada corriendo, esperando al CI, por arreglar o retomar, ni pendiente lanzable. Una trabada tampoco deja cerrar: queda en
# CIERRE_TRABADAS.
cola_quieta() {
  local id
  CIERRE_TRABADAS=""
  for id in $(ids); do
    case "$(estado_de "$id")" in
      integrado | omitida) ;;
      trabada) CIERRE_TRABADAS="$CIERRE_TRABADAS $id" ;;
      pendiente) deps_listas "$(spec_de "$id")" && return 1 ;;
      *) return 1 ;;
    esac
  done
  [ -z "$CIERRE_TRABADAS" ]
}

# 0 si hay un issue `cierre` abierto por quien puede escribir en el repo o la app del orquestador; 1 si no; 2 si GitHub no respondió.
cierre_abierto() {
  local salida
  salida=$(ghc api --paginate "repos/{owner}/{repo}/issues?labels=cierre&state=open&per_page=100") || return 2
  alguno_con_permiso "$salida"
}

# Devuelve 1 sólo si GitHub no respondió (el espejo lo trata como sin red).
cierre_de_tanda() {
  cierre_aplica || return 0
  local tanda n sha rc
  if [[ ! "$(cat "$EST/.cierre-desde" 2>/dev/null)" =~ ^[0-9]+$ ]]; then
    date +%s >"$EST/.cierre-desde"
    log "el cierre de la tanda cuenta desde ahora: lo integrado antes no entra"
    return 0
  fi
  cierres_terminados
  [ -f "$EST/.cierre-publicado" ] && return 0
  if ! cola_quieta; then
    if [ -n "$CIERRE_TRABADAS" ] && [ "$(cat "$EST/.cierre-trabadas" 2>/dev/null)" != "$CIERRE_TRABADAS" ]; then
      echo "$CIERRE_TRABADAS" >"$EST/.cierre-trabadas"
      log "la tanda no se cierra con tareas trabadas:$CIERRE_TRABADAS"
    fi
    return 0
  fi
  rm -f "$EST/.cierre-trabadas"
  tanda=$(tareas_de_la_tanda "$(cat "$EST/.cierre-desde")")
  n=$(wc -w <<<"$tanda")
  [ "$n" -ge "${CIERRE_MIN_TAREAS:-3}" ] || return 0
  cierre_abierto
  rc=$?
  [ "$rc" = 2 ] && return 1
  if [ "$rc" = 0 ]; then
    [ -f "$EST/.cierre-frenado" ] || { touch "$EST/.cierre-frenado" && log "hay un issue cierre abierto: no encolo otro cierre de la tanda"; }
    return 0
  fi
  rm -f "$EST/.cierre-frenado"
  sha=$(ghc api "repos/{owner}/{repo}/commits/main" --jq .sha) || return 1
  [ -n "$sha" ] || return 0
  main_en_verde "$sha"
  rc=$?
  [ "$rc" = 1 ] && return 1
  [ "$rc" = 0 ] || return 0
  publicar_cierre "$sha" "$tanda"
}

# Las migraciones de main (la copia de la principal, que al-dia.sh mantiene al día). Más de una (la base) → el cierre las aplasta.
migraciones_de_main() {
  local n=0 f
  for f in "$REPO"/supabase/migrations/*.sql; do [ -e "$f" ] && n=$((n + 1)); done
  echo "$n"
}

# Cada cierre deja una sola migración, como el cierre a mano de T21–T40: si main tiene más de una, encola antes la tarea de
# aplastarlas (plantillas/aplastar-migraciones.md, su propio PR, `cierre: aplastar`) y el cierre depende de ella. Una por cierre
# (estado/.cierre-aplastar); `CIERRE_APLASTAR="no"` lo apaga. Deja en APLASTADO su id, o nada. Devuelve 1 si GitHub no respondió.
encolar_aplastado() { # fecha
  APLASTADO=$(cat "$EST/.cierre-aplastar" 2>/dev/null)
  [ -n "$APLASTADO" ] && return 0
  [ "${CIERRE_APLASTAR:-si}" = si ] || return 0
  local n f
  n=$(migraciones_de_main)
  [ "$n" -gt 1 ] || return 0
  f="$EST/aplastar-migraciones-$1.md"
  sed -e "s/{{FECHA}}/$1/g" -e "s/{{RAMA_FECHA}}/$1/g" -e "s/{{MIGRACIONES}}/$n/g" "$ORQ/plantillas/aplastar-migraciones.md" >"$f"
  publicar_entrada "$f" || return 1
  if [ -n "$PUBLICADA" ]; then
    APLASTADO=$PUBLICADA
    echo "$APLASTADO" >"$EST/.cierre-aplastar"
    log "$APLASTADO: aplastar las $n migraciones de main antes de cerrar la tanda, a la cola"
  elif [ -f "$f.error" ]; then
    log "✗ la tarea de aplastar las migraciones no se publica: plantillas/aplastar-migraciones.md no se lee ($(cat "$f.error")); el cierre sigue sin ella"
  fi
}

publicar_cierre() { # sha tanda
  local sha=$1 tanda=$2 fecha f t id tareas resumen n APLASTADO=""
  [ "$(cat "$EST/.cierre-roto" 2>/dev/null)" = "cierre $sha" ] && return 0
  fecha=$(TZ=America/La_Paz date +%F)
  encolar_aplastado "$fecha" || return 1
  f="$EST/cerrar-tanda-$fecha.md"
  tareas=$(for id in $tanda; do echo "- $id · PR #$(est_get "$id" pr) · $(campo "$(spec_de "$id")" titulo)"; done)
  # shellcheck disable=SC2086 # los ids, uno por argumento
  resumen=$(node "$ORQ/resumen-tanda.mjs" --estado "$EST" --cola "$COLA" $tanda 2>&1) ||
    resumen="(no se pudo armar el resumen: $(tail -n 1 <<<"$resumen"))"
  t=$(<"$ORQ/plantillas/cerrar-tanda.md")
  t=${t//'{{FECHA}}'/$fecha}
  t=${t//'{{RAMA_FECHA}}'/$fecha}
  t=${t//'{{SHA}}'/$sha}
  t=${t//'{{CORRIDA}}'/$(enlace_corrida)}
  t=${t//'{{DEPENDE}}'/$APLASTADO}
  t=${t//'{{APLASTAR}}'/${APLASTADO:-ninguna: main ya tiene una sola migración}}
  t=${t//'{{TAREAS}}'/$tareas}
  printf '%s\n' "${t//'{{RESUMEN}}'/$resumen}" >"$f"
  publicar_entrada "$f" cierre || return 1
  n=$(wc -w <<<"$tanda")
  if [ -n "$PUBLICADA" ]; then
    echo "$PUBLICADA" >"$EST/.cierre-publicado"
    log "$PUBLICADA: el cierre de la tanda ($n tareas, main verde en ${sha:0:7}), a la cola"
    avisar "Tanda cerrándose" "$n tareas, cierre en la cola ($PUBLICADA)" default broom "$(enlace_issue "$PUBLICADA")"
  elif [ -f "$f.error" ]; then
    # Una plantilla que no se lee es del repo: se dice una vez por sha de main.
    echo "cierre $sha" >"$EST/.cierre-roto"
    log "✗ el cierre de la tanda no se publica: plantillas/cerrar-tanda.md no se lee ($(cat "$f.error"))"
  fi
}

# ------------------------------------------------------------------------------------------------------------ al integrarse

# Al integrarse el cierre (o al omitirlo: cerraste su issue a mano), la tanda siguiente cuenta desde ahora. Integrado, además poda los
# transcriptos de las tareas de la tanda cerrada. Una vez por tarea (estado/<ID>/cierre_hecho).
cierre_al_integrar() { # ID
  local spec desde
  spec=$(spec_de "$1") || return 0
  [ "$(campo "$spec" cierre)" = tanda ] || return 0
  [ -f "$EST/$1/cierre_hecho" ] && return 0
  desde=$(cat "$EST/.cierre-desde" 2>/dev/null || echo 0)
  case "$(estado_de "$1")" in
    integrado) podar_tanda "$desde" ;;
    omitida) log "$1: el cierre de la tanda quedó omitido: la tanda siguiente cuenta desde ahora" ;;
    *) return 0 ;;
  esac
  date +%s >"$EST/.cierre-desde"
  rm -f "$EST/.cierre-run" "$EST/.cierre-rojo" "$EST/.cierre-publicado" "$EST/.cierre-roto" "$EST/.cierre-aplastar"
  touch "$EST/$1/cierre_hecho"
}

# Lo que no pasó por `integrada`: un cierre integrado por el espejo (cola:integrada) u omitido.
cierres_terminados() {
  local id
  for id in $(ids); do
    case "$(estado_de "$id")" in integrado | omitida) cierre_al_integrar "$id" ;; esac
  done
}

# Los transcriptos de `claude -p` (sesion-*.jsonl, plan.jsonl y sus .err) de las tareas terminadas desde `desde`: son lo que pesa (la
# tanda T21–T40 dejó 181 MB). Queda lo chico: el estado, el pr, los logs, los prompts y el plan.md.
podar_tanda() { # desde (epoch)
  local id f n=0 bytes=0
  for id in $(ids); do
    case "$(estado_de "$id")" in integrado | omitida) ;; *) continue ;; esac
    [ "$(terminada_en "$id")" -ge "$1" ] || continue
    for f in "$EST/$id"/sesion-*.jsonl "$EST/$id"/plan.jsonl "$EST/$id"/*.jsonl.err; do
      { [ -f "$f" ] && [ ! -L "$f" ]; } || continue
      bytes=$((bytes + $(stat -c %s "$f")))
      rm -f "$f"
      n=$((n + 1))
    done
    rm -f "$EST/$id/sesion-actual.jsonl"
  done
  log "tanda cerrada: podé $n transcriptos de sus sesiones ($(numfmt --to=iec "$bytes") liberados)"
}

# El sufijo del aviso «Cola terminada» si hay un cierre en camino.
linea_cierre() {
  if [ -f "$EST/.cierre-publicado" ]; then
    echo " El cierre de la tanda ($(cat "$EST/.cierre-publicado")) está en la cola."
  elif [ -f "$EST/.cierre-run" ]; then
    echo " Verifico main antes de cerrar la tanda."
  fi
  return 0
}
