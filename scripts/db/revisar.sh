#!/usr/bin/env bash
# Lo que el job «Base» del CI compara de la base contra el repo, igual y en local: `pnpm db:lint` y, con su salida, advisors (splinter con
# los schemas de [api] y la regla de advisors.sql), los avisos de db:lint contra su lista y el inventario (scripts/despliegue/revisar-base.mjs).
# El CI llama a este mismo script (`pnpm db:revisar`): lo que pasa aquí, pasa allá. Corre contra la base de esta pila; antes, `pnpm db:reset`.
#   pnpm db:revisar
# Sale con 1 si `db:lint` cae o si algo no coincide (dice qué función y cuántos avisos contra su lista). Candado ocupado: 75, como los otros.
set -uo pipefail

TEMPORAL="$(mktemp -d "${TMPDIR:-/tmp}/db-revisar.XXXXXX")"
trap 'rm -rf "$TEMPORAL"' EXIT
SALIDA="$TEMPORAL/db-lint.txt"

# La pila apagada o sin sembrar se nota en la conexión: se dice qué correr en vez de dejar el error crudo.
pista() {
  grep -qiE 'connect|refused|not running|no such (host|container)|failed to inspect|does not exist' "$1" &&
    echo "✗ no hay base a la que revisar: la pila de este worktree está apagada o sin sembrar. Corre pnpm db:reset y vuelve a pnpm db:revisar." >&2
}

if ! pnpm db:lint >"$SALIDA" 2>&1; then
  cat "$SALIDA"
  pista "$SALIDA"
  exit 1
fi

pnpm exec tsx scripts/despliegue/revisar-base.mjs advisors db-lint "$SALIDA" inventario 2>&1 | tee "$TEMPORAL/revisar.txt"
estado=${PIPESTATUS[0]}
[ "$estado" -eq 0 ] || pista "$TEMPORAL/revisar.txt"
exit "$estado"
