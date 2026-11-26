import { describe, expect, it } from 'vitest'
import {
  autorDeLaRevision,
  conVehiculos,
  hastaDeUnDia,
  idsDeVehiculosDe,
  revisionesDesde,
} from './revisiones'

const USUARIO = '00000000-0000-4000-8000-0000000000aa'
const fila = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  usuario_id: USUARIO,
  creado_en: '2026-11-04T10:00:00.123456+00:00',
  autor: { id: USUARIO, nombre: 'Ana Pérez' },
  diff: { valores: { de: { pub: 1 }, a: { pub: 2 } } },
  ...extra,
})
const respuesta = (revisiones: unknown[], extra: Record<string, unknown> = {}) => ({
  revisiones,
  hay_mas: false,
  siguiente: null,
  etiquetas: { nodos: { pub: 'Precio' }, grupos: { g1: 'Grupo' } },
  ...extra,
})

describe('revisionesDesde: la página de revisiones de la base', () => {
  it('lee las filas en el orden en que llegaron, con el autor y las etiquetas', () => {
    const r = revisionesDesde(respuesta([fila(9), fila(7)]))
    expect(r?.revisiones.map((x) => x.id)).toEqual([9, 7])
    expect(r?.revisiones[0]).toMatchObject({
      usuarioId: USUARIO,
      creadoEn: '2026-11-04T10:00:00.123456+00:00',
      autor: 'Ana Pérez',
    })
    expect(r?.etiquetas.nodos.get('pub')).toBe('Precio')
    expect(r?.etiquetas.grupos.get('g1')).toBe('Grupo')
    expect(r?.siguiente).toBeNull()
  })

  it('el siguiente es el cursor sólo cuando hay más', () => {
    expect(revisionesDesde(respuesta([fila(9)], { hay_mas: true, siguiente: 9 }))?.siguiente).toBe(
      9,
    )
    expect(
      revisionesDesde(respuesta([fila(9)], { hay_mas: false, siguiente: 9 }))?.siguiente,
    ).toBeNull()
  })

  it('una fila sin id hace de la lectura un error, no una fila', () => {
    expect(revisionesDesde(respuesta([fila(9), { ...fila(8), id: undefined }]))).toBeNull()
    expect(revisionesDesde(null)).toBeNull()
    expect(revisionesDesde({})).toBeNull()
  })

  it('un id como «constructor» es una etiqueta más, no el de Object', () => {
    const r = revisionesDesde(
      respuesta([fila(1)], { etiquetas: { nodos: { constructor: 'Raro' }, grupos: {} } }),
    )
    expect(r?.etiquetas.nodos.get('constructor')).toBe('Raro')
    expect(r?.etiquetas.nodos.get('toString')).toBeUndefined()
  })

  it('el formato de cada cálculo nombrado llega en `calculos`; sin la clave, vacío', () => {
    const con = revisionesDesde(
      respuesta([fila(1)], {
        etiquetas: { nodos: { t: 'Transferencia' }, grupos: {}, calculos: { t: 'usd', p: 'pct' } },
      }),
    )
    expect(con?.etiquetas.calculos.get('t')).toBe('usd')
    expect(con?.etiquetas.calculos.get('p')).toBe('pct')
    expect(revisionesDesde(respuesta([fila(1)]))?.etiquetas.calculos.size).toBe(0)
    const raro = respuesta([fila(1)], {
      etiquetas: { nodos: {}, grupos: {}, calculos: { t: 'euros' } },
    })
    expect(revisionesDesde(raro)).toBeNull()
  })

  it('los «Decimales» de los cálculos que los traen llegan en `decimales`; sin la clave, vacío; fuera de 0 a 4, no se lee', () => {
    const con = (decimales: Record<string, unknown>) =>
      revisionesDesde(
        respuesta([fila(1)], {
          etiquetas: { nodos: {}, grupos: {}, calculos: { t: 'usd' }, decimales },
        }),
      )
    expect(con({ t: 0 })?.etiquetas.decimales.get('t')).toBe(0)
    expect(revisionesDesde(respuesta([fila(1)]))?.etiquetas.decimales.size).toBe(0)
    for (const d of [5, -1, 1.5, '2']) expect(con({ t: d }), String(d)).toBeNull()
  })
})

