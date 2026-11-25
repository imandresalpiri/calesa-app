import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import {
  esperar,
  estado,
  lanzarGuion,
  leer,
  logDe,
  type Maquina,
  maquina,
  matarTodo,
  orq,
  repo,
  type Repo,
  sesiones,
  tarea,
  TIEMPO,
} from './prueba/maquina'

// El límite del plan (orquestador.sh › pausar_por_limite, maquina.sh): la pausa dura hasta la hora en que el límite se renueva, un
// solo aviso por pausa, y con la cuenta al borde del límite semanal no se lanzan planes ni sesiones del nivel capaz. Con el guion
// real y el `claude` falso (prueba/claude-falso.sh, prueba/maquina.ts).
let m: Maquina | undefined
afterEach(() => {
  if (m) matarTodo(m)
  m = undefined
})

const ahora = () => Math.floor(Date.now() / 1000)
const MARGEN = 120
const estadoDeLaMaquina = (mm: Maquina, f: string) => join(mm.home, '.local/state/orquestador', f)
const pausaDe = (mm: Maquina) => Number(leer(estadoDeLaMaquina(mm, 'pausa-hasta')).trim())
const avisos = (r: Repo, titulo: string) =>
  logDe(r)
    .split('\n')
    .filter((l) => l.includes(`AVISO · ${titulo}`)).length

/** Corre T1 de `r` con el claude falso en ese modo y espera a que quede para retomar con la pausa escrita. */
async function cortarPorLimite(mm: Maquina, r: Repo, extra: Record<string, string>) {
  lanzarGuion(r, extra, 'correr', 'T1')
  expect(await esperar(() => estado(r, 'T1') === 'por_retomar' && pausaDe(mm) > 0)).toBe(true)
  return pausaDe(mm)
}

it(
  'la pausa dura hasta el resetsAt del rate_limit_event rejected, más 2 minutos',
  async () => {
    m = maquina()
    const a = repo(m, 'uno')
    tarea(a, 'T1')
    const resets = ahora() + 3 * 3600
    const hasta = await cortarPorLimite(m, a, {
      CLAUDE_FALSO_MODO: 'limite-evento',
      CLAUDE_FALSO_RESETS: String(resets),
      // El texto trae otra hora: manda el evento.
      CLAUDE_FALSO_TEXTO: "You've hit your weekly limit · resets 11pm (UTC)",
    })
    expect(hasta).toBe(resets + MARGEN)
    expect(estado(a, 'T1', 'retomas')).toBe('')
    expect(avisos(a, 'Pausa: límite del plan')).toBe(1)
  },
  TIEMPO,
)

it(
  'sin evento lee «resets 11pm (UTC)» del result: la próxima vez que ese huso marque esa hora',
  async () => {
    m = maquina()
    const a = repo(m, 'uno')
    tarea(a, 'T1')
    const hasta = await cortarPorLimite(m, a, {
      CLAUDE_FALSO_MODO: 'limite-texto',
      CLAUDE_FALSO_TEXTO: "You've hit your weekly limit · resets 11pm (UTC)",
    })
    const hoy = new Date()
    let esperado = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 23) / 1000
    if (esperado <= ahora()) esperado += 24 * 3600
    expect(hasta).toBe(esperado + MARGEN)
  },
  TIEMPO,
)

it(
  'sin hora (ni evento ni texto), una hora ya pasada o a más de 8 días: queda PAUSA_POR_LIMITE_MIN',
  async () => {
    const casos: Record<string, string>[] = [
      { CLAUDE_FALSO_MODO: 'limite' },
      { CLAUDE_FALSO_MODO: 'limite-texto', CLAUDE_FALSO_TEXTO: 'You hit your limit' },
      { CLAUDE_FALSO_MODO: 'limite-evento', CLAUDE_FALSO_RESETS: String(ahora() - 100) },
      { CLAUDE_FALSO_MODO: 'limite-evento', CLAUDE_FALSO_RESETS: String(ahora() + 9 * 86400) },
    ]
    for (const extra of casos) {
      m = maquina()
      const a = repo(m, 'uno', 'PAUSA_POR_LIMITE_MIN=30\n')
      tarea(a, 'T1')
      const hasta = await cortarPorLimite(m, a, extra)
      expect(hasta, JSON.stringify(extra)).toBeGreaterThan(ahora() + 29 * 60)
      expect(hasta, JSON.stringify(extra)).toBeLessThanOrEqual(ahora() + 30 * 60)
      matarTodo(m)
    }
    m = undefined
  },
  TIEMPO * 2,
)

it(
  'el límite de 5 horas también pausa hasta su resetsAt',
  async () => {
    m = maquina()
    const a = repo(m, 'uno')
    tarea(a, 'T1')
    const resets = ahora() + 4 * 3600
    const hasta = await cortarPorLimite(m, a, {
      CLAUDE_FALSO_MODO: 'limite-evento',
      CLAUDE_FALSO_TIPO: 'five_hour',
      CLAUDE_FALSO_RESETS: String(resets),
    })
    expect(hasta).toBe(resets + MARGEN)
  },
  TIEMPO,
)

