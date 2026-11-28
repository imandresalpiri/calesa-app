import { describe, expect, it } from 'vitest'
import { leerDocumento, MENSAJE_DOCUMENTO_INVALIDO, VERSION_DEL_DOCUMENTO } from './documento'
import { migrarDocumento } from './migraciones-del-documento'

const BASE_V1 = {
  x: 10,
  y: 20,
  ancho: 200,
  alto: 40,
  rotacion: 15,
  opacidad: 0.8,
  bloqueada: false,
  oculta: true,
}

const IMAGEN = '00000000-0000-0000-0000-0000000000a1'

function v1(capas: unknown[]) {
  return {
    version: 1,
    paginas: [{ id: 'pagina-1', fondo: { tipo: 'color', color: '#ffffff' }, capas }],
  }
}

describe('migrar un documento de arte', () => {
  it('una v1 vacía pasa a v2 con sus grupos vacíos', () => {
    const leido = leerDocumento(v1([]))
    expect(leido).toEqual({
      ok: true,
      data: {
        version: VERSION_DEL_DOCUMENTO,
        paginas: [
          { id: 'pagina-1', fondo: { tipo: 'color', color: '#ffffff' }, capas: [], grupos: [] },
        ],
      },
    })
  })
})

describe('migrar cada tipo de capa', () => {
  it('cada tipo de v1 llega a v2 con lo que suma, sin perder lo suyo', () => {
    const leido = leerDocumento(
      v1([
        {
          ...BASE_V1,
          id: 't',
          tipo: 'texto',
          texto: 'Hola',
          fuente: 'Arial',
          tamano: 48,
          color: '#111111',
          alineacion: 'centro',
        },
        { ...BASE_V1, id: 'i', tipo: 'imagen', imagenId: IMAGEN, ajuste: 'contener' },
        {
          ...BASE_V1,
          id: 'r',
          tipo: 'forma',
          forma: 'rectangulo',
          relleno: '#ff0000',
          borde: null,
          grosor: 0,
        },
        { ...BASE_V1, id: 'l', tipo: 'logo', varianteId: 'oscuro' },
      ]),
    )
    if (!leido.ok) {
      throw new Error(leido.error.mensaje)
    }
    const [texto, imagen, forma, logo] = leido.data.paginas[0]?.capas ?? []
    const comun = { ...BASE_V1, nombre: null, grupoId: null, sombra: null }
    expect(texto).toEqual({
      ...comun,
      id: 't',
      tipo: 'texto',
      texto: 'Hola',
      fuente: 'Arial',
      tamano: 48,
      peso: 400,
      interlineado: 1.2,
      color: '#111111',
      alineacion: 'centro',
      borde: null,
      grosor: 0,
    })
    expect(imagen).toEqual({
      ...comun,
      id: 'i',
      tipo: 'imagen',
      imagenId: IMAGEN,
      ajuste: 'contener',
      radio: 0,
      borde: null,
      grosor: 0,
    })
    expect(forma).toEqual({
      ...comun,
      id: 'r',
      tipo: 'forma',
      forma: 'rectangulo',
      lados: null,
      relleno: '#ff0000',
      borde: null,
      grosor: 0,
      radio: 0,
    })
    expect(logo).toEqual({
      ...comun,
      id: 'l',
      tipo: 'logo',
      varianteId: 'oscuro',
      radio: 0,
      borde: null,
      grosor: 0,
    })
  })
})

describe('migrar la línea de v1', () => {
  it('la línea de v1 (una forma) pasa a ser una capa línea por el medio de su caja', () => {
    const leido = leerDocumento(
      v1([
        {
          ...BASE_V1,
          id: 'li',
          tipo: 'forma',
          forma: 'linea',
          relleno: null,
          borde: '#00ff00',
          grosor: 3,
        },
        {
          ...BASE_V1,
          id: 'li2',
          tipo: 'forma',
          forma: 'linea',
          relleno: '#ff00ff',
          borde: null,
          grosor: 0,
        },
      ]),
    )
    if (!leido.ok) {
      throw new Error(leido.error.mensaje)
    }
    const [linea, otra] = leido.data.paginas[0]?.capas ?? []
    expect(linea).toEqual({
      ...BASE_V1,
      nombre: null,
      grupoId: null,
      sombra: null,
      id: 'li',
      tipo: 'linea',
      puntos: [
        { x: 0, y: 20 },
        { x: 200, y: 20 },
      ],
      borde: '#00ff00',
      grosor: 3,
    })
    expect(otra).toMatchObject({ tipo: 'linea', borde: '#ff00ff', grosor: 1 })
  })
})

describe('lo que no se migra', () => {
  it('una v1 que no es válida queda como está y la lectura la rechaza', () => {
    const roto = v1([{ id: 'x', tipo: 'forma' }])
    expect(migrarDocumento(roto)).toBe(roto)
    expect(leerDocumento(roto)).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DOCUMENTO_INVALIDO },
    })
  })

  it('la versión actual no se toca', () => {
    const actual = { version: VERSION_DEL_DOCUMENTO, paginas: [] }
    expect(migrarDocumento(actual)).toBe(actual)
  })
})
