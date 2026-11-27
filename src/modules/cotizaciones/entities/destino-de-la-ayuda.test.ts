import { describe, expect, it } from 'vitest'
import type { ContextoDeHoja } from './binding'
import {
  avisoDelValor,
  destinoDeLaAyuda,
  destinosDelBloque,
  nombreDelValor,
  textoDelValor,
} from './destino-de-la-ayuda'
import { ENTRADAS_VACIAS, indiceDeHoja, type Entradas } from './entradas'
import { hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import type { RespuestaDeRecalculo } from './recalculo'

const indice = indiceDeHoja(hojaDePrueba().secciones)
const contexto = (
  respuesta: RespuestaDeRecalculo | null = respuestaDePrueba(),
  entradas: Entradas = ENTRADAS_VACIAS,
): ContextoDeHoja => ({ indice, entradas, respuesta })
const REGIONAL = { locale: 'es-BO', monedaBase: 'BOB' }

describe('destinoDeLaAyuda: la celda que llena un valor, sólo si se puede tipear ahora', () => {
  it('el principal de una celda que se edita, con su rótulo y su formato', () => {
    expect(destinoDeLaAyuda(contexto(), 'remate')).toStrictEqual({
      nodo: 'remate',
      celda: 'remate',
      lado: 'principal',
      etiqueta: 'REMATE',
      formato: 'usd',
    })
  })

  it('el secundario de un par lleva el rótulo de la celda y el formato del porcentaje', () => {
    expect(destinoDeLaAyuda(contexto(), 'transf_pct')).toStrictEqual({
      nodo: 'transf_pct',
      celda: 'transferencia',
      lado: 'secundario',
      etiqueta: 'TRANSFERENCIA',
      formato: 'pct',
    })
  })

  it('un cálculo que se puede pisar también se llena (queda «Editado a mano», como al tiparlo)', () => {
    expect(destinoDeLaAyuda(contexto(), 'fees')).toMatchObject({ nodo: 'fees' })
  })

  it('sin destino: un lado con candado (se calcula, de nivel, del vehículo) o un nodo que la hoja no tiene', () => {
    const c = contexto()
    for (const nodo of ['transferencia', 'seguro_pct', 'de_nivel', 'del_vehiculo', 'no_existe']) {
      expect(destinoDeLaAyuda(c, nodo), nodo).toBeNull()
    }
    expect(destinoDeLaAyuda(c, null)).toBeNull()
  })

  it('sin destino si la celda está fuera de su variante o la esconde su interruptor apagado', () => {
    expect(
      destinoDeLaAyuda(
        contexto(respuestaDePrueba({ estados: { solo_moto: 'fuera_de_variante' } })),
        'solo_moto',
      ),
    ).toBeNull()
    // `mostrar_garantia` apagada: la celda no se dibuja.
    expect(destinoDeLaAyuda(contexto(), 'garantia')).toBeNull()
    const encendida = { ...ENTRADAS_VACIAS, banderas: new Set(['mostrar_garantia']) }
    expect(destinoDeLaAyuda(contexto(respuestaDePrueba(), encendida), 'garantia')).toMatchObject({
      nodo: 'garantia',
    })
  })

  it('destinosDelBloque: sólo las columnas que llenan una celda que se tipea', () => {
    const destinos = destinosDelBloque(contexto(), [
      { columna: 'iva', llena: 'transf_pct' },
      { columna: 'zona', llena: null },
      { columna: 'flete', llena: 'transferencia' },
    ])
    expect([...destinos.keys()]).toStrictEqual(['iva'])
    expect(destinosDelBloque(contexto(), null).size).toBe(0)
  })
})

describe('los textos del valor que se usa', () => {
  const iva = {
    nodo: 'transf_pct',
    celda: 'transferencia',
    lado: 'secundario' as const,
    etiqueta: 'IVA',
    formato: 'pct' as const,
  }
  const flete = {
    nodo: 'flete',
    celda: 'flete',
    lado: 'principal' as const,
    etiqueta: 'Flete',
    formato: 'usd' as const,
  }

  it('cada formato como lo dice su celda: el porcentaje desde su fracción', () => {
    expect(textoDelValor(0.1494, 'pct', REGIONAL)).toMatch(/^14,94\s?%$/)
    expect(textoDelValor(1500, 'usd', REGIONAL)).toMatch(/1\.500,00/)
    expect(textoDelValor(1500, 'usd', REGIONAL)).toMatch(/US\$|USD/)
    expect(textoDelValor(12.5, 'raw', REGIONAL)).toBe('12,5')
  })

  it('el nombre del botón y el aviso dicen la cifra y la celda', () => {
    expect(nombreDelValor(iva, 0.1494, REGIONAL, false)).toMatch(/^Usar 14,94\s?% en IVA$/)
    expect(avisoDelValor(iva, 0.1494, REGIONAL, false)).toMatch(/^IVA = 14,94\s?%$/)
  })

  it('con el Modo Live un monto va sin su moneda, con la misma cifra; un porcentaje, igual', () => {
    expect(textoDelValor(1500, 'usd', REGIONAL, true)).toBe('1.500,00')
    expect(textoDelValor(1500, 'moneda', REGIONAL, true)).toBe('1.500,00')
    expect(nombreDelValor(flete, 1500, REGIONAL, true)).toBe('Usar 1.500,00 en Flete')
    expect(avisoDelValor(flete, 1500, REGIONAL, true)).toBe('Flete = 1.500,00')
    expect(avisoDelValor(flete, 1500, REGIONAL, false)).toMatch(/US\$|USD/)
    expect(avisoDelValor(iva, 0.1494, REGIONAL, true)).toMatch(/^IVA = 14,94\s?%$/)
  })
})
