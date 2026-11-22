import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { disenoSintetico } from './diseno-sintetico'
import {
  ANCHOS,
  EFECTOS_DE_INTERRUPTOR,
  esquemaDiseno,
  MAXIMO_DE_ATAJOS,
  MAXIMO_DE_BLOQUES,
  MAXIMO_DE_TABLAS_EN_LA_AYUDA,
  MAXIMO_DEL_TEXTO_DE_LA_AYUDA,
  MAXIMO_DEL_TITULO_DE_LA_AYUDA,
  NIVEL_TODOS,
  PRESENTACIONES,
  SECUNDARIOS,
  TIPOS_DE_BLOQUE,
} from './diseno'
import { validarFormula } from './validar'
import { validarDiseno } from './validar-diseno'

const base = () => ({
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 'a',
      presentacion: 'principal',
      items: [{ tipo: 'celda', nodo: 'x', ancho: 'completo' }],
    },
  ],
  tarjeta_total: { nodo: 'total', secundarios: [] },
})
type Obj = Record<string, unknown>

// Una copia del diseño con `valor` en `ruta` (claves y posiciones).
function poner(d: unknown, ruta: readonly (string | number)[], valor: unknown): unknown {
  const copia = JSON.parse(JSON.stringify(d)) as unknown
  let actual = copia as Obj
  for (const paso of ruta.slice(0, -1)) actual = actual[paso as string] as Obj
  actual[ruta[ruta.length - 1] as string] = valor
  return copia
}

