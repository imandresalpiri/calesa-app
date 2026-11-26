// El resumen de una tanda en Markdown (≤ 6 KB), para que la sesión del cierre (plantillas/cerrar-tanda.md) encuentre las falencias con
// datos: los totales (con las sesiones de retomar, de seguir y de arreglar, gasten o no un intento), las trabas, los arreglos y los choques con
// su motivo, los comandos de Bash que más se repitieron y los más lentos y, al final, cada tarea de la más cara a la más barata. Lo
// que se recorta al pasar el tope es la cola de esa tabla, nunca los totales. Lo arma cierre-tanda.sh al publicar el cierre
// (README.md › «El cierre de la tanda»).
//
//   node scripts/orquestador/resumen-tanda.mjs --estado <.orquestador/estado> --cola <.orquestador/cola> T21 T22 …
//
// Sólo lee. Un archivo que falta o una línea rota no lo frenan: lo que no se sabe sale «—». Lo de una sesión (su stream-json) está en
// resumen-sesion.mjs; aquí, leer el estado y el log, y armar el texto (puro). Se prueba en resumen-tanda.test.ts.
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { leerSesion, UMBRAL_CONTEXTO } from './resumen-sesion.mjs'

export const TOPE = 6000

/**
 * @typedef {import('./resumen-sesion.mjs').Sesion} Sesion
 * @typedef {{ lanzada?: string, integrada?: string, arreglos: string[], choques: string[], trabas: string[] }} DelLog
 * @typedef {{ id: string, titulo: string, pr: string, retomas: number, arreglos: number, sesiones: Sesion[], log: DelLog }} Tarea
 */

/** @param {string} f */
const leer = (f) => {
  try {
    return readFileSync(f, 'utf8')
  } catch {
    return ''
  }
}

/** Lo que el log dice de cada tarea: la primera vez que se lanzó, cuándo se integró, cada «a arreglar» (un choque con main, aparte)
 * y cada traba. Lee las dos formas del «a arreglar»: «(intento 2)» y «(arreglos: 2)» o «(choques: 1)». Puro.
 * @param {string} texto  @returns {Record<string, DelLog>} */
export function leerLog(texto) {
  /** @type {Record<string, DelLog>} */
  const por = {}
  const de = (/** @type {string} */ id) => (por[id] ??= { arreglos: [], choques: [], trabas: [] })
  for (const linea of texto.split('\n')) {
    const m = /^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) (.*)$/.exec(linea)
    if (!m) continue
    const [, cuando = '', resto = ''] = m
    let x
    if ((x = /^(T\d+): lanzada /.exec(resto))) de(x[1] ?? '').lanzada ??= cuando
    else if ((x = /^AVISO · (T\d+) integrada /.exec(resto))) de(x[1] ?? '').integrada = cuando
    else if (
      (x = /^(T\d+): a arreglar \((?:intento \d+|(arreglos|choques): \d+)\): (.*)$/.exec(resto))
    )
      // Antes de contarse aparte, un choque se escribía como un intento más: lo delata su motivo.
      de(x[1] ?? '')[
        x[2] === 'choques' || / choca con main/.test(x[3] ?? '') ? 'choques' : 'arreglos'
      ].push(recortar(x[3] ?? '', 200))
    else if ((x = /^AVISO · (T\d+) trabada · (.*)$/.exec(resto)))
      de(x[1] ?? '').trabas.push(
        recortar(
          (x[2] ?? '').replace(/ — (revisa \.orquestador|responde en un comentario).*$/, ''),
          160,
        ),
      )
  }
  return por
}

/** @param {string} s  @param {number} n */
export const recortar = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** @param {string} [fecha] AAAA-MM-DD HH:MM:SS (hora local del orquestador) */
const ms = (fecha) => (fecha ? Date.parse(fecha.replace(' ', 'T')) : NaN)

