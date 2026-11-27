import { describe, expect, it } from 'vitest'
import {
  accionesDeLaFilaDelContenedor,
  accionesDeLaFilaDelEmbarque,
  accionesDelContenedor,
  accionesDelEmbarque,
  huecoDeLaAccion,
} from './acciones-de-embarques'

const claves = (a: { clave: string }[]) => a.map((x) => x.clave)
const DOCUMENTOS = [{ clave: 'documentos', titulo: 'Subir un documento a las unidades' }]

describe('los «⋯» de Embarques', () => {
  it('la fila: editar sólo con permiso', () => {
    expect(claves(accionesDeLaFilaDelEmbarque(true))).toEqual(['abrir', 'editar'])
    expect(claves(accionesDeLaFilaDelEmbarque(false))).toEqual(['abrir'])
    expect(claves(accionesDeLaFilaDelContenedor(true))).toEqual(['abrir', 'embarque'])
    expect(claves(accionesDeLaFilaDelContenedor(false))).toEqual(['abrir'])
  })

  it('la cabecera del embarque: sin permiso, sólo los huecos', () => {
    expect(claves(accionesDelEmbarque(true, DOCUMENTOS))).toEqual([
      'editar',
      'agregar-contenedor',
      'agregar-vehiculos',
      'hueco:documentos',
    ])
    expect(claves(accionesDelEmbarque(false, DOCUMENTOS))).toEqual(['hueco:documentos'])
  })

  it('el contenedor: en el drawer, abrir y mover ya están a la vista', () => {
    const base = { puedeEditar: true, puedeMover: true, huecos: DOCUMENTOS }
    expect(claves(accionesDelContenedor({ ...base, enElDrawer: false }))).toEqual([
      'abrir',
      'editar',
      'agregar-vehiculos',
      'mover',
      'hueco:documentos',
    ])
    expect(claves(accionesDelContenedor({ ...base, enElDrawer: true }))).toEqual([
      'editar',
      'hueco:documentos',
    ])
    expect(
      claves(
        accionesDelContenedor({
          ...base,
          puedeEditar: false,
          puedeMover: false,
          enElDrawer: false,
        }),
      ),
    ).toEqual(['abrir', 'hueco:documentos'])
  })

  it('la clave de un hueco', () => {
    expect(huecoDeLaAccion('hueco:gastos')).toBe('gastos')
    expect(huecoDeLaAccion('editar')).toBeNull()
  })
})
