import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, expect, it } from 'vitest'
import { normalizarComando } from './resumen-sesion.mjs'
import { aTope, armarResumen, duracion, leerLog, TOPE } from './resumen-tanda.mjs'

// El resumen de la tanda (resumen-tanda.mjs): sobre un estado/ y una cola de juguete en un tmpdir, como los deja el orquestador.

const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

const linea = (o: unknown) => JSON.stringify(o)
const usoDeBash = (id: string, comando: string, ts: string) =>
  linea({
    type: 'assistant',
    timestamp: ts,
    message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command: comando } }] },
  })
const resultadoDe = (id: string, ts: string) =>
  linea({
    type: 'user',
    timestamp: ts,
    message: { content: [{ type: 'tool_result', tool_use_id: id }] },
  })
/** Un mensaje del asistente con su `usage`: el contexto del turno es la suma de entrada, escritura y lectura de caché. */
const turnoCon = (id: string, contexto: number) =>
  linea({
    type: 'assistant',
    message: {
      id,
      content: [],
      usage: {
        input_tokens: 10,
        cache_creation_input_tokens: 90,
        cache_read_input_tokens: contexto - 100,
      },
    },
  })
const final = (ms: number, usd: number, turnos: number, modelos: Record<string, number>) =>
  linea({
    type: 'result',
    duration_ms: ms,
    total_cost_usd: usd,
    num_turns: turnos,
    modelUsage: Object.fromEntries(Object.entries(modelos).map(([m, c]) => [m, { costUSD: c }])),
  })

/** Dos tareas: T1 con plan, sesión y un arreglo; T2 trabada una vez, con una sesión sin evento final y líneas rotas. */
function juguete() {
  const raiz = mkdtempSync(join(tmpdir(), 'resumen-tanda-'))
  raices.push(raiz)
  const est = join(raiz, 'estado')
  const cola = join(raiz, 'cola')
  mkdirSync(join(est, 'T1'), { recursive: true })
  mkdirSync(join(est, 'T2'), { recursive: true })
  mkdirSync(cola)
  writeFileSync(
    join(cola, 'T1-uno.md'),
    '---\nid: T1\ntitulo: hacer lo primero\nrama: feat/uno\n---\n',
  )
  writeFileSync(
    join(cola, 'T2-dos.md'),
    '---\nid: T2\ntitulo: hacer lo segundo\nrama: feat/dos\n---\n',
  )
  writeFileSync(
    join(est, 'orquestador.log'),
    [
      '2026-11-16 10:00:00 T1: lanzada (pendiente → corriendo)',
      '2026-11-16 10:30:00 T1: a arreglar (intento 1): El CI del PR #7 cayó. Jobs en rojo:',
      '2026-11-16 10:40:00 T1: lanzada (por_arreglar → corriendo)',
      '2026-11-16 11:15:00 AVISO · T1 integrada ✓ · PR #7 en main: hacer lo primero',
      '2026-11-16 10:05:00 T2: lanzada (pendiente → corriendo)',
      '2026-11-16 10:50:00 AVISO · T2 trabada · /tmp sin inodos — revisa .orquestador/estado/T2/ y luego reintentar T2',
      '2026-11-16 12:05:00 AVISO · T2 integrada ✓ · PR #8 en main: hacer lo segundo',
      'una línea sin fecha',
    ].join('\n'),
  )
  writeFileSync(join(est, 'T1/pr'), '7\n')
  writeFileSync(join(est, 'T1/arreglos'), '1\n')
  writeFileSync(join(est, 'T1/plan.jsonl'), final(600_000, 2, 10, { opus: 2 }))
  writeFileSync(
    join(est, 'T1/sesion-1-tarea.jsonl'),
    [
      turnoCon('m1', 100_000),
      usoDeBash('a', 'cd /x/.orquestador/worktrees/T1 && pnpm test', '2026-11-16T10:10:00Z'),
      resultadoDe('a', '2026-11-16T10:12:00Z'),
      usoDeBash('b', 'pnpm test', '2026-11-16T10:13:00Z'),
      resultadoDe('b', '2026-11-16T10:13:30Z'),
      turnoCon('m2', 400_000),
      linea({ type: 'system', subtype: 'compact_boundary' }),
      // Dos tramos (siguió tras una tarea en segundo plano): minutos y turnos se suman; costo y modelos, el último.
      final(1_500_000, 5, 35, { opus: 2.5, sonnet: 2.5 }),
      usoDeBash('c', 'git status', '2026-11-16T10:14:00Z'),
      final(300_000, 6, 5, { opus: 3, sonnet: 3 }),
    ].join('\n'),
  )
  symlinkSync(join(est, 'T1/sesion-1-tarea.jsonl'), join(est, 'T1/sesion-actual.jsonl'))
  writeFileSync(join(est, 'T2/pr'), '8\n')
  writeFileSync(join(est, 'T2/retomas'), '2\n')
  writeFileSync(
    join(est, 'T2/sesion-1-tarea.jsonl'),
    ['{rota', usoDeBash('d', 'pnpm test', '2026-11-16T10:20:00Z'), 'null'].join('\n'),
  )
  return { est, cola }
}

const correr = (...args: string[]) =>
  execFileSync('node', [resolve('scripts/orquestador/resumen-tanda.mjs'), ...args], {
    encoding: 'utf8',
  })

