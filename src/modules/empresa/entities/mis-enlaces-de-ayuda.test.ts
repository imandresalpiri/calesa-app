import { describe, expect, it } from 'vitest'
import {
  armarMisElementos,
  armarMisEnlaces,
  claveDelElemento,
  conMostrar,
  conPropio,
  cuantosPropios,
  enlacesDelMenu,
  firmaDeMisEnlaces,
  misEnlacesDesde,
  moverElemento,
  paraGuardar,
  sinPropio,
  type FilaPersonal,
  type MisEnlacesLeidos,
} from './mis-enlaces-de-ayuda'

const E1 = '00000000-0000-4000-8000-0000000000e1'
const E2 = '00000000-0000-4000-8000-0000000000e2'
const E3 = '00000000-0000-4000-8000-0000000000e3'
const P1 = '00000000-0000-4000-8000-0000000000a1'

const empresa = [
  { id: E1, titulo: 'Uno', url: 'https://uno.com', descripcion: null },
  { id: E2, titulo: 'Dos', url: 'https://dos.com/x', descripcion: 'La segunda' },
  { id: E3, titulo: 'Tres', url: 'https://tres.com', descripcion: null },
]

function fila(parcial: Partial<FilaPersonal> & { id: string; orden: number }): FilaPersonal {
  return { enlaceId: null, titulo: null, url: null, descripcion: null, oculto: false, ...parcial }
}

function leidos(mios: FilaPersonal[]): MisEnlacesLeidos {
  return { version: null, topePropios: 20, empresa, mios }
}

describe('armarMisElementos', () => {
  it('sin nada guardado, los de la empresa en su orden', () => {
    expect(armarMisElementos(leidos([])).map(claveDelElemento)).toEqual([
      `empresa-${E1}`,
      `empresa-${E2}`,
      `empresa-${E3}`,
    ])
  })

  it('su orden propio, los ocultos y los propios; los nuevos de la empresa, visibles al final', () => {
    const elementos = armarMisElementos(
      leidos([
        fila({ id: 'f1', orden: 1, titulo: 'Mía', url: 'https://mia.com' }),
        fila({ id: 'f2', orden: 2, enlaceId: E2, oculto: true }),
        fila({ id: 'f3', orden: 3, enlaceId: E1 }),
      ]),
    )
    expect(elementos.map(claveDelElemento)).toEqual([
      'propio-f1',
      `empresa-${E2}`,
      `empresa-${E1}`,
      `empresa-${E3}`,
    ])
    expect(elementos[1]).toMatchObject({ tipo: 'empresa', oculto: true })
    expect(elementos[3]).toMatchObject({ tipo: 'empresa', oculto: false })
  })

  it('un enlace de la empresa quitado o desactivado desaparece sin error; un repetido cuenta una vez', () => {
    const quitado = '00000000-0000-4000-8000-0000000000ff'
    const elementos = armarMisElementos(
      leidos([
        fila({ id: 'f1', orden: 1, enlaceId: quitado }),
        fila({ id: 'f2', orden: 2, enlaceId: E3 }),
        fila({ id: 'f3', orden: 3, enlaceId: E3, oculto: true }),
      ]),
    )
    expect(elementos.map(claveDelElemento)).toEqual([
      `empresa-${E3}`,
      `empresa-${E1}`,
      `empresa-${E2}`,
    ])
    expect(elementos[0]).toMatchObject({ oculto: false })
  })

  it('ordena por el orden guardado aunque lleguen desordenadas', () => {
    const elementos = armarMisElementos(
      leidos([
        fila({ id: 'f2', orden: 2, enlaceId: E1 }),
        fila({ id: 'f1', orden: 1, enlaceId: E3 }),
      ]),
    )
    expect(elementos.map(claveDelElemento).slice(0, 2)).toEqual([`empresa-${E3}`, `empresa-${E1}`])
  })
})

