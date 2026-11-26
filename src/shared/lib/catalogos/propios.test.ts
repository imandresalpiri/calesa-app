// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../scripts/lib/definicion-sql'
import {
  claveDeCatalogo,
  claveDePuerto,
  loQueUsaElOrigen,
  loQueUsanLosOrigenes,
  tapadoPor,
  type FilaPropiaOCompartida,
} from './propios'

const NOMBRES = [
  'Valparaíso',
  'VALPARAÍSO',
  '  Puerto   de\tSan Antonio\n',
  'SÃO PAULO',
  'línea\r\nnueva\fy\vvertical',
  'con espacio duro',
  ' bordes duros ',
  'Øresund',
  'Æbeltoft',
  'Ñandú',
  'Çé',
  'MÄRSK Line',
  'ÎLE-DE-FRANCE',
  'Puerto-Arica',
  '',
  '   ',
]

// La base es la fuente: la misma función SQL (`_catalogo_clave()`) da la misma clave que su espejo para los nombres difíciles.
describe('claveDeCatalogo contra _catalogo_clave() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(definicionSql('_catalogo_clave').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  it.each(NOMBRES)('«%s» da la misma clave que la base', async (nombre) => {
    const { rows } = await db.query<{ c: string }>('select public._catalogo_clave($1) as c', [
      nombre,
    ])
    expect(claveDeCatalogo(nombre)).toBe(rows[0]?.c)
  })

  it('un nulo da la clave vacía, como en la base', async () => {
    const { rows } = await db.query<{ c: string }>('select public._catalogo_clave(null) as c')
    expect(claveDeCatalogo(null)).toBe(rows[0]?.c)
    expect(claveDeCatalogo(undefined)).toBe('')
  })
})

describe('claveDeCatalogo', () => {
  it('ignora mayúsculas, tildes y espacios de más, y nada más', () => {
    expect(claveDeCatalogo('  MÆRSK   Línea ')).toBe('mÆrsk linea')
    expect(claveDeCatalogo('Valparaíso')).toBe(claveDeCatalogo('valparaiso'))
    expect(claveDeCatalogo('Puerto-Arica')).not.toBe(claveDeCatalogo('Puerto Arica'))
    expect(claveDeCatalogo('con espacio')).not.toBe(claveDeCatalogo('con espacio'))
  })
})

describe('claveDePuerto', () => {
  it('une nombre y país sin que uno se confunda con el otro', () => {
    expect(claveDePuerto(' Arica ', 'CHILE')).toBe(claveDePuerto('arica', 'Chile'))
    expect(claveDePuerto('Arica', null)).toBe(claveDePuerto('arica', ''))
    expect(claveDePuerto('Arica Chile', null)).not.toBe(claveDePuerto('Arica', 'Chile'))
  })
})

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'

function fila(
  id: string,
  origenId: string | null,
  nombre: string,
  activo = true,
): FilaPropiaOCompartida {
  return { id, origenId, clave: claveDeCatalogo(nombre), activo }
}

const ARICA = fila('arica', null, 'Arica')
const IQUIQUE = fila('iquique', null, 'Iquique')
const ARICA_A = fila('arica-a', A, ' ARICA ')
const IQUIQUE_A_INACTIVO = fila('iquique-a', A, 'iquique', false)
const MEJILLONES_B = fila('mejillones-b', B, 'Mejillones')
const FILAS = [ARICA, IQUIQUE, ARICA_A, IQUIQUE_A_INACTIVO, MEJILLONES_B]

const ids = (filas: readonly FilaPropiaOCompartida[]) => filas.map((f) => f.id)

describe('loQueUsaElOrigen', () => {
  it('da los propios del origen y los compartidos que no tapa un propio activo', () => {
    expect(ids(loQueUsaElOrigen(FILAS, A))).toEqual(['iquique', 'arica-a', 'iquique-a'])
  })

  it('un origen sin propios usa los compartidos; los propios de otro no le llegan', () => {
    expect(ids(loQueUsaElOrigen(FILAS, B))).toEqual(['arica', 'iquique', 'mejillones-b'])
  })

  it('sin origen (repuestos) usa sólo los compartidos', () => {
    expect(ids(loQueUsaElOrigen(FILAS, null))).toEqual(['arica', 'iquique'])
  })
})

describe('tapadoPor', () => {
  it('nombra el propio activo que tapa a un compartido en ese origen', () => {
    expect(tapadoPor(ARICA, FILAS, A)).toBe(ARICA_A)
  })

  it('un propio inactivo no tapa, otro origen no tapa, y a un propio no lo tapa nadie', () => {
    expect(tapadoPor(IQUIQUE, FILAS, A)).toBeNull()
    expect(tapadoPor(ARICA, FILAS, B)).toBeNull()
    expect(tapadoPor(ARICA, FILAS, null)).toBeNull()
    expect(tapadoPor(ARICA_A, FILAS, A)).toBeNull()
  })
})

describe('loQueUsanLosOrigenes', () => {
  it('con un solo origen (aunque se repita) es lo que usa ese origen', () => {
    expect(ids(loQueUsanLosOrigenes(FILAS, [A, A]))).toEqual(ids(loQueUsaElOrigen(FILAS, A)))
  })

  it('con varios, sólo los compartidos que no tapa ninguno', () => {
    expect(ids(loQueUsanLosOrigenes(FILAS, [A, B]))).toEqual(['iquique'])
  })

  it('sin orígenes, los compartidos', () => {
    expect(ids(loQueUsanLosOrigenes(FILAS, []))).toEqual(['arica', 'iquique'])
  })
})