describe('autorDeLaRevision', () => {
  const leida = (extra: Record<string, unknown>) =>
    revisionesDesde(respuesta([fila(1, extra)]))?.revisiones[0]
  it('sin usuario: «Sin autor»; con el nombre vacío o nulo: «Sin nombre»; si no, el nombre', () => {
    const sin = leida({ usuario_id: null, autor: null })
    const vacio = leida({ autor: { id: USUARIO, nombre: null } })
    const con = leida({})
    expect(sin && autorDeLaRevision(sin)).toBe('Sin autor')
    expect(vacio && autorDeLaRevision(vacio)).toBe('Sin nombre')
    expect(con && autorDeLaRevision(con)).toBe('Ana Pérez')
  })
})

describe('hastaDeUnDia: el borde exclusivo de «ese día y lo anterior»', () => {
  it('es el inicio del día siguiente en la zona de la empresa', () => {
    expect(hastaDeUnDia('2026-10-13', 'America/La_Paz')).toBe('2026-10-14T04:00:00.000Z')
    expect(hastaDeUnDia('2026-10-13', 'Asia/Tokyo')).toBe('2026-10-13T15:00:00.000Z')
    expect(hastaDeUnDia('2026-12-31', 'America/La_Paz')).toBe('2027-01-01T04:00:00.000Z')
  })

  it('un texto que no es un día da nulo', () => {
    expect(hastaDeUnDia('', 'America/La_Paz')).toBeNull()
    expect(hastaDeUnDia('2026-13-01', 'America/La_Paz')).toBeNull()
    expect(hastaDeUnDia('13/10/2026', 'America/La_Paz')).toBeNull()
  })
})

describe('los vehículos de un cambio de vehículo, nombrados al leer (T315)', () => {
  const A = '00000000-0000-4000-8000-00000000000A'
  const B = '00000000-0000-4000-8000-0000000000bb'
  const C = '00000000-0000-4000-8000-0000000000cc'
  const pagina = () =>
    revisionesDesde(
      respuesta([
        fila(9, { diff: { vehiculo_id: { de: A, a: B } } }),
        fila(8, { diff: { vehiculo_id: { de: null, a: A } } }),
        fila(7, { diff: { vehiculo_id: { de: C, a: 'no-es-un-id' } } }),
        fila(6),
      ]),
    )!

  it('al leer, ninguna revisión trae el cambio nombrado', () => {
    expect(pagina().revisiones.map((r) => r.vehiculo)).toEqual([null, null, null, null])
  })

  it('los ids de los dos lados, sin repetir, en minúsculas y sólo los que son ids', () => {
    expect(idsDeVehiculosDe(pagina().revisiones)).toEqual([A.toLowerCase(), B, C])
    expect(idsDeVehiculosDe(revisionesDesde(respuesta([fila(1)]))!.revisiones)).toEqual([])
  })

  it('cada lado: su título si quien mira lo ve, «oculto» si no, y «sin» si no tenía', () => {
    const titulos = new Map([
      [A.toLowerCase(), 'Toyota Corolla'],
      [B, 'Mazda 3'],
    ])
    const r = conVehiculos(pagina(), titulos).revisiones
    expect(r[0]?.vehiculo).toEqual({ de: { titulo: 'Toyota Corolla' }, a: { titulo: 'Mazda 3' } })
    expect(r[1]?.vehiculo).toEqual({ de: 'sin', a: { titulo: 'Toyota Corolla' } })
    expect(r[2]?.vehiculo).toEqual({ de: 'oculto', a: 'oculto' })
    expect(r[3]?.vehiculo).toBeNull()
  })

  it('sin la lectura de los nombres, ninguna revisión los trae', () => {
    const p = pagina()
    expect(conVehiculos(p, null)).toBe(p)
  })
})
