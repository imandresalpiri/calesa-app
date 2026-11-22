import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { TOPE_DE_TABLAS_DEL_CATALOGO } from '../../entities/catalogo-de-tablas'
import { consultaDelCatalogo, leerCatalogoDeTablasSobre } from './consulta-del-catalogo-de-tablas'

type Llamada = [string, ...unknown[]]

// Un cliente que anota cada llamada de la consulta y responde lo que se le da.
function clienteFalso(respuesta: { data: unknown; error: { message: string } | null }) {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'or', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  consulta['then'] = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve(respuesta).then(resolver)
  const cliente = {
    from: (nombre: string) => {
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const ID = (n: number) => `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`
const fila = (n: number, clave: string, origen: string | null, columnas: string[]) => ({
  id: ID(n),
  clave,
  nombre: `Tabla ${clave}`,
  origen_id: origen,
  columnas: columnas.map((c) => ({ clave: c, etiqueta: c.toUpperCase(), tipo: 'numero' })),
})
const deLaTabla = (n: number, clave: string, compartida: boolean, columnas: string[]) => ({
  id: ID(n),
  clave,
  nombre: `Tabla ${clave}`,
  compartida,
  columnas: columnas.map((c) => ({ clave: c, etiqueta: c.toUpperCase(), tipo: 'numero' })),
})

describe('consultaDelCatalogo', () => {
  it('las activas del origen y las compartidas, por clave con la del origen antes, con tope + 1', () => {
    const { cliente, llamadas } = clienteFalso({ data: [], error: null })
    void consultaDelCatalogo(cliente, ORIGEN)
    expect(llamadas).toEqual([
      ['from', 'tablas_referencia'],
      ['select', 'id, clave, nombre, origen_id, columnas'],
      ['eq', 'activa', true],
      ['or', `origen_id.eq.${ORIGEN},origen_id.is.null`],
      ['order', 'clave'],
      ['order', 'origen_id', { nullsFirst: false }],
      ['limit', TOPE_DE_TABLAS_DEL_CATALOGO + 1],
    ])
  })
})

describe('leerCatalogoDeTablasSobre', () => {
  it('una por clave (la del origen tapa a la compartida) con su id, su nombre y sus columnas', async () => {
    const { cliente } = clienteFalso({
      data: [
        fila(1, 'aranceles', null, ['anio', 'tasa']),
        fila(2, 'fletes', ORIGEN, ['desde', 'hasta', 'monto']),
        fila(3, 'fletes', null, ['monto']),
      ],
      error: null,
    })
    expect(await leerCatalogoDeTablasSobre(cliente, ORIGEN)).toEqual([
      deLaTabla(1, 'aranceles', true, ['anio', 'tasa']),
      deLaTabla(2, 'fletes', false, ['desde', 'hasta', 'monto']),
    ])
  })

  it('más allá del tope no entra', async () => {
    const muchas = Array.from({ length: TOPE_DE_TABLAS_DEL_CATALOGO + 1 }, (_, i) =>
      fila(i, `t${String(i).padStart(3, '0')}`, ORIGEN, ['monto']),
    )
    const { cliente } = clienteFalso({ data: muchas, error: null })
    expect(await leerCatalogoDeTablasSobre(cliente, ORIGEN)).toHaveLength(
      TOPE_DE_TABLAS_DEL_CATALOGO,
    )
  })

  it('un error de la base, una forma que no se entiende o un origen que no es un guid dan null', async () => {
    const conError = clienteFalso({ data: null, error: { message: 'permission denied' } })
    expect(await leerCatalogoDeTablasSobre(conError.cliente, ORIGEN)).toBeNull()
    const rara = clienteFalso({
      data: [{ id: ID(1), clave: 'x', nombre: 'X', origen_id: null, columnas: 'no' }],
      error: null,
    })
    expect(await leerCatalogoDeTablasSobre(rara.cliente, ORIGEN)).toBeNull()
    const sinPedir = clienteFalso({ data: [], error: null })
    expect(await leerCatalogoDeTablasSobre(sinPedir.cliente, 'no-es-un-guid')).toBeNull()
    expect(sinPedir.llamadas).toEqual([])
  })
})
