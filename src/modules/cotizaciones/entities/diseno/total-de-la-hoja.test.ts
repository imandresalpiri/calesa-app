import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import {
  admiteElTotal,
  dondeVaElTotal,
  MOTIVO_DEL_TOTAL_CON_NIVEL,
  MOTIVO_DEL_TOTAL_EN_AVANZADO,
  motivoParaElTotal,
  ubicarElTotal,
} from './total-de-la-hoja'

const viejo = disenoDe([
  seccion('extras', [celda('c')], { presentacion: 'avanzado' }),
  seccion('costos', [celda('neto')], { nivel_ver: 'costos', nivel_editar: 'costos' }),
  seccion('base', [celda('a'), celda('b')]),
])

describe('dónde va la tarjeta del total', () => {
  it('va en una sección principal que ven todos', () => {
    expect(admiteElTotal({ presentacion: 'principal' })).toBe(true)
    expect(admiteElTotal({ presentacion: 'principal', nivel_ver: 'todos' })).toBe(true)
    expect(motivoParaElTotal({ presentacion: 'avanzado' })).toBe(MOTIVO_DEL_TOTAL_EN_AVANZADO)
    expect(motivoParaElTotal({ presentacion: 'principal', nivel_ver: 'costos' })).toBe(
      MOTIVO_DEL_TOTAL_CON_NIVEL,
    )
  })

  it('un diseño de antes no la ubica (va sola arriba de «Avanzado»); «Ubicar en la hoja» la pone en el primer lugar libre de la primera que la admite', () => {
    expect(dondeVaElTotal(viejo)).toBeNull()
    const ubicado = ubicarElTotal(viejo)
    expect(dondeVaElTotal(ubicado)).toEqual({
      seccion: 'base',
      indice: 2,
      posicion: { columna: 1, fila: 3 },
    })
    expect(ubicarElTotal(ubicado)).toBe(ubicado)
  })

  it('sin una sección que la admita, el diseño queda igual', () => {
    const sinLugar = disenoDe([seccion('extras', [celda('a')], { presentacion: 'avanzado' })])
    expect(ubicarElTotal(sinLugar)).toBe(sinLugar)
  })
})
