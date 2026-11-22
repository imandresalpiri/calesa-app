// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import { MAXIMO_DE_COLUMNAS_EN_LA_AYUDA } from '../diseno'
import { claveDeColumna, claveDeLaTabla, esTipoDeColumna, TOPE_DE_COLUMNAS } from './estructura'

const NOMBRES = [
  'Fletes por puerto',
  'Fletes  por  puerto',
  '  Tarifas USA → Bolivia  ',
  'Año del vehículo',
  'ÑANDÚ Çedilla',
  'Ünïcödé ÀÉÍÓÚ',
  '2025 tarifas',
  '9',
  'a',
  '—',
  '',
  '   ',
  'x'.repeat(39) + ' y',
  'Grúas — Japón (ç)',
  'İstanbul',
  'Straße',
  'Ⅻ números romanos',
  'emoji 🚗 auto',
  '__ya__con__guiones__',
  'Tabla\tcon\ttabs',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghij',
]

// La base es la fuente de la clave: el espejo da lo mismo que `_tabla_referencia_clave()` (o nulo donde la base da 22023) con nombres difíciles.
describe('claveDeLaTabla contra _tabla_referencia_clave() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(definicionSql('_tabla_referencia_clave').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  async function claveDeLaBase(nombre: string): Promise<string | null> {
    try {
      const { rows } = await db.query<{ c: string }>(
        'select public._tabla_referencia_clave($1) as c',
        [nombre],
      )
      return rows[0]?.c ?? null
    } catch (error) {
      expect((error as { code?: string }).code).toBe('22023')
      return null
    }
  }

  it.each(NOMBRES)('«%s»', async (nombre) => {
    expect(claveDeLaTabla(nombre)).toBe(await claveDeLaBase(nombre))
  })
})

describe('claveDeLaTabla', () => {
  it('sale del nombre en minúsculas, sin acentos y con guiones bajos', () => {
    expect(claveDeLaTabla('Fletes por puerto')).toBe('fletes_por_puerto')
    expect(claveDeLaTabla('Año del vehículo')).toBe('ano_del_vehiculo')
  })

  it('empieza con t_ si el nombre empieza con un número, y corta en 40 sin guion al final', () => {
    expect(claveDeLaTabla('2025 tarifas')).toBe('t_2025_tarifas')
    expect(claveDeLaTabla('x'.repeat(39) + ' y')).toBe('x'.repeat(39))
  })

  it('es nula con menos de dos letras o números', () => {
    expect(claveDeLaTabla('a')).toBeNull()
    expect(claveDeLaTabla('—')).toBeNull()
  })
})

describe('claveDeColumna', () => {
  it('sale de la etiqueta', () => {
    expect(claveDeColumna('Monto USD', [])).toBe('monto_usd')
  })

  it('suma _2, _3… si choca con otra de la tabla', () => {
    expect(claveDeColumna('Monto', ['monto'])).toBe('monto_2')
    expect(claveDeColumna('Monto', ['monto', 'monto_2'])).toBe('monto_3')
  })

  it('una etiqueta vacía da «columna»', () => {
    expect(claveDeColumna('', [])).toBe('columna')
  })

  it('siempre cumple el patrón de la base, también con el sufijo', () => {
    const larga = claveDeColumna('x'.repeat(80), ['x'.repeat(37)])
    expect(larga).toMatch(/^[a-z][a-z0-9_]{0,40}$/)
  })
})

describe('esTipoDeColumna', () => {
  it('número, año y texto; otro no', () => {
    expect(esTipoDeColumna('numero')).toBe(true)
    expect(esTipoDeColumna('anio')).toBe(true)
    expect(esTipoDeColumna('texto')).toBe(true)
    expect(esTipoDeColumna('booleano')).toBe(false)
  })
})

describe('TOPE_DE_COLUMNAS', () => {
  it('es el tope de columnas de un bloque de tabla de la ayuda (el núcleo no importa el área)', () => {
    expect(MAXIMO_DE_COLUMNAS_EN_LA_AYUDA).toBe(TOPE_DE_COLUMNAS)
  })
})