/** Minutos como «45 min» o «2 h 05». Puro. @param {number} min */
export function duracion(min) {
  if (!Number.isFinite(min)) return '—'
  const m = Math.round(min)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

/** @param {number | undefined} usd */
const dolares = (usd) => (usd === undefined ? '—' : `$${usd.toFixed(2)}`)

/** Tokens en miles: «480k». Puro. @param {number} n */
const miles = (n) => `${Math.round(n / 1000)}k`

/** El contexto de una sesión: «ctx 480k/876k» (promedio/máximo por turno) y las compactaciones; «ctx —» si no hubo `usage`. Puro.
 * @param {Sesion} s */
function celdaDeContexto(s) {
  const c = s.contexto
  const comp = s.compactaciones ? ` · ${s.compactaciones} comp` : ''
  return `ctx ${c ? `${miles(c.suma / c.turnos)}/${miles(c.max)}` : '—'}${comp}`
}

/** Una sesión en una celda: «tarea 58 min · $9.08 · 145 t · ctx 480k/876k». Puro. @param {Sesion} s */
function celdaDeSesion(s) {
  const nombre = s.nombre.replace(/^sesion-\d+-/, '')
  const turnos = s.turnos === undefined ? '' : ` · ${s.turnos} t`
  return `${nombre} ${s.minutos === undefined ? '—' : duracion(s.minutos)} · ${dolares(s.costo)}${turnos} · ${celdaDeContexto(s)}`
}

/** La línea de totales del contexto: promedio por turno, turnos sobre el umbral y compactaciones, de todas las sesiones. Puro.
 * @param {Sesion[]} todas */
function lineaDeContexto(todas) {
  const con = todas.flatMap((s) => (s.contexto ? [s.contexto] : []))
  const turnos = con.reduce((a, c) => a + c.turnos, 0)
  const compactaciones = todas.reduce((a, s) => a + s.compactaciones, 0)
  if (!turnos) return `- Contexto: — · compactaciones ${compactaciones}`
  const medio = con.reduce((a, c) => a + c.suma, 0) / turnos
  const sobre = con.reduce((a, c) => a + c.sobre, 0)
  return `- Contexto por turno: medio ${miles(medio)} · ${Math.round((100 * sobre) / turnos)} % de los turnos sobre ${miles(UMBRAL_CONTEXTO)} · compactaciones ${compactaciones}`
}

/** «11-16 17:59 → 19:28 (1 h 29)». Puro. @param {DelLog} l */
function ciclo(l) {
  const corto = (/** @type {string | undefined} */ f) => (f ? f.slice(5, 16) : '—')
  const total = (ms(l.integrada) - ms(l.lanzada)) / 60000
  return `${corto(l.lanzada)} → ${l.integrada?.slice(0, 10) === l.lanzada?.slice(0, 10) ? (l.integrada?.slice(11, 16) ?? '—') : corto(l.integrada)}${Number.isFinite(total) ? ` (${duracion(total)})` : ''}`
}

/** Los comandos más repetidos y los más lentos entre todas las sesiones. Puro. @param {Tarea[]} tareas */
function repetidos(tareas) {
  const bash = tareas.flatMap((t) => t.sesiones.flatMap((s) => s.bash))
  if (!bash.length) return ['(ninguna sesión dejó comandos de Bash)']
  /** @type {Map<string, number>} */
  const cuenta = new Map()
  for (const b of bash) cuenta.set(b.comando, (cuenta.get(b.comando) ?? 0) + 1)
  const mas = [...cuenta].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10)
  const lineas = ['Los más frecuentes:', '', ...mas.map(([c, n]) => `- ${n}× \`${c}\``)]
  const lentos = bash
    .filter((b) => b.segundos !== undefined)
    .sort((a, b) => (b.segundos ?? 0) - (a.segundos ?? 0))
    .slice(0, 5)
  if (lentos.length)
    lineas.push(
      '',
      'Los más lentos:',
      '',
      ...lentos.map((b) => {
        const s = b.segundos ?? 0
        return `- ${s < 60 ? `${Math.round(s)} s` : duracion(s / 60)} \`${b.comando}\``
      }),
    )
  return lineas
}

