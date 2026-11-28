import { describe, expect, it } from 'vitest'
import {
  LARGO_MAXIMO_DEL_TEXTO_BASE,
  motivoDeLasVariables,
} from '../../src/modules/artes/entities/datos/texto-base'
import { textoBaseInicial } from '../../src/modules/artes/entities/datos/texto-base-inicial'
import {
  CLAVES_COMUNES_DEL_ARTE,
  CLAVES_DE_SUBASTA,
  variablesDelArte,
} from '../../src/modules/artes/entities/datos/variables-del-arte'
import { definicionSql, tablaSql } from '../lib/definicion-sql'

// El texto base de cada origen vive en dos lugares que tienen que decir lo mismo: `entities/datos/` (lo que valida «Textos» antes de guardar,
// lo que se ofrece para insertar y el texto con que nace en el código) y la base (`_artes_texto_base_inicial()`, que lo siembra al crear un
// origen, `_artes_texto_base_variables_validas()` y `artes_texto_base_guardar()`, que lo validan, y el `check` de `artes_textos_base`). Una
// variable que sólo está en uno es una que se ofrece y la base rechaza, o al revés.

function arregloDeLaBase(texto: string, nombre: string): string[] {
  const arreglo = new RegExp(`${nombre} constant text\\[\\] := array\\[([^\\]]*)\\]`).exec(
    texto,
  )?.[1]
  return [...(arreglo ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '')
}

describe('el texto base de las artes', () => {
  it('nace igual en la base y en el código, para cada tipo de origen', () => {
    const literales = [
      ...definicionSql('_artes_texto_base_inicial').texto.matchAll(/\$texto\$([\s\S]*?)\$texto\$/g),
    ].map((m) => m[1])
    expect(literales).toEqual([textoBaseInicial('subasta'), textoBaseInicial('manual')])
  })

  it('la base y el código conocen las mismas variables', () => {
    const texto = definicionSql('_artes_texto_base_variables_validas').texto
    expect(arregloDeLaBase(texto, 'v_comunes')).toEqual([...CLAVES_COMUNES_DEL_ARTE])
    expect(arregloDeLaBase(texto, 'v_de_subasta')).toEqual([...CLAVES_DE_SUBASTA])
  })

  it('los motivos de una variable que no vale son los de la base', () => {
    const texto = definicionSql('_artes_texto_base_variables_validas').texto
    const formatos = [...texto.matchAll(/format\('([^']*)', v_clave\)/g)].map((m) => m[1] ?? '')
    const manual = variablesDelArte({ tipo: 'manual', campos: [] })
    expect(formatos).toEqual([
      (motivoDeLasVariables('{lote}', manual) ?? '').replace('{lote}', '{%s}'),
      (motivoDeLasVariables('{x}', manual) ?? '').replace('{x}', '{%s}'),
    ])
  })

  it('el largo máximo es el mismo en la RPC, en el check de la tabla y en el código', () => {
    const rpc = definicionSql('artes_texto_base_guardar').texto
    expect(/char_length\(v_texto\) > (\d+)/.exec(rpc)?.[1]).toBe(
      String(LARGO_MAXIMO_DEL_TEXTO_BASE),
    )
    expect(rpc).toContain(`hasta ${String(LARGO_MAXIMO_DEL_TEXTO_BASE)} caracteres`)
    const tabla = tablaSql('artes_textos_base').texto
    expect(/char_length\(texto\) between 1 and (\d+)/.exec(tabla)?.[1]).toBe(
      String(LARGO_MAXIMO_DEL_TEXTO_BASE),
    )
  })
})
