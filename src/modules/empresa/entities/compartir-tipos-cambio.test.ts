import { describe, expect, it } from 'vitest'
import {
  armarTextoParaCompartir,
  caracteresDeLaLeyenda,
  idsParaCompartir,
  normalizarLeyenda,
  TOPE_PARA_COMPARTIR,
  valorParaCompartir,
  type ParaCompartir,
} from './compartir-tipos-cambio'

const A = '0b1f4b00-0000-4000-8000-000000000001'
const B = '0b1f4b00-0000-4000-8000-000000000002'

const datos: ParaCompartir = {
  empresa: 'Importadora Andina',
  logoUrl: null,
  colorAcento: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  ahora: '2026-11-17T18:30:00.000Z',
  leyenda: 'Valores referenciales',
  tipos: [
    { id: A, nombre: 'Oficial', monedaDe: 'USD', monedaA: 'BOB', valor: 6.96 },
    { id: B, nombre: 'Paralelo', monedaDe: 'USD', monedaA: 'BOB', valor: 12.405 },
  ],
}

describe('valorParaCompartir', () => {
  it('dice «1 USD = » y el monto con los decimales que tiene el valor', () => {
    expect(valorParaCompartir(datos.tipos[0]!, 'es-BO').replace(/\s/g, ' ')).toBe('1 USD = Bs 6,96')
    expect(valorParaCompartir(datos.tipos[1]!, 'es-BO')).toContain('12,405')
  })

  it('usa el locale de la empresa', () => {
    expect(valorParaCompartir(datos.tipos[0]!, 'en-US')).toContain('6.96')
  })

  it('con `sinMoneda`, el valor sin su moneda y con los mismos decimales; «1 USD» queda', () => {
    expect(valorParaCompartir(datos.tipos[0]!, 'es-BO', { sinMoneda: true })).toBe('1 USD = 6,96')
    expect(valorParaCompartir(datos.tipos[1]!, 'es-BO', { sinMoneda: true })).toBe('1 USD = 12,405')
  })
})

describe('armarTextoParaCompartir', () => {
  it('trae la empresa, el momento en su zona, un tipo por línea y la leyenda', () => {
    // Espacios finos del locale a espacios comunes, sin tocar los saltos de línea.
    const lineas = armarTextoParaCompartir(datos)
      .replace(/[^\S\n]/g, ' ')
      .split('\n')
    expect(lineas[0]).toBe('*Importadora Andina*')
    expect(lineas[1]).toMatch(/^Tipos de cambio · 17 nov 2026, 14:30 /)
    expect(lineas[2]).toBe('')
    expect(lineas[3]).toBe('Oficial: 1 USD = Bs 6,96')
    expect(lineas[4]).toMatch(/^Paralelo: 1 USD = Bs 12,405$/)
    expect(lineas[5]).toBe('')
    expect(lineas[6]).toBe('Valores referenciales')
    expect(lineas).toHaveLength(7)
  })

  it('con `sinMoneda` (la vista del Modo Live) los mismos valores sin su moneda', () => {
    const texto = armarTextoParaCompartir({ ...datos, sinMoneda: true })
    expect(texto).toContain('Oficial: 1 USD = 6,96')
    expect(texto).not.toContain('Bs')
  })

  it('sin leyenda no deja línea vacía al final', () => {
    const texto = armarTextoParaCompartir({ ...datos, leyenda: '   ' })
    expect(texto.endsWith('\n')).toBe(false)
    expect(texto).not.toContain('Valores')
  })

  it('un asterisco en el nombre no rompe la negrita', () => {
    expect(armarTextoParaCompartir({ ...datos, empresa: 'Auto*Sur' }).split('\n')[0]).toBe(
      '*AutoSur*',
    )
  })

  it('un nombre que se queda vacío no deja asteriscos sueltos', () => {
    const lineas = armarTextoParaCompartir({ ...datos, empresa: '**' }).split('\n')
    expect(lineas[0]).toBe('Tipos de cambio')
    expect(lineas[1]).toMatch(/^17 nov 2026/)
  })
})

describe('normalizarLeyenda y caracteresDeLaLeyenda', () => {
  it('recorta y vacía es ninguna', () => {
    expect(normalizarLeyenda('  hola ')).toBe('hola')
    expect(normalizarLeyenda('   ')).toBeNull()
    expect(normalizarLeyenda(null)).toBeNull()
  })

  it('un emoji cuenta como uno', () => {
    expect(caracteresDeLaLeyenda('a😀')).toBe(2)
  })
})

describe('idsParaCompartir', () => {
  it('lee los ids separados por coma y quita los repetidos', () => {
    expect(idsParaCompartir(`${A},${B},${A}`)).toEqual([A, B])
  })

  it('rechaza lo que no es una lista de guid', () => {
    expect(idsParaCompartir(null)).toBeNull()
    expect(idsParaCompartir('')).toBeNull()
    expect(idsParaCompartir(`${A},no-es-un-id`)).toBeNull()
  })

  it('rechaza más de los que caben', () => {
    const muchos = Array.from(
      { length: TOPE_PARA_COMPARTIR + 1 },
      (_, n) => `0b1f4b00-0000-4000-8000-${String(n).padStart(12, '0')}`,
    )
    expect(idsParaCompartir(muchos.join(','))).toBeNull()
    expect(idsParaCompartir(muchos.slice(0, TOPE_PARA_COMPARTIR).join(','))).toHaveLength(
      TOPE_PARA_COMPARTIR,
    )
  })
})
