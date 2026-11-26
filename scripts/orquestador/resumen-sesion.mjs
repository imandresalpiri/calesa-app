// Una sesión de `claude -p` (su stream-json, estado/<ID>/<nombre>.jsonl) en lo que necesita el resumen de la tanda (resumen-tanda.mjs):
// minutos, costo, turnos y costo por modelo de sus eventos `{"type":"result",…}`, y cada comando de Bash con lo que tardó (del
// `timestamp` del tool_use al de su tool_result, si los dos lo traen). Una sesión que sigue después de una tarea en segundo plano deja
// un `result` por tramo (la que el orquestador sigue con `--resume` es otro archivo, `sesion-<n>-seguir`, con los suyos): `duration_ms` y `num_turns` son del tramo (se suman); `total_cost_usd` y `modelUsage`, de toda la sesión (vale
// el último). Además, el contexto de cada turno (la suma de los tokens de entrada, de escritura y de lectura de caché del `usage` de cada
// mensaje del asistente, una vez por mensaje y sin los de subagentes: su contexto es otro) y las compactaciones (`compact_boundary`).
// Puro y robusto a líneas rotas. Se prueba en resumen-tanda.test.ts.

/**
 * @typedef {{ comando: string, segundos?: number }} Bash
 * @typedef {{ turnos: number, suma: number, max: number, sobre: number }} Contexto  turnos con `usage`, suma y máximo de su contexto, y
 *   cuántos pasaron de UMBRAL_CONTEXTO
 * @typedef {{ nombre: string, minutos?: number, costo?: number, turnos?: number, modelos: Record<string, number>, bash: Bash[], contexto?: Contexto, compactaciones: number }} Sesion
 */

/** Tokens de contexto desde los que un turno cuenta como «alto» (el tope de AUTOCOMPACT_SESION en config.env). */
export const UMBRAL_CONTEXTO = 300000

/** Un comando como se cuenta: en una línea, el worktree de la tarea como <wt> y la carpeta temporal de la sesión como <tmp>, sin el
 * `cd <carpeta> &&` del principio, y 100 caracteres. Puro. @param {string} c */
export function normalizarComando(c) {
  const una = c
    .replace(/\s+/g, ' ')
    .replace(/\S*\/\.orquestador\/worktrees\/T\d+/g, '<wt>')
    .replace(/\/tmp\/claude-\d+\/[^/\s]+/g, '<tmp>')
    .replace(/^\s*cd\s+\S+\s*(&&|;)\s*/, '')
    .trim()
  return una.length > 100 ? `${una.slice(0, 99)}…` : una
}

/** @param {unknown} v */
const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/**
 * @param {string} nombre  el nombre del archivo sin `.jsonl` (plan, sesion-1-tarea…)
 * @param {string} texto  el stream-json
 * @returns {Sesion}
 */
export function leerSesion(nombre, texto) {
  /** @type {Map<string, { b: Bash, desde: number }>} */
  const abiertos = new Map()
  /** @type {Bash[]} */
  const bash = []
  /** @type {any} */
  let final = null
  let ms = 0
  let turnos = 0
  let compactaciones = 0
  /** @type {Set<string>} */
  const vistos = new Set()
  /** @type {Contexto} */
  const ctx = { turnos: 0, suma: 0, max: 0, sobre: 0 }
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue
    /** @type {any} */
    let e
    try {
      e = JSON.parse(linea)
    } catch {
      continue
    }
    if (!e || typeof e !== 'object') continue
    const cuando = typeof e.timestamp === 'string' ? Date.parse(e.timestamp) : NaN
    const contenido = Array.isArray(e.message?.content) ? e.message.content : []
    if (e.type === 'result') {
      final = e
      ms += numero(e.duration_ms) ?? 0
      turnos += numero(e.num_turns) ?? 0
    } else if (e.type === 'system' && e.subtype === 'compact_boundary') compactaciones++
    else if (e.type === 'assistant') {
      anotarContexto(e, vistos, ctx)
      for (const c of contenido) {
        if (c?.type !== 'tool_use' || c.name !== 'Bash' || typeof c.input?.command !== 'string')
          continue
        /** @type {Bash} */
        const b = { comando: normalizarComando(c.input.command) }
        bash.push(b)
        abiertos.set(String(c.id), { b, desde: cuando })
      }
    } else if (e.type === 'user')
      for (const c of contenido) {
        if (c?.type !== 'tool_result') continue
        const a = abiertos.get(String(c.tool_use_id))
        if (!a || !Number.isFinite(a.desde) || !Number.isFinite(cuando)) continue
        abiertos.delete(String(c.tool_use_id))
        a.b.segundos = Math.max(0, (cuando - a.desde) / 1000)
      }
  }
  /** @type {Record<string, number>} */
  const modelos = {}
  for (const [m, u] of Object.entries(final?.modelUsage ?? {})) {
    const usd = numero(/** @type {any} */ (u)?.costUSD)
    if (usd !== undefined) modelos[m] = usd
  }
  return {
    nombre,
    minutos: final ? ms / 60000 : undefined,
    costo: numero(final?.total_cost_usd),
    turnos: final ? turnos : undefined,
    modelos,
    bash,
    contexto: ctx.turnos ? ctx : undefined,
    compactaciones,
  }
}

/** Suma el contexto del turno de un mensaje del asistente a `ctx`: una vez por `message.id` (el stream repite el mensaje por cada
 * bloque) y sólo el del hilo principal. Puro salvo `vistos` y `ctx`. @param {any} e  @param {Set<string>} vistos  @param {Contexto} ctx */
function anotarContexto(e, vistos, ctx) {
  const u = e.message?.usage
  if (!u || typeof u !== 'object' || e.parent_tool_use_id) return
  const id = typeof e.message.id === 'string' ? e.message.id : ''
  if (id) {
    if (vistos.has(id)) return
    vistos.add(id)
  }
  const n =
    (numero(u.input_tokens) ?? 0) +
    (numero(u.cache_creation_input_tokens) ?? 0) +
    (numero(u.cache_read_input_tokens) ?? 0)
  if (!n) return
  ctx.turnos++
  ctx.suma += n
  ctx.max = Math.max(ctx.max, n)
  if (n > UMBRAL_CONTEXTO) ctx.sobre++
}