describe('enlacesDelMenu y armarMisEnlaces', () => {
  it('dejan fuera los ocultos y dicen el dominio y si es propio', () => {
    const menu = armarMisEnlaces(
      leidos([
        fila({ id: 'f1', orden: 1, enlaceId: E1, oculto: true }),
        fila({
          id: P1,
          orden: 2,
          titulo: 'Mía',
          url: 'https://www.mia.com/guia',
          descripcion: 'Corta',
        }),
      ]),
    )
    expect(menu).toEqual([
      {
        clave: `propio-${P1}`,
        titulo: 'Mía',
        url: 'https://www.mia.com/guia',
        descripcion: 'Corta',
        dominio: 'www.mia.com',
        propio: true,
      },
      {
        clave: `empresa-${E2}`,
        titulo: 'Dos',
        url: 'https://dos.com/x',
        descripcion: 'La segunda',
        dominio: 'dos.com',
        propio: false,
      },
      {
        clave: `empresa-${E3}`,
        titulo: 'Tres',
        url: 'https://tres.com',
        descripcion: null,
        dominio: 'tres.com',
        propio: false,
      },
    ])
    expect(enlacesDelMenu([])).toEqual([])
  })
})

describe('las ediciones de la lista', () => {
  const base = armarMisElementos(leidos([]))

  it('moverElemento cambia de lugar con el de al lado y da nulo en el extremo', () => {
    expect(moverElemento(base, `empresa-${E3}`, 'subir')?.map(claveDelElemento)).toEqual([
      `empresa-${E1}`,
      `empresa-${E3}`,
      `empresa-${E2}`,
    ])
    expect(moverElemento(base, `empresa-${E1}`, 'subir')).toBeNull()
    expect(moverElemento(base, `empresa-${E3}`, 'bajar')).toBeNull()
    expect(moverElemento(base, 'nada', 'bajar')).toBeNull()
  })

  it('conMostrar oculta y muestra uno de la empresa', () => {
    const oculto = conMostrar(base, E2, false)
    expect(oculto[1]).toMatchObject({ oculto: true })
    expect(conMostrar(oculto, E2, true)[1]).toMatchObject({ oculto: false })
  })

  it('conPropio suma al final o reemplaza sin mover; sinPropio lo quita', () => {
    const propio = { id: P1, titulo: 'Mía', url: 'https://mia.com', descripcion: null }
    const conUno = conPropio(base, propio)
    expect(conUno.map(claveDelElemento).at(-1)).toBe(`propio-${P1}`)
    expect(cuantosPropios(conUno)).toBe(1)
    const subido = moverElemento(conUno, `propio-${P1}`, 'subir') ?? []
    const editado = conPropio(subido, { ...propio, titulo: 'Mía 2' })
    expect(editado[2]).toMatchObject({ tipo: 'propio', titulo: 'Mía 2' })
    expect(cuantosPropios(sinPropio(editado, P1))).toBe(0)
  })

  it('paraGuardar manda la lista entera, en su orden', () => {
    const lista = conPropio(conMostrar(base, E1, false), {
      id: P1,
      titulo: 'Mía',
      url: 'https://mia.com',
      descripcion: 'x',
    })
    expect(paraGuardar(lista)).toEqual([
      { enlace_id: E1, oculto: true },
      { enlace_id: E2, oculto: false },
      { enlace_id: E3, oculto: false },
      { id: P1, titulo: 'Mía', url: 'https://mia.com', descripcion: 'x' },
    ])
  })
})

describe('misEnlacesDesde y firmaDeMisEnlaces', () => {
  it('leen la respuesta de la base', () => {
    const leida = misEnlacesDesde({
      version: '2026-11-26T10:00:00.1+00:00',
      tope_propios: 20,
      empresa: [{ id: E1, titulo: 'Uno', url: 'https://uno.com', descripcion: null }],
      mios: [
        {
          id: P1,
          enlace_id: E1,
          titulo: null,
          url: null,
          descripcion: null,
          oculto: true,
          orden: 1,
        },
      ],
    })
    expect(leida).toEqual({
      version: '2026-11-26T10:00:00.1+00:00',
      topePropios: 20,
      empresa: [{ id: E1, titulo: 'Uno', url: 'https://uno.com', descripcion: null }],
      mios: [
        {
          id: P1,
          enlaceId: E1,
          titulo: null,
          url: null,
          descripcion: null,
          oculto: true,
          orden: 1,
        },
      ],
    })
    expect(misEnlacesDesde({ version: null })).toBeNull()
  })

  it('la firma cambia con la versión o con la empresa', () => {
    const a = leidos([])
    expect(firmaDeMisEnlaces(a)).toBe(firmaDeMisEnlaces({ ...a }))
    expect(firmaDeMisEnlaces({ ...a, version: 'x' })).not.toBe(firmaDeMisEnlaces(a))
    expect(firmaDeMisEnlaces({ ...a, empresa: [] })).not.toBe(firmaDeMisEnlaces(a))
  })
})
