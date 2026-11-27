import { describe, expect, it } from 'vitest'
import {
  FORMATOS_DE_ARTE,
  LADO_MAXIMO_PERSONALIZADO,
  LADO_MINIMO_PERSONALIZADO,
} from '../../src/modules/artes/entities/formatos'
import { definicionSql, tablaSql } from '../lib/definicion-sql'

// Los formatos de arte viven en dos lugares que tienen que decir lo mismo: `FORMATOS_DE_ARTE` (lo que ofrece «Nueva plantilla» y con lo que
// se dibuja la tarjeta) y `_artes_medidas_validas()` en la base (lo que acepta el `check` de `artes_plantillas`), más el `check` de la clave y
// `_artes_tipo_del_formato()` (imagen o PDF). Un formato que sólo está en uno es uno que se ofrece y la base rechaza, o al revés.

function medidasDeLaBase(): Map<string, string> {
  const texto = definicionSql('_artes_medidas_validas').texto
  return new Map(
    [...texto.matchAll(/when '([a-z0-9]+)' then ([^\n]+)/g)].map((m) => [
      m[1] ?? '',
      (m[2] ?? '').trim(),
    ]),
  )
}

describe('los formatos de arte', () => {
  it('la base y el código dicen los mismos formatos, con las mismas medidas', () => {
    const base = medidasDeLaBase()
    expect([...base.keys()]).toEqual(FORMATOS_DE_ARTE.map((f) => f.clave))
    for (const formato of FORMATOS_DE_ARTE) {
      const esperado =
        formato.ancho === null || formato.alto === null
          ? `p_ancho between ${String(LADO_MINIMO_PERSONALIZADO)} and ${String(LADO_MAXIMO_PERSONALIZADO)} and p_alto between ${String(LADO_MINIMO_PERSONALIZADO)} and ${String(LADO_MAXIMO_PERSONALIZADO)}`
          : `p_ancho = ${String(formato.ancho)} and p_alto = ${String(formato.alto)}`
      expect(base.get(formato.clave), formato.clave).toBe(esperado)
    }
  })

  it('el check de la tabla nombra las mismas claves y usa las medidas de la función', () => {
    const tabla = tablaSql('artes_plantillas').texto
    const enElCheck = /formato in \(([^)]+)\)/.exec(tabla)?.[1] ?? ''
    expect([...enElCheck.matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1])).toEqual(
      FORMATOS_DE_ARTE.map((f) => f.clave),
    )
    expect(tabla).toMatch(/_artes_medidas_validas\(formato, ancho, alto\)/)
  })

  it('Carta y A4 son PDF en la base y en el código', () => {
    const texto = definicionSql('_artes_tipo_del_formato').texto
    const pdf = /p_formato in \(([^)]+)\)/.exec(texto)?.[1] ?? ''
    expect([...pdf.matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1])).toEqual(
      FORMATOS_DE_ARTE.filter((f) => f.tipo === 'pdf').map((f) => f.clave),
    )
  })
})
