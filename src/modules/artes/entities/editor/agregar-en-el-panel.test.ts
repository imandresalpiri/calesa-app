import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_CAPAS_POR_PAGINA } from '../documento'
import { MENSAJE_DEL_TOPE_DE_CAPAS } from './acciones-de-capas'
import {
  MOTIVO_DE_SOLO_LECTURA,
  motivoParaAgregar,
  PROPORCION_SIN_MEDIDAS,
  proporcionDe,
  textoDeLaVariable,
} from './agregar-en-el-panel'
import { pagina, rect } from './capas-de-prueba.soporte'

describe('motivoParaAgregar', () => {
  it('con lugar y permiso, nada lo frena', () => {
    expect(motivoParaAgregar(pagina([rect('a')]), false)).toBeNull()
  })

  it('en sólo lectura, no', () => {
    expect(motivoParaAgregar(pagina([]), true)).toBe(MOTIVO_DE_SOLO_LECTURA)
  })

  it('en el tope de capas, no', () => {
    const llena = pagina(
      Array.from({ length: MAXIMO_DE_CAPAS_POR_PAGINA }, (_, i) => rect(`c${String(i)}`)),
    )
    expect(motivoParaAgregar(llena, false)).toBe(MENSAJE_DEL_TOPE_DE_CAPAS)
  })
})

describe('lo que se agrega', () => {
  it('una variable, entre llaves', () => {
    expect(textoDeLaVariable('marca')).toBe('{marca}')
  })

  it('la proporción es ancho / alto; sin medidas que sirvan, la de reserva', () => {
    expect(proporcionDe({ ancho: 1600, alto: 800 })).toBe(2)
    expect(proporcionDe({ ancho: null, alto: null })).toBe(PROPORCION_SIN_MEDIDAS)
    expect(proporcionDe({ ancho: 0, alto: 100 })).toBe(PROPORCION_SIN_MEDIDAS)
    expect(proporcionDe({ ancho: 100, alto: Number.NaN })).toBe(PROPORCION_SIN_MEDIDAS)
  })
})