it('por tarea: el ciclo, el plan y cada sesión con minutos, costo y turnos, las retomas y los arreglos', () => {
  const { est, cola } = juguete()
  const r = correr('--estado', est, '--cola', cola, 'T1', 'T2', 'T3')
  expect(r).toContain(
    '| T1 hacer lo primero | #7 | 11-16 10:00 → 11:15 (1 h 15) | 10 min · $2.00 · 10 t · ctx — | tarea 30 min · $6.00 · 40 t · ctx 250k/400k · 1 comp | 0/1 |  |',
  )
  // Sin evento final: «—»; trabada, con su motivo sin la coletilla del aviso.
  expect(r).toContain(
    '| T2 hacer lo segundo | #8 | 11-16 10:05 → 12:05 (2 h 00) | — | tarea — · — · ctx — | 2/0 | trabada |',
  )
  expect(r).toContain('- T2: /tmp sin inodos\n')
  expect(r).toContain('- T1: El CI del PR #7 cayó. Jobs en rojo:')
  // Una tarea sin nada en estado/ ni en la cola no rompe.
  expect(r).toContain('| T3 | — | — → — | — | — | 0/0 |  |')
  expect(r).toContain('- 3 tareas · reloj de la tanda 2 h 05 · 40 min de sesiones · $8.00')
  expect(r).toContain('- Por modelo: opus 63 % · sonnet 38 %')
  expect(r).toContain(
    '- Contexto por turno: medio 250k · 50 % de los turnos sobre 300k · compactaciones 1',
  )
  expect(r).toContain('- Retomas 2 · arreglos 1 · trabadas 1 (lo que gastó un intento)')
  expect(r).toContain(
    '- Sesiones: 2 de tarea ($6.00) · 0 de retomar ($0.00) · 0 de seguir ($0.00) · 0 de arreglar ($0.00)',
  )
  // Lo de toda la tanda va antes que la tabla, y la tabla va de la tarea más cara a la más barata.
  expect(r.indexOf('### Totales')).toBe(0)
  expect(r.indexOf('### Trabadas')).toBeLessThan(r.indexOf('### Tareas'))
  expect(r.indexOf('| T1 ')).toBeLessThan(r.indexOf('| T2 '))
})

it('lo que más se repitió: los comandos normalizados y los más lentos por sus timestamps', () => {
  const { est, cola } = juguete()
  const r = correr('--estado', est, '--cola', cola, 'T1', 'T2')
  expect(r).toContain('- 3× `pnpm test`')
  expect(r).toContain('- 1× `git status`')
  expect(r).toMatch(/Los más lentos:\n\n- 2 min `pnpm test`\n- 30 s `pnpm test`\n\n### Tareas/)
})

it('lo puro: el log, las duraciones, los comandos y el tope de 6 KB', () => {
  expect(
    leerLog('2026-01-01 00:00:00 T9: lanzada (x)\n2026-01-01 00:01:00 T9: lanzada (y)')['T9']
      ?.lanzada,
  ).toBe('2026-01-01 00:00:00')
  expect([duracion(5), duracion(65), duracion(NaN)]).toEqual(['5 min', '1 h 05', '—'])
  // La carpeta temporal de una sesión se arma aquí: escrita tal cual, versiones-de-modelo.test.ts la tomaría por un id de modelo.
  const temporal = ['/tmp', ['claude', '1000'].join('-'), 'xyz', 'scratchpad'].join('/')
  expect(normalizarComando(`cd /a/b/.orquestador/worktrees/T12 && ls   ${temporal}`)).toBe(
    'ls <tmp>/scratchpad',
  )
  expect(normalizarComando('x'.repeat(150))).toHaveLength(100)
  const largo = Array.from({ length: 400 }, (_, i) => `- línea ${i} con algo de texto`).join('\n')
  const recortado = aTope(largo)
  expect(Buffer.byteLength(recortado)).toBeLessThanOrEqual(TOPE)
  expect(recortado).toMatch(/\n\(recortado a 6 KB\)\n$/)
  const muchas = Array.from({ length: 120 }, (_, i) => ({
    id: `T${i}`,
    titulo: 'una tarea con un título bastante largo para llenar',
    pr: String(i),
    retomas: 0,
    arreglos: 0,
    sesiones: [],
    log: { arreglos: [], choques: [], trabas: [] },
  }))
  // Con muchas tareas se recorta la cola de la tabla, nunca los totales ni las trabas.
  const resumen = armarResumen(muchas)
  expect(Buffer.byteLength(resumen)).toBeLessThanOrEqual(TOPE)
  expect(resumen).toContain('- 120 tareas ·')
  expect(resumen).toContain('### Trabadas')
  expect(resumen).toMatch(/\n\(recortado a 6 KB\)\n$/)
})

it('el log: las dos formas del «a arreglar», los choques aparte y los motivos repetidos juntos', () => {
  const log = leerLog(
    [
      '2026-01-01 00:00:00 T5: a arreglar (intento 1): El CI del PR #9 cayó: e2e · bloque 2 de 4.',
      '2026-01-01 00:01:00 T5: a arreglar (intento 2): El PR #9 choca con main (conflicto de merge).',
      '2026-01-01 00:02:00 T5: a arreglar (arreglos: 2): El CI del PR #9 cayó: e2e · bloque 2 de 4.',
      '2026-01-01 00:03:00 T5: a arreglar (choques: 1): El PR #9 choca con main (conflicto de merge).',
    ].join('\n'),
  )
  expect(log['T5']?.arreglos).toHaveLength(2)
  expect(log['T5']?.choques).toHaveLength(2)
  const r = armarResumen([
    {
      id: 'T5',
      titulo: '',
      pr: '9',
      retomas: 0,
      arreglos: 2,
      sesiones: [],
      log: log['T5'] ?? { arreglos: [], choques: [], trabas: [] },
    },
  ])
  expect(r).toContain('### A arreglar\n\n- T5 (×2): El CI del PR #9 cayó: e2e · bloque 2 de 4.\n')
  expect(r).toContain(
    '### Choques con main\n\n- T5 (×2): El PR #9 choca con main (conflicto de merge).\n',
  )
})