describe('esquemaDiseno', () => {
  it('acepta el diseño más chico', () => {
    expect(esquemaDiseno.safeParse(base()).success).toBe(true)
  })

  it('cuenta el título en caracteres: 80 emojis pasan y 81 no', () => {
    const titulo = (n: number) => poner(base(), ['secciones', 0, 'titulo'], '😀'.repeat(n))
    expect(esquemaDiseno.safeParse(titulo(80)).success).toBe(true)
    expect(esquemaDiseno.safeParse(titulo(81)).success).toBe(false)
  })

  it('lee las filas de los atajos como JS: 1.0 y 0.99999999999999999 valen 1, 1.5 y 13 no', () => {
    const filas = (texto: string) =>
      JSON.parse(
        JSON.stringify(base()).replace(
          '"items":[',
          `"items":[{"tipo":"atajos","nodo":"x","columna":"c","filas":${texto}},`,
        ),
      ) as unknown
    expect(esquemaDiseno.safeParse(filas('1.0')).success).toBe(true)
    expect(esquemaDiseno.safeParse(filas('0.99999999999999999')).success).toBe(true)
    expect(esquemaDiseno.safeParse(filas('12')).success).toBe(true)
    for (const mal of ['1.5', '13', '0', '1e400', '1e-400', '"8"'])
      expect(esquemaDiseno.safeParse(filas(mal)).success, mal).toBe(false)
  })

  it('un null explícito no es una clave ausente', () => {
    expect(esquemaDiseno.safeParse(poner(base(), ['secciones', 0, 'titulo'], null)).success).toBe(
      false,
    )
  })

  it('una clave «__proto__» es una clave desconocida, en cualquier objeto del diseño', () => {
    // JSON.parse crea la clave propia (una asignación `x.__proto__ = 1` cambiaría el prototipo).
    const textoBase = JSON.stringify(base())
    const variantes = [
      textoBase.replace('{"cabecera"', '{"__proto__":1,"cabecera"'),
      textoBase.replace('{"modos"', '{"__proto__":1,"modos"'),
      textoBase.replace('{"id"', '{"__proto__":1,"id"'),
      textoBase.replace('{"tipo":"celda"', '{"__proto__":1,"tipo":"celda"'),
      textoBase.replace('{"nodo":"total"', '{"__proto__":1,"nodo":"total"'),
    ]
    for (const v of variantes) {
      expect(v).toContain('__proto__')
      expect(esquemaDiseno.safeParse(JSON.parse(v)).success).toBe(false)
    }
  })

  it('las listas cerradas son las del doc', () => {
    expect(ANCHOS).toEqual(['completo', 'mitad', 'tercio'])
    expect(PRESENTACIONES).toEqual(['principal', 'avanzado'])
    expect(SECUNDARIOS).toEqual(['porcentaje', 'monto'])
    expect(EFECTOS_DE_INTERRUPTOR).toEqual(['habilita', 'muestra'])
    expect(MAXIMO_DE_ATAJOS).toBe(12)
    expect(NIVEL_TODOS).toBe('todos')
    expect(TIPOS_DE_BLOQUE).toEqual(['titulo', 'texto', 'enlaces', 'tabla'])
  })

  it('ningún objeto del diseño es un registro: la clave de cada colección va adentro', () => {
    for (const a of ['diseno.ts', 'validar-diseno.ts']) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(/z\.record\(|\.catchall\(|z\.looseObject\(/)
    }
  })
})

describe('validarDiseno: el campo de un rechazo de forma', () => {
  const s = disenoSintetico(4)
  const f = validarFormula(s.definicion, s.params)
  const definicion = f.ok ? f.formula.definicion : (undefined as never)
  it('dice la ruta del dato en el diseño y la sección donde está', () => {
    const diseno = poner(s.diseno, ['secciones', 1, 'items', 0, 'ancho'], '50%')
    const r = validarDiseno(definicion, diseno, s.contexto)
    expect(r.ok ? undefined : r.error).toMatchObject({
      regla: 'forma',
      donde: 's0',
      campo: 'diseno.secciones.1.items.0.ancho',
    })
  })
})

describe('disenoSintetico', () => {
  it('trae una fórmula, un diseño y un contexto que validan, y crece con las unidades', () => {
    for (const unidades of [4, 40]) {
      const s = disenoSintetico(unidades)
      const f = validarFormula(s.definicion, s.params)
      expect(f.ok ? f : f.error).toMatchObject({ ok: true })
      if (!f.ok) continue
      // Con 40 unidades pasa de 200 ítems: el tope de la hoja se apaga, como en las pruebas de escala.
      const r = validarDiseno(f.formula.definicion, s.diseno, s.contexto, {
        maximoDeItems: Number.POSITIVE_INFINITY,
      })
      expect(r.ok ? r : r.error).toMatchObject({ ok: true })
    }
    expect(disenoSintetico(40).definicion.nodos.length).toBeGreaterThan(
      (9 * disenoSintetico(4).definicion.nodos.length) / 2,
    )
  })

  it('el retirado del contexto no lo usa ninguna sección', () => {
    const s = disenoSintetico(40)
    const usados = s.diseno.secciones.flatMap((x) => [
      (x as { nivel_ver?: string }).nivel_ver,
      (x as { nivel_editar?: string }).nivel_editar,
    ])
    for (const retirado of s.contexto.retirados) expect(usados).not.toContain(retirado)
  })
})

describe('esquemaDiseno: la ayuda en bloques', () => {
  it('hasta 8 bloques y 3 tablas, sin repetir una columna en un bloque; la de antes sigue valiendo', () => {
    const ayuda = (a: unknown) =>
      esquemaDiseno.safeParse(poner(base(), ['secciones', 0, 'items', 0, 'ayuda'], a)).success
    const texto = (n: number) => ({ tipo: 'texto', texto: 'x'.repeat(n) })
    const tabla = (clave: string, columnas?: string[]) =>
      columnas === undefined
        ? { tipo: 'tabla', tabla: clave }
        : { tipo: 'tabla', tabla: clave, columnas: columnas.map((columna) => ({ columna })) }
    expect(ayuda(Array.from({ length: MAXIMO_DE_BLOQUES }, () => texto(1)))).toBe(true)
    expect(ayuda(Array.from({ length: MAXIMO_DE_BLOQUES + 1 }, () => texto(1)))).toBe(false)
    expect(ayuda([])).toBe(false)
    expect(MAXIMO_DE_TABLAS_EN_LA_AYUDA).toBe(3)
    expect(ayuda(['a', 'b', 'c'].map((c) => tabla(c)))).toBe(true)
    expect(ayuda(['a', 'b', 'c', 'd'].map((c) => tabla(c)))).toBe(false)
    expect(ayuda([texto(MAXIMO_DEL_TEXTO_DE_LA_AYUDA)])).toBe(true)
    expect(ayuda([texto(MAXIMO_DEL_TEXTO_DE_LA_AYUDA + 1)])).toBe(false)
    expect(ayuda([{ tipo: 'titulo', texto: '😀'.repeat(MAXIMO_DEL_TITULO_DE_LA_AYUDA) }])).toBe(
      true,
    )
    expect(ayuda([{ tipo: 'titulo', texto: '😀'.repeat(MAXIMO_DEL_TITULO_DE_LA_AYUDA + 1) }])).toBe(
      false,
    )
    expect(ayuda([tabla('fletes', ['monto', 'desde'])])).toBe(true)
    expect(ayuda([tabla('fletes', ['monto', 'monto'])])).toBe(false)
    expect(ayuda([{ ...tabla('fletes'), resaltar: 'si' }])).toBe(false)
    // La de antes, tal cual; un bloque suelto (sin la lista) no es ninguna de las dos.
    expect(ayuda({ tabla: 'fletes' })).toBe(true)
    expect(
      ayuda({ texto: 'Mira.', enlaces: [{ titulo: 'Copart', url: 'https://www.copart.com/' }] }),
    ).toBe(true)
    expect(ayuda({ tipo: 'texto', texto: 'Mira.' })).toBe(false)
  })
})
