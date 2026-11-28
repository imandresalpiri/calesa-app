import { describe, expect, it } from 'vitest'
import { bytesConTope, conEspera, deAPocas } from './bajar-con-tope'

const cuerpo = (...partes: number[]) =>
  new ReadableStream<Uint8Array>({
    start(control) {
      for (const largo of partes) {
        control.enqueue(new Uint8Array(largo).fill(7))
      }
      control.close()
    },
  })

describe('deAPocas', () => {
  it('hace todo en orden sin pasar de las que van a la vez', async () => {
    let enCurso = 0
    let maximo = 0
    const hechos = await deAPocas([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      enCurso++
      maximo = Math.max(maximo, enCurso)
      await new Promise((listo) => setTimeout(listo, 8 - n))
      enCurso--
      return n * 10
    })
    expect(hechos).toEqual([10, 20, 30, 40, 50, 60, 70])
    expect(maximo).toBe(3)
    expect(await deAPocas([], 4, () => Promise.resolve(1))).toEqual([])
  })
})

describe('conEspera', () => {
  it('da lo que llega a tiempo; lo que tarda o falla, nulo', async () => {
    expect(await conEspera(Promise.resolve('sí'), 50)).toBe('sí')
    expect(await conEspera(new Promise((listo) => setTimeout(listo, 200, 'tarde')), 10)).toBeNull()
    expect(await conEspera(Promise.reject(new Error('no')), 50)).toBeNull()
  })
})

describe('bytesConTope', () => {
  it('junta las partes hasta el tope y no lee lo que lo pasa', async () => {
    expect(await bytesConTope(cuerpo(3, 4), 7)).toEqual(new Uint8Array(7).fill(7))
    expect(await bytesConTope(cuerpo(3, 5), 7)).toBeNull()
    expect(await bytesConTope(cuerpo(), 7)).toEqual(new Uint8Array(0))
  })
})