/** Los motivos de una lista por tarea, con los repetidos juntos: «- T3 (×2): …». Puro.
 * @param {Tarea[]} tareas  @param {(l: DelLog) => string[]} de */
function motivos(tareas, de) {
  return tareas.flatMap((t) => {
    /** @type {Map<string, number>} */
    const cuenta = new Map()
    for (const m of de(t.log)) cuenta.set(m, (cuenta.get(m) ?? 0) + 1)
    return [...cuenta].map(([m, n]) => `- ${t.id}${n > 1 ? ` (×${n})` : ''}: ${m}`)
  })
}

/** @param {Tarea} t */
const costoDe = (t) => t.sesiones.reduce((a, s) => a + (s.costo ?? 0), 0)

/** El resumen entero, recortado a TOPE bytes: primero lo de toda la tanda y al final la tabla por tarea (lo que se recorta). Puro.
 * @param {Tarea[]} tareas */
export function armarResumen(tareas) {
  const filas = [...tareas]
    .sort((a, b) => costoDe(b) - costoDe(a))
    .map((t) => {
      const plan = t.sesiones.find((s) => s.nombre === 'plan')
      const otras = t.sesiones.filter((s) => s.nombre !== 'plan')
      const trabada = t.log.trabas.length ? 'trabada' : ''
      return `| ${t.id}${t.titulo ? ` ${recortar(t.titulo, 34)}` : ''} | ${t.pr ? `#${t.pr}` : '—'} | ${ciclo(t.log)} | ${plan ? celdaDeSesion(plan).replace(/^plan /, '') : '—'} | ${otras.map(celdaDeSesion).join('; ') || '—'} | ${t.retomas}/${t.arreglos} | ${trabada} |`
    })
  const todas = tareas.flatMap((t) => t.sesiones)
  const costo = todas.reduce((a, s) => a + (s.costo ?? 0), 0)
  /** @type {Record<string, number>} */
  const porModelo = {}
  for (const s of todas)
    for (const [m, usd] of Object.entries(s.modelos)) porModelo[m] = (porModelo[m] ?? 0) + usd
  const modelos = Object.entries(porModelo).sort((a, b) => b[1] - a[1])
  const sumaModelos = modelos.reduce((a, [, v]) => a + v, 0)
  const inicios = tareas.map((t) => ms(t.log.lanzada)).filter(Number.isFinite)
  const fines = tareas.map((t) => ms(t.log.integrada)).filter(Number.isFinite)
  const reloj =
    inicios.length && fines.length ? (Math.max(...fines) - Math.min(...inicios)) / 60000 : NaN
  const minutos = todas.reduce((a, s) => a + (s.minutos ?? 0), 0)
  // Las sesiones por su nombre (sesion-<n>-<tipo>): cuentan también las que no gastaron un intento (un reinicio, el límite del plan,
  // un choque con main), que los contadores de estado/ no ven.
  const deTipo = (/** @type {string} */ tipo) => todas.filter((s) => s.nombre.endsWith(`-${tipo}`))
  const sesionesDe = (/** @type {string} */ tipo) => {
    const l = deTipo(tipo)
    return `${l.length} de ${tipo} (${dolares(l.reduce((a, s) => a + (s.costo ?? 0), 0))})`
  }
  const arreglos = motivos(tareas, (l) => l.arreglos)
  const choques = motivos(tareas, (l) => l.choques)
  const trabas = tareas.flatMap((t) => t.log.trabas.map((m) => `- ${t.id}: ${m}`))
  const texto = [
    '### Totales',
    '',
    `- ${tareas.length} tareas · reloj de la tanda ${duracion(reloj)} · ${duracion(minutos)} de sesiones · ${dolares(costo)}`,
    `- Por modelo: ${modelos.length ? modelos.map(([m, v]) => `${m} ${Math.round((100 * v) / (sumaModelos || 1))} %`).join(' · ') : '—'}`,
    `- Retomas ${tareas.reduce((a, t) => a + t.retomas, 0)} · arreglos ${tareas.reduce((a, t) => a + t.arreglos, 0)} · trabadas ${tareas.filter((t) => t.log.trabas.length).length} (lo que gastó un intento)`,
    `- Sesiones: ${sesionesDe('tarea')} · ${sesionesDe('retomar')} · ${sesionesDe('seguir')} · ${sesionesDe('arreglar')}`,
    lineaDeContexto(todas),
    '',
    '### Trabadas',
    '',
    ...(trabas.length ? trabas : ['(ninguna)']),
    '',
    '### A arreglar',
    '',
    ...(arreglos.length ? arreglos : ['(ninguna)']),
    '',
    '### Choques con main',
    '',
    ...(choques.length ? choques : ['(ninguno)']),
    '',
    '### Lo que más se repitió',
    '',
    ...repetidos(tareas),
    '',
    '### Tareas, de la más cara a la más barata',
    '',
    'Plan y sesiones: minutos · costo · turnos · contexto (promedio/máximo por turno) y compactaciones. RET/ARR: retomas y arreglos.',
    '',
    '| Tarea | PR | Lanzada → integrada | Plan | Sesiones | RET/ARR | |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...filas,
    '',
  ].join('\n')
  return aTope(texto)
}

