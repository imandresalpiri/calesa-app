import { describe, expect, it } from 'vitest'
import type { ContextoDeHoja } from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja, type Entradas } from './entradas'
import { hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import { pisadasDeLaHoja } from './pisadas-de-la-hoja'
import type { RespuestaDeRecalculo } from './recalculo'

// La lista del resumen: `fees` y `garantia` son cálculos (la garantía, con el interruptor «muestra» `mostrar_garantia`), `factor` una tabla e `iva_c` una constante.
const indice = indiceDeHoja(hojaDePrueba().secciones)
const contexto = (
  overrides: Record<string, number>,
  respuesta: RespuestaDeRecalculo | null,
  banderas: string[] = [],
): ContextoDeHoja => {
  const entradas: Entradas = {
    ...ENTRADAS_VACIAS,
    overrides: new Map(Object.entries(overrides)),
    banderas: new Set(banderas),
  }
  return { indice, entradas, respuesta }
}

describe('pisadasDeLaHoja', () => {
  it('una línea por celda pisada, en el orden de la hoja (no en el de lo escrito), con lo escrito y lo calculado', () => {
    const r = respuestaDePrueba({ calculados: { fees: 480, factor: null } })
    expect(pisadasDeLaHoja(contexto({ factor: 0.5, fees: 500 }, r))).toEqual([
      { nodo: 'fees', etiqueta: 'FEES', valor: 500, calculado: 480, formato: 'usd' },
      { nodo: 'factor', etiqueta: 'FACTOR', valor: 0.5, calculado: null, formato: 'raw' },
    ])
  })

  it('sin la respuesta, las líneas sin lo calculado; sin nada pisado, ninguna; una constante escrita no es una pisada', () => {
    expect(pisadasDeLaHoja(contexto({ fees: 500 }, null))).toEqual([
      { nodo: 'fees', etiqueta: 'FEES', valor: 500, calculado: undefined, formato: 'usd' },
    ])
    expect(pisadasDeLaHoja(contexto({}, respuestaDePrueba()))).toEqual([])
    expect(pisadasDeLaHoja(contexto({ iva_c: 0.2, fees_pct: 0.04 }, null))).toEqual([])
  })

  it('una celda que no cuenta no suma: escondida por su interruptor, o apagada por la variante o su condición', () => {
    const r = respuestaDePrueba({ estados: { factor: 'fuera_de_variante' } })
    expect(pisadasDeLaHoja(contexto({ garantia: 90, factor: 0.5 }, r))).toEqual([])
    const conLaBandera = pisadasDeLaHoja(contexto({ garantia: 90 }, r, ['mostrar_garantia']))
    expect(conLaBandera.map((p) => p.nodo)).toEqual(['garantia'])
  })
})