it(
  'dos tareas que se cortan a la vez dejan una pausa, un solo aviso y un solo comentario por racha; una sesión buena borra la marca',
  async () => {
    m = maquina()
    const a = repo(m, 'uno')
    tarea(a, 'T1')
    tarea(a, 'T2')
    const resets = ahora() + 2 * 3600
    const extra = {
      CLAUDE_FALSO_MODO: 'limite-evento',
      CLAUDE_FALSO_RESETS: String(resets),
      CLAUDE_FALSO_DUERME: '2',
    }
    lanzarGuion(a, extra, 'correr', 'T1')
    lanzarGuion(a, extra, 'correr', 'T2')
    expect(await esperar(() => ['T1', 'T2'].every((id) => estado(a, id) === 'por_retomar'))).toBe(
      true,
    )
    expect(pausaDe(m)).toBe(resets + MARGEN)
    expect(avisos(a, 'Pausa: límite del plan')).toBe(1)
    expect(logDe(a)).toContain('también se cortó por el límite del plan')

    // La retoma sale cuando la pausa vence; la marca del comentario queda mientras se siga cortando.
    const pausa = estadoDeLaMaquina(m, 'pausa-hasta')
    writeFileSync(pausa, `${ahora() - 60}\n`)
    // `correr` a mano no pasa por el bucle, que es quien deja el estado previo.
    writeFileSync(join(a.datos, 'estado/T1/previo'), 'por_retomar\n')
    lanzarGuion(a, extra, 'correr', 'T1')
    expect(
      await esperar(() => leer(join(a.datos, 'estado/T1/limite_comentado')).trim() === '1'),
    ).toBe(true)
    expect(await esperar(() => estado(a, 'T1') === 'por_retomar' && pausaDe(m!) > ahora())).toBe(
      true,
    )

    writeFileSync(pausa, `${ahora() - 60}\n`)
    lanzarGuion(a, { CLAUDE_FALSO_DUERME: '1' }, 'correr', 'T1')
    expect(await esperar(() => estado(a, 'T1') === 'trabada')).toBe(true)
    expect(existsSync(join(a.datos, 'estado/T1/limite_comentado'))).toBe(false)
  },
  TIEMPO,
)

it(
  'con la utilización semanal en el umbral no lanza planes ni sesiones del nivel capaz; las normales sí; vencida la semana, vuelve',
  async () => {
    m = maquina()
    const a = repo(m, 'uno')
    tarea(a, 'T1', 'nivel: capaz\n')
    tarea(a, 'T2', 'planificar: si\n')
    tarea(a, 'T3')
    const resets = ahora() + 3 * 3600
    // Una sesión normal que ve 0,96 de uso lo deja anotado para toda la máquina.
    tarea(a, 'T9')
    lanzarGuion(
      a,
      { CLAUDE_FALSO_MODO: 'uso', CLAUDE_FALSO_USO: '0.96', CLAUDE_FALSO_RESETS: String(resets) },
      'correr',
      'T9',
    )
    expect(await esperar(() => estado(a, 'T9') === 'trabada')).toBe(true)
    expect(leer(estadoDeLaMaquina(m, 'uso-semanal')).trim()).toBe(`0.96 ${resets}`)
    const plan = orq(a, {}, 'plan').salida
    expect(plan).toContain('uso semanal de la cuenta al límite')

    lanzarGuion(a, {}, 'bucle')
    expect(await esperar(() => estado(a, 'T3') === 'trabada')).toBe(true)
    await new Promise((r) => setTimeout(r, 3000))
    expect(estado(a, 'T1')).toBe('')
    expect(estado(a, 'T2')).toBe('')
    expect(sesiones(m).filter((s) => s.pwd.includes('/T1') || s.pwd.includes('/T2'))).toHaveLength(
      0,
    )
    expect(avisos(a, 'Pausa: uso semanal')).toBe(1)

    // Pasada la renovación el uso ya no cuenta: las dos esperando se lanzan.
    writeFileSync(estadoDeLaMaquina(m, 'uso-semanal'), `0.96 ${ahora() - 10}\n`)
    expect(await esperar(() => estado(a, 'T1') !== '' && estado(a, 'T2') !== '')).toBe(true)
  },
  TIEMPO,
)

it(
  'por debajo del umbral, o con UMBRAL_USO_SEMANAL=0, una sesión capaz se lanza',
  async () => {
    for (const [uso, umbral] of [
      ['0.90', ''],
      ['0.99', 'UMBRAL_USO_SEMANAL=0\n'],
    ] as const) {
      m = maquina()
      const a = repo(m, 'uno', umbral)
      tarea(a, 'T1', 'nivel: capaz\n')
      const f = estadoDeLaMaquina(m, 'uso-semanal')
      mkdirSync(dirname(f), { recursive: true })
      writeFileSync(f, `${uso} ${ahora() + 3600}\n`)
      lanzarGuion(a, {}, 'correr', 'T1')
      expect(await esperar(() => estado(a, 'T1') === 'trabada'), `${uso} ${umbral}`).toBe(true)
      matarTodo(m)
    }
    m = undefined
  },
  TIEMPO * 2,
)