/** Recorta a TOPE bytes por la última línea entera, y lo dice. Puro. @param {string} texto */
export function aTope(texto) {
  if (Buffer.byteLength(texto) <= TOPE) return texto
  const aviso = '\n(recortado a 6 KB)\n'
  let corte = Buffer.from(texto)
    .subarray(0, TOPE - aviso.length)
    .toString('utf8')
  corte = corte.slice(0, corte.lastIndexOf('\n'))
  return `${corte}${aviso}`
}

// ---------- la CLI ----------

/** Lo de una tarea en estado/<ID>/ y su spec en la cola. @param {string} est  @param {string} cola  @param {string} id
 * @param {Record<string, DelLog>} log  @returns {Tarea} */
function leerTarea(est, cola, id, log) {
  const dir = join(est, id)
  const spec = existsSync(cola)
    ? readdirSync(cola).find((f) => f === `${id}.md` || f.startsWith(`${id}-`))
    : undefined
  const titulo = spec ? (/^titulo:\s*(.*)$/m.exec(leer(join(cola, spec)))?.[1]?.trim() ?? '') : ''
  const sesiones = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.jsonl') && !lstatSync(join(dir, f)).isSymbolicLink())
        .sort((a, b) => orden(a) - orden(b))
        .map((f) => leerSesion(f.replace(/\.jsonl$/, ''), leer(join(dir, f))))
    : []
  const numero = (/** @type {string} */ k) => Number(leer(join(dir, k)).trim()) || 0
  return {
    id,
    titulo,
    pr: leer(join(dir, 'pr')).trim(),
    retomas: numero('retomas'),
    arreglos: numero('arreglos'),
    sesiones,
    log: log[id] ?? { arreglos: [], choques: [], trabas: [] },
  }
}

/** plan primero, después las sesiones por número. @param {string} f */
const orden = (f) => (f.startsWith('plan') ? 0 : Number(/^sesion-(\d+)/.exec(f)?.[1] ?? 999))

/** @param {string[]} argv */
function principal(argv) {
  let est = ''
  let cola = ''
  const ids = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? ''
    if (a === '--estado') est = argv[++i] ?? ''
    else if (a === '--cola') cola = argv[++i] ?? ''
    else if (/^T\d+$/.test(a)) ids.push(a)
    else {
      console.error('uso: node resumen-tanda.mjs --estado <dir> --cola <dir> T<n>…')
      process.exit(64)
    }
  }
  if (!est) {
    console.error('uso: node resumen-tanda.mjs --estado <dir> --cola <dir> T<n>…')
    process.exit(64)
  }
  const log = leerLog(leer(join(est, 'orquestador.log')))
  process.stdout.write(armarResumen(ids.map((id) => leerTarea(est, cola, id, log))))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  principal(process.argv.slice(2))
