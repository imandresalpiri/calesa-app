import { describe, expect, it } from 'vitest'
import { destinoDelRechazoDeActivar } from './destino-del-rechazo'

const O = '11111111-1111-4111-8111-111111111111'
const F = '22222222-2222-4222-8222-222222222222'
const BASE = `/configuracion/origenes/${O}`

describe('destinoDelRechazoDeActivar', () => {
  it('un nodo abre la planilla con su fila', () => {
    expect(destinoDelRechazoDeActivar('nodos.flete.formula', O, F)).toEqual({
      etiqueta: 'Ir a la fila',
      ruta: `${BASE}/planilla?formula=${F}&fila=flete`,
    })
  })

  it('un lugar de la tarjeta abre la tarjeta con «Ir a la celda», la fila o la columna', () => {
    expect(destinoDelRechazoDeActivar('celdas.c1.contenido', O, F)).toEqual({
      etiqueta: 'Ir a la celda',
      ruta: `${BASE}/tarjeta?formula=${F}&lugar=celdas.c1.contenido`,
    })
    expect(destinoDelRechazoDeActivar('filas[2]', O, F)?.etiqueta).toBe('Ir a la fila')
    expect(destinoDelRechazoDeActivar('columnas.monto', O, F)?.etiqueta).toBe('Ir a la columna')
  })

  it('la tarjeta, la planilla y el diseño abren su pestaña con la fórmula', () => {
    expect(destinoDelRechazoDeActivar('tarjeta', O, F)).toEqual({
      etiqueta: 'Abrir la tarjeta',
      ruta: `${BASE}/tarjeta?formula=${F}`,
    })
    expect(destinoDelRechazoDeActivar('formula', O, F)?.ruta).toBe(`${BASE}/planilla?formula=${F}`)
    expect(destinoDelRechazoDeActivar('secciones.0.items', O, F)).toEqual({
      etiqueta: 'Abrir la hoja',
      ruta: `${BASE}/hoja?formula=${F}`,
    })
  })

  it('lo demás no tiene destino', () => {
    expect(destinoDelRechazoDeActivar(undefined, O, F)).toBeNull()
    expect(destinoDelRechazoDeActivar('nota', O, F)).toBeNull()
    expect(destinoDelRechazoDeActivar('nodos.', O, F)).toBeNull()
  })
})
