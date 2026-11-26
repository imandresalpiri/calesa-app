import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { contextoParaElNavegador, nodosNombradosPor } from './contexto-para-el-navegador'
import { formaDeCuadricula } from './forma-de-cuadricula'
import {
  juegoDePlantilla,
  RUTA_DEL_JUEGO,
  type CasoDePlantilla,
} from './juego-de-plantilla.soporte'
import { esDeLaCuadricula, validarPlantilla, type ContextoDePlantilla } from './validar-plantilla'

const juego = juegoDePlantilla(readFileSync(new URL(RUTA_DEL_JUEGO, import.meta.url), 'utf8'))

function contextoDe(c: CasoDePlantilla): ContextoDePlantilla {
  const fo = juego.formulas[c.formula]
  if (fo === undefined) throw new Error(`«${c.nombre}» nombra una fórmula que no está`)
  return {
    definicion: fo.definicion,
    diseno: fo.diseno,
    visibilidad: c.visibilidad ?? fo.visibilidad,
    tonos: juego.tonos,
  }
}

const mini = (): ContextoDePlantilla =>
  contextoDe({ nombre: 'x', formula: 'mini', plantilla: {}, valida: true })

// Una cuadrícula que nombra estos nodos (una fila y una celda por cada uno).
const nombrando = (...ids: string[]): PlantillaEnCuadricula => ({
  forma: 2,
  columnas: [{ id: 'a', ancho: 100 }],
  filas:
    ids.length === 0
      ? [{ id: 'f', alto: 20, ocultar_si: 'nunca' }]
      : ids.map((id) => ({ id: `f_${id}`, alto: 20, ocultar_si: 'no_aplica', nodo: id })),
  celdas: ids.map((id) => ({
    id: `c_${id}`,
    fila: `f_${id}`,
    columna: 'a',
    contenido: { tipo: 'dato', nodo: id, mostrar: 'monto' },
  })),
})
const VACIA = nombrando()

describe('contextoParaElNavegador', () => {
  it('lleva los nodos del nivel «todos» con su etiqueta, grupo, salida, descripción y par porcentaje-monto, nunca el cuerpo', () => {
    const r = contextoParaElNavegador(mini(), VACIA)
    const nodos = r.definicion.nodos ?? []
    expect(nodos.map((n) => n.id)).toEqual(
      expect.arrayContaining([
        'remate',
        'fees',
        'grua',
        'total',
        'garantia',
        'comision',
        'comision_pct',
        'tc_ext',
      ]),
    )
    expect(nodos.find((n) => n.id === 'comision')).toEqual({
      id: 'comision',
      etiqueta: 'Comisión de la subasta',
      grupo: null,
      salida: null,
      tipo: 'calculo',
      op: 'porcentaje_de',
      pct: 'comision_pct',
    })
    expect(nodos.find((n) => n.id === 'remate')).toMatchObject({ grupo: 'compra', tipo: 'input' })
    const texto = JSON.stringify(r)
    for (const cuerpo of [
      '"de"',
      '"formato"',
      '"sobrescribible"',
      '"entradas"',
      '"formula"',
      '"valor"',
    ]) {
      expect(texto).not.toContain(cuerpo)
    }
  })

  it('un restringido sólo viaja si la cuadrícula ya lo nombra (para marcarlo)', () => {
    // `cif` es del nivel «costos» en la «mini».
    expect(
      (contextoParaElNavegador(mini(), VACIA).definicion.nodos ?? []).map((n) => n.id),
    ).not.toContain('cif')
    const r = contextoParaElNavegador(mini(), nombrando('cif'))
    expect((r.definicion.nodos ?? []).map((n) => n.id)).toContain('cif')
    expect(r.visibilidad).toMatchObject({ cif: { ver: 'costos' } })
  })

  it('nodosNombradosPor: los de las filas y los de las celdas', () => {
    expect([...nodosNombradosPor(nombrando('fees', 'cif'))]).toEqual(['fees', 'cif'])
  })

  it('un restringido nombrado dentro de un texto con datos viaja marcado', () => {
    const conDatos: PlantillaEnCuadricula = {
      ...VACIA,
      celdas: [
        {
          id: 'c',
          fila: 'f',
          columna: 'a',
          contenido: {
            tipo: 'texto',
            partes: ['Valor ', { tipo: 'dato', nodo: 'cif', mostrar: 'etiqueta' }],
          },
        },
      ],
    }
    expect([...nodosNombradosPor(conDatos)]).toEqual(['cif'])
    const r = contextoParaElNavegador(mini(), conDatos)
    expect((r.definicion.nodos ?? []).map((n) => n.id)).toContain('cif')
    expect(r.visibilidad).toMatchObject({ cif: { ver: 'costos' } })
  })
})

