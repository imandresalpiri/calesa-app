import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import {
  estado,
  leer,
  logDe,
  type Maquina,
  maquina,
  matarTodo,
  orq,
  repo,
  tarea,
  TIEMPO,
} from './prueba/maquina'

// Seguir la sesión (orquestador.sh › seguir_la_sesion): una sesión que termina sin su línea RESULTADO y deja trabajo en segundo plano
// sin terminar, o un error de la API sin respuesta, se sigue con `claude -p --resume <session_id>` en el mismo worktree; como mucho
// MAX_SEGUIR veces, y lo demás va a la retoma de siempre. Con el guion real y el `claude` falso (prueba/claude-falso.sh).
let m: Maquina | undefined
afterEach(() => {
  if (m) matarTodo(m)
  m = undefined
})

/** Corre T1 con el claude falso en ese modo: sus llamadas (una línea por llamada), el log del orquestador y el repo. */
function correr(env: Record<string, string>, local = '') {
  m = maquina()
  const r = repo(m, 'uno', local)
  tarea(r, 'T1')
  const args = join(m.raiz, 'args.log')
  const prompt = join(m.raiz, 'prompt.md')
  orq(r, { CLAUDE_FALSO_ARGS: args, CLAUDE_FALSO_PROMPT: prompt, ...env }, 'correr', 'T1')
  const llamadas = leer(args).trim().split('\n').filter(Boolean)
  return { r, llamadas, prompt: leer(prompt), log: logDe(r) }
}
const seguidas = (llamadas: string[]) => llamadas.filter((l) => l.includes(' --resume ')).length

it(
  'termina esperando una tarea en segundo plano: la sigue con --resume, con el mensaje y sin gastar una retoma',
  () => {
    const { r, llamadas, prompt, log } = correr({
      CLAUDE_FALSO_MODO: 'espera',
      CLAUDE_FALSO_SEGUIDA: 'trabada',
    })
    expect(llamadas).toHaveLength(2)
    expect(llamadas[0]).not.toContain('--resume')
    expect(llamadas[1]).toContain(' --resume sesion-falsa ')
    // Mismo modelo, effort y modo que la sesión que sigue.
    for (const campo of ['--model ', '--effort ', '--permission-mode ']) {
      const de = (l: string | undefined) => new RegExp(`${campo}(\\S+)`).exec(l ?? '')?.[1]
      expect(de(llamadas[1])).toBe(de(llamadas[0]))
    }
    expect(prompt).toContain('Sigue donde quedaste: espera el aviso de lo que lanzaste')
    expect(prompt).toContain('termina con tu línea RESULTADO')
    expect(log).toContain('sigo la sesión sesion-falsa con --resume (1/2)')
    expect(existsSync(join(r.datos, 'estado/T1/sesion-2-seguir.jsonl'))).toBe(true)
    expect(existsSync(join(r.datos, 'estado/T1/prompt-2-seguir.md'))).toBe(true)
    // El RESULTADO de la sesión seguida manda: TRABADA, sin retomas.
    expect(estado(r, 'T1')).toBe('trabada')
    expect(estado(r, 'T1', 'retomas')).toBe('')
  },
  TIEMPO,
)

it(
  'la notificación que llega después del último result también cuenta como pendiente',
  () => {
    const { llamadas } = correr({
      CLAUDE_FALSO_MODO: 'espera-tarde',
      CLAUDE_FALSO_SEGUIDA: 'trabada',
    })
    expect(seguidas(llamadas)).toBe(1)
  },
  TIEMPO,
)

it(
  'un error de la API sin respuesta (con result o sólo por stderr) la sigue',
  () => {
    for (const modo of ['error-api', 'error-api-err']) {
      const { r, llamadas, log } = correr({
        CLAUDE_FALSO_MODO: modo,
        CLAUDE_FALSO_SEGUIDA: 'trabada',
      })
      expect(seguidas(llamadas), modo).toBe(1)
      expect(log).toContain('la cortó un error de la API sin respuesta')
      expect(estado(r, 'T1')).toBe('trabada')
      matarTodo(m!)
    }
  },
  TIEMPO * 2,
)

it(
  'dos seguidas sin RESULTADO: la tercera vez va a la retoma de siempre (que gasta un intento)',
  () => {
    const { r, llamadas } = correr({ CLAUDE_FALSO_MODO: 'espera', CLAUDE_FALSO_SEGUIDA: 'espera' })
    expect(llamadas).toHaveLength(3)
    expect(seguidas(llamadas)).toBe(2)
    expect(estado(r, 'T1')).toBe('por_retomar')
    expect(estado(r, 'T1', 'retomas')).toBe('1')
  },
  TIEMPO,
)

it(
  'MAX_SEGUIR=0 apaga el seguir',
  () => {
    const { r, llamadas } = correr({ CLAUDE_FALSO_MODO: 'espera' }, 'MAX_SEGUIR=0\n')
    expect(llamadas).toHaveLength(1)
    expect(estado(r, 'T1')).toBe('por_retomar')
  },
  TIEMPO,
)

it(
  'sin trabajo pendiente ni error de la API (o con la tarea ya avisada) va a la retoma',
  () => {
    for (const modo of ['sin-resultado', 'espera-avisada']) {
      const { r, llamadas, log } = correr({ CLAUDE_FALSO_MODO: modo })
      expect(llamadas, modo).toHaveLength(1)
      expect(log).not.toContain('sigo la sesión')
      expect(estado(r, 'T1')).toBe('por_retomar')
      expect(estado(r, 'T1', 'retomas')).toBe('1')
      matarTodo(m!)
    }
  },
  TIEMPO * 2,
)

it(
  'sin session_id no hay qué seguir: la retoma',
  () => {
    const { r, llamadas } = correr({ CLAUDE_FALSO_MODO: 'espera', CLAUDE_FALSO_SIN_ID: '1' })
    expect(llamadas).toHaveLength(1)
    expect(estado(r, 'T1')).toBe('por_retomar')
  },
  TIEMPO,
)

it(
  'si el --resume falla, la retoma de siempre',
  () => {
    const { r, llamadas } = correr({
      CLAUDE_FALSO_MODO: 'espera',
      CLAUDE_FALSO_SEGUIDA: 'no-hay-conversacion',
    })
    expect(seguidas(llamadas)).toBe(1)
    expect(estado(r, 'T1')).toBe('por_retomar')
    expect(estado(r, 'T1', 'retomas')).toBe('1')
    expect(leer(join(r.datos, 'estado/T1/motivo_retomar'))).toContain('terminó con error 1')
  },
  TIEMPO,
)
