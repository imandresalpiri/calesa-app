import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import { avisoDelCambioDeNivel, cambioDeNivel, nivelEfectivo } from './nivel-al-mover'
import { moverItemA } from './orden-del-diseno'

const d = disenoDe([
  seccion('base', [celda('a'), celda('b', { nivel_ver: 'gerencia', nivel_editar: 'gerencia' })]),
  seccion('costos', [celda('neto')], { nivel_ver: 'costos', nivel_editar: 'costos' }),
])
const NOMBRES: Record<string, string> = { costos: 'Costos', gerencia: 'Gerencia' }
const nombreDe = (clave: string) => NOMBRES[clave] ?? clave

describe('el nivel de una pieza al moverla', () => {
  it('el suyo, si no el de su sección, si no «todos»', () => {
    expect(nivelEfectivo(d, 'base', { tipo: 'celda', nodo: 'a' })).toEqual({
      ver: 'todos',
      editar: 'todos',
    })
    expect(nivelEfectivo(d, 'base', { tipo: 'celda', nodo: 'b' })).toEqual({
      ver: 'gerencia',
      editar: 'gerencia',
    })
    expect(nivelEfectivo(d, 'costos', { tipo: 'celda', nodo: 'neto' })).toEqual({
      ver: 'costos',
      editar: 'costos',
    })
    expect(nivelEfectivo(d, 'base', { tipo: 'celda', nodo: 'zz' })).toBeNull()
  })

  it('avisa sólo si cambia quién la ve o quién la edita', () => {
    const pieza = { tipo: 'celda', nodo: 'a' } as const
    const movido = moverItemA(d, { seccion: 'base', ...pieza }, { seccion: 'costos', indice: 0 })
    const cambio = cambioDeNivel(
      { diseno: d, seccion: 'base' },
      { diseno: movido, seccion: 'costos' },
      pieza,
    )
    expect(cambio && avisoDelCambioDeNivel(cambio, nombreDe)).toBe(
      'Ahora la ve «Costos»: antes la veían todos.',
    )
    const vuelta = cambioDeNivel(
      { diseno: movido, seccion: 'costos' },
      { diseno: d, seccion: 'base' },
      pieza,
    )
    expect(vuelta && avisoDelCambioDeNivel(vuelta, nombreDe)).toBe(
      'Ahora la ven todos: antes la veía «Costos».',
    )
    const propia = { tipo: 'celda', nodo: 'b' } as const
    const conSuNivel = moverItemA(
      d,
      { seccion: 'base', ...propia },
      { seccion: 'costos', indice: 0 },
    )
    expect(
      cambioDeNivel(
        { diseno: d, seccion: 'base' },
        { diseno: conSuNivel, seccion: 'costos' },
        propia,
      ),
    ).toBeNull()
  })

  it('si sólo cambia quién la edita, lo dice', () => {
    expect(
      avisoDelCambioDeNivel(
        { antes: { ver: 'todos', editar: 'todos' }, despues: { ver: 'todos', editar: 'costos' } },
        nombreDe,
      ),
    ).toBe('Ahora la edita «Costos»: antes la editaban todos.')
  })
})
