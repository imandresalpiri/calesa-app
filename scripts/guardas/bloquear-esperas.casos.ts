// Las tablas de `bloquear-esperas.sh` (en `bloquear-peligrosos.test.ts`): una espera que sondea se rechaza; lanzarlo con
// `run_in_background` y esperar el aviso, no. `herramienta` es Bash si no se dice; `segundoPlano` es el `run_in_background` del Bash.
export type CasoDeEspera = {
  comando: string
  herramienta?: 'Bash' | 'Monitor'
  segundoPlano?: boolean
}

export const BLOQUEA_ESPERAS: CasoDeEspera[] = [
  // un bucle con sleep en primer plano
  { comando: 'until grep -q "^exit " $TMPDIR/verificar.log; do sleep 15; done' },
  { comando: 'while ! grep -q listo $TMPDIR/e2e.log; do sleep 10; done; tail -30 $TMPDIR/e2e.log' },
  { comando: 'for i in $(seq 1 11); do grep -q "^exit " $TMPDIR/v.log && break; sleep 10; done' },
  { comando: 'while sleep 3; do pgrep -f playwright || break; done' },
  { comando: 'until [ -f $TMPDIR/listo ]; do sleep 1; done' },
  { comando: 'timeout 600 bash -c "until grep -q fin v.log; do sleep 5; done"' },
  {
    comando:
      'bash scripts/flujo/verificar.sh > $TMPDIR/v.log 2>&1 &\nuntil grep -q "^exit " $TMPDIR/v.log\ndo\n  sleep 20\ndone',
  },
  // un sleep largo
  { comando: 'sleep 600' },
  { comando: 'sleep 6' },
  { comando: 'sleep 5.5' },
  { comando: 'sleep 2m' },
  { comando: 'sleep infinity' },
  { comando: 'sleep 30 && tail -30 $TMPDIR/verificar.log' },
  { comando: 'bash scripts/flujo/verificar.sh; sleep 120; cat $TMPDIR/v.log' },
  { comando: 'timeout 20 sleep 15' },
  // un Monitor que sólo cuenta tiempo
  { comando: 'sleep 580; echo tick', herramienta: 'Monitor' },
  { comando: 'sleep 300 && echo "pasaron 5 min"', herramienta: 'Monitor' },
  { comando: 'while true; do sleep 60; echo tick; done', herramienta: 'Monitor' },
  { comando: 'sleep 580', herramienta: 'Monitor' },
  // un Monitor con run_in_background sigue siendo un temporizador
  { comando: 'sleep 580; echo tick', herramienta: 'Monitor', segundoPlano: true },
]

export const PASA_ESPERAS: CasoDeEspera[] = [
  // lo mismo, lanzado con run_in_background (se espera el aviso)
  {
    comando: 'until grep -q "^exit " $TMPDIR/verificar.log; do sleep 15; done',
    segundoPlano: true,
  },
  { comando: 'sleep 600', segundoPlano: true },
  { comando: 'bash scripts/flujo/verificar.sh', segundoPlano: true },
  { comando: 'node scripts/e2e-afectados.mjs --correr > $TMPDIR/e2e.log 2>&1', segundoPlano: true },
  // un sleep corto suelto
  { comando: 'sleep 1' },
  { comando: 'sleep 5' },
  { comando: 'sleep 0.5' },
  { comando: 'sleep 3 && curl -sf localhost:3000' },
  { comando: 'pnpm dev & sleep 2; curl -sf localhost:3000' },
  // un bucle sin sleep, o un guion que se corre (el hook mira el comando, no el guion)
  { comando: 'for f in docs/*.md; do wc -l "$f"; done' },
  { comando: 'while read -r l; do echo "$l"; done < lista.txt' },
  { comando: 'bash scripts/espera.sh' },
  { comando: 'pnpm test:e2e e2e/leads.spec.ts' },
  { comando: 'tail -30 $TMPDIR/verificar.log' },
  // el texto de un mensaje que sólo nombra la palabra
  { comando: 'git commit -m "docs(docs): no sondear con sleep"' },
  { comando: 'grep -rn sleep scripts/' },
  // un Monitor que sí lee un archivo o un log
  {
    comando: 'tail -f $TMPDIR/e2e.log | grep --line-buffered -E "passed|failed"',
    herramienta: 'Monitor',
  },
  {
    comando: 'until grep -q "^exit " $TMPDIR/verificar.log; do sleep 5; done; echo listo',
    herramienta: 'Monitor',
  },
  { comando: 'while true; do tail -1 $TMPDIR/e2e.log; sleep 60; done', herramienta: 'Monitor' },
  { comando: 'sleep 30; tail -3 $TMPDIR/v.log', herramienta: 'Monitor' },
  { comando: 'gh run watch 123 --exit-status', herramienta: 'Monitor' },
]
