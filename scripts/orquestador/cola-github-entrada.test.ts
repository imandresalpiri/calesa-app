import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { cuerpo, escenario, TIEMPO } from './prueba/escenario'

// La entrada de la cola en los issues (README.md › «La cola en los issues»): de a un proceso con su candado, y la spec con la rama de
// una tarea integrada, con un gh falso (prueba/escenario.ts).

it(
  'cola en issues › la entrada se publica de a un proceso: con el candado tomado por otro, espera y no abre un issue de más',
  async () => {
    const t = escenario()
    mkdirSync(join(t.datos, 'entrada'))
    writeFileSync(
      join(t.datos, 'entrada/nueva.md'),
      '---\ntitulo: una nueva\nrama: feat/nueva\n---\n',
    )
    mkdirSync(join(t.datos, 'estado'), { recursive: true })
    const candado = join(t.datos, 'estado/.entrada.lock')
    // Otro proceso (la vuelta del bucle) publicando: tiene el candado.
    const otro = spawn('flock', [candado, 'sleep', '30'])
    while (spawnSync('flock', ['-n', candado, 'true']).status === 0)
      await new Promise((r) => setTimeout(r, 50))
    try {
      expect(t.orqCon({ ENTRADA_ESPERA_S: '1' }, 'entrada').estado).toBe(0)
      expect(t.gh().issues).toEqual({})
      expect(existsSync(join(t.datos, 'entrada/nueva.md'))).toBe(true)
      expect(t.log()).toContain('la entrada la está publicando otro proceso')
    } finally {
      otro.kill()
    }
    await new Promise((r) => otro.once('exit', r))
    t.orq('entrada')
    expect(Object.keys(t.gh().issues)).toEqual(['5'])
    expect(existsSync(join(t.datos, 'entrada/nueva.md'))).toBe(false)
  },
  TIEMPO,
)

it(
  'cola en issues › una spec de la entrada con la rama de una tarea integrada no se publica y queda con su motivo',
  () => {
    const t = escenario()
    t.issue(5, cuerpo('feat/cinco'))
    t.orq('espejo')
    t.ponerEst('T5', 'estado', 'integrado')
    mkdirSync(join(t.datos, 'entrada'))
    writeFileSync(
      join(t.datos, 'entrada/otra.md'),
      '---\ntitulo: otra vez\nrama: feat/cinco\n---\n',
    )
    expect(t.orq('entrada').estado).toBe(0)
    expect(Object.keys(t.gh().issues)).toEqual(['5'])
    expect(readFileSync(join(t.datos, 'entrada/otra.md.error'), 'utf8')).toContain(
      'la rama «feat/cinco» ya es de T5, que está integrada',
    )
    // Con otra rama, se publica.
    writeFileSync(
      join(t.datos, 'entrada/otra.md'),
      '---\ntitulo: otra vez\nrama: feat/cinco-2\n---\n',
    )
    t.orq('entrada')
    expect(t.cola()).toEqual(['T5-cinco.md', 'T6-cinco-2.md'])
  },
  TIEMPO,
)