describe('contextoParaElNavegador: ids y el juego', () => {
  it('un id `__proto__` o `constructor` pasa como clave propia', () => {
    const contexto: ContextoDePlantilla = {
      definicion: {
        nodos: [
          { id: 'constructor', grupo: 'g', etiqueta: 'C' },
          { id: '__proto__', grupo: 'g', etiqueta: 'P' },
        ],
        grupos: [{ id: 'g', etiqueta: 'G', tono: 'verde', bucket: 'b' }],
        buckets: {},
      },
      diseno: null,
      visibilidad: JSON.parse('{"constructor":{"ver":"todos","x":1},"__proto__":{"ver":"todos"}}'),
      tonos: ['verde'],
    }
    const r = contextoParaElNavegador(contexto, VACIA)
    expect(Object.hasOwn(r.visibilidad ?? {}, '__proto__')).toBe(true)
    expect(Object.hasOwn(r.visibilidad ?? {}, 'constructor')).toBe(true)
    expect((r.visibilidad as Record<string, unknown>)['constructor']).toEqual({ ver: 'todos' })
    const p = nombrando('constructor', '__proto__')
    expect(validarPlantilla(p, contextoParaElNavegador(contexto, p)).ok).toBe(
      validarPlantilla(p, contexto).ok,
    )
  })

  // La forma 2 (la que escribe el editor): con el contexto reducido, el mismo juicio que con el entero.
  it.each(
    juego.casos.filter(
      (c) => esDeLaCuadricula(c.plantilla) && formaDeCuadricula(c.plantilla, { conTope: false }).ok,
    ),
  )('el juego, «$nombre»: mismo ok y mismo donde que con el contexto entero', (c) => {
    const entero = contextoDe(c)
    const cuadricula = c.plantilla as PlantillaEnCuadricula
    const a = validarPlantilla(c.plantilla, entero)
    const b = validarPlantilla(c.plantilla, contextoParaElNavegador(entero, cuadricula))
    expect(b.ok).toBe(a.ok)
    if (!a.ok && !b.ok) expect(b.error.donde).toBe(a.error.donde)
  })
})

describe('contextoParaElNavegador: el plazo y la variante', () => {
  it('el plazo del grupo pasa sólo si es un texto', () => {
    const contexto = {
      definicion: {
        nodos: [],
        grupos: [{ id: 'a', plazo: '2 días' }, { id: 'b', plazo: 5 }, { id: 'c' }],
        buckets: {},
      },
      diseno: null,
      visibilidad: null,
      tonos: [],
    } as unknown as ContextoDePlantilla
    const grupos = contextoParaElNavegador(contexto, VACIA).definicion.grupos ?? []
    expect(grupos.map((g) => g.plazo)).toEqual(['2 días', null, null])
  })

  it('la variante del nivel «todos» viaja con sus opciones (clave y título); restringida, no', () => {
    const contexto: ContextoDePlantilla = {
      definicion: {
        nodos: [
          {
            id: 'variante',
            tipo: 'opcion',
            etiqueta: 'Variante',
            opciones: [{ clave: 'moto', titulo: 'MOTO' }],
          },
          { id: 'total', etiqueta: 'T', salida: 'total' },
        ],
        grupos: [],
        buckets: {},
      },
      diseno: { cabecera: { modos: [{ clave: 'unificado', nombre: 'Unificado', buckets: [] }] } },
      visibilidad: { variante: { ver: 'todos' }, total: { ver: 'todos' } },
      tonos: [],
    }
    const r = contextoParaElNavegador(contexto, VACIA)
    expect(r.definicion.nodos?.find((n) => n.id === 'variante')).toMatchObject({
      tipo: 'opcion',
      opciones: [{ clave: 'moto', titulo: 'MOTO' }],
    })
    expect(r.diseno?.cabecera?.modos?.[0]).toMatchObject({
      clave: 'unificado',
      nombre: 'Unificado',
    })
    const restringida = contextoParaElNavegador(
      { ...contexto, visibilidad: { variante: { ver: 'costos' }, total: { ver: 'todos' } } },
      VACIA,
    )
    expect(restringida.definicion.nodos?.map((n) => n.id)).toEqual(['total'])
  })
})

describe('contextoParaElNavegador: lo restringido que no se nombra', () => {
  it('el nodo de un tipo de cambio de otro nivel no viaja, pero sí su `ver` (lo juzga el validador)', () => {
    const base = mini()
    const contexto: ContextoDePlantilla = {
      ...base,
      visibilidad: { ...base.visibilidad, tc_uni: { ver: 'costos' } },
    }
    const r = contextoParaElNavegador(contexto, VACIA)
    expect((r.definicion.nodos ?? []).map((n) => n.id)).not.toContain('tc_uni')
    expect(r.visibilidad?.['tc_uni']).toEqual({ ver: 'costos' })
    expect(JSON.stringify(r)).not.toContain('Dólar unificado')
  })

  it('el `pct` de otro nivel de un nodo que viaja no viaja como nodo, pero sí su `ver`', () => {
    const base = mini()
    const contexto: ContextoDePlantilla = {
      ...base,
      visibilidad: { ...base.visibilidad, comision_pct: { ver: 'costos' } },
    }
    const r = contextoParaElNavegador(contexto, VACIA)
    const ids = (r.definicion.nodos ?? []).map((n) => n.id)
    expect(ids).toContain('comision')
    expect(ids).not.toContain('comision_pct')
    expect(r.visibilidad?.['comision_pct']).toEqual({ ver: 'costos' })
  })
})

describe('contextoParaElNavegador: los «Decimales»', () => {
  it('lleva los «Decimales» de un nodo que los trae (la tarjeta de trabajo los dibuja); sin ellos, ninguna clave', () => {
    const base = mini()
    const ctx: ContextoDePlantilla = {
      ...base,
      definicion: {
        ...base.definicion,
        nodos: (base.definicion.nodos ?? []).map((n) =>
          n.id === 'remate' ? { ...n, decimales: 0 } : n,
        ),
      },
    }
    const nodos = contextoParaElNavegador(ctx, VACIA).definicion.nodos ?? []
    expect(nodos.find((n) => n.id === 'remate')).toMatchObject({ decimales: 0 })
    expect(nodos.find((n) => n.id === 'fees')).not.toHaveProperty('decimales')
  })
})
