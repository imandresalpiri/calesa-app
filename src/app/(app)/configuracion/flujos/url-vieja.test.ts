import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { destinoDeLaUrlVieja } from './url-vieja'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const ORIGENES = [{ id: A }, { id: B }]

const con = (clave: ClavePermiso, origenId: string | null = null): Permisos => [
  { clave, origenId, alcance: 'todos' },
]
const flujos = con('flujos.configurar')

describe('la URL vieja de Configuración › Flujos', () => {
  it('`?ambito=repuestos` va al flujo de repuestos, con su fase', () => {
    expect(destinoDeLaUrlVieja({ ambito: 'repuestos', fase: 'f1' }, flujos, ORIGENES)).toBe(
      '/repuestos/configuracion/flujo?fase=f1',
    )
  })

  it('`?origen=` va a la pestaña Fases del origen, conservando sección, fase y lo demás', () => {
    expect(
      destinoDeLaUrlVieja(
        { origen: B, seccion: 'reglas', fase: 'f1', vista: 'lista', panel: 'x' },
        flujos,
        ORIGENES,
      ),
    ).toBe(`/configuracion/origenes/${B}/fases?seccion=reglas&fase=f1&vista=lista&panel=x`)
  })

  it('sin origen: el primero donde configura el flujo', () => {
    expect(destinoDeLaUrlVieja({}, con('flujos.configurar', B), ORIGENES)).toBe(
      `/configuracion/origenes/${B}/fases`,
    )
    expect(destinoDeLaUrlVieja({ seccion: 'documentos' }, flujos, ORIGENES)).toBe(
      `/configuracion/origenes/${A}/fases?seccion=documentos`,
    )
  })

  it('sin origen y sin configurar ninguno: repuestos o, si no, Tipos de documento', () => {
    expect(destinoDeLaUrlVieja({}, con('repuestos.configurar'), ORIGENES)).toBe(
      '/repuestos/configuracion/flujo',
    )
    expect(destinoDeLaUrlVieja({}, con('logistica.catalogos.gestionar'), ORIGENES)).toBe(
      '/logistica/configuracion/tipos-de-documento',
    )
    expect(destinoDeLaUrlVieja({}, flujos, [])).toBe('/logistica/configuracion/tipos-de-documento')
  })

  it('`?seccion=documentos` sin `flujos.configurar` va a Tipos de documento, sin la sección', () => {
    expect(
      destinoDeLaUrlVieja(
        { seccion: 'documentos', origen: A, panel: 'nuevo-tipo' },
        con('logistica.catalogos.gestionar'),
        ORIGENES,
      ),
    ).toBe('/logistica/configuracion/tipos-de-documento?panel=nuevo-tipo')
  })

  it('nunca devuelve origen ni ambito', () => {
    const casos = [
      { origen: [A, B] },
      { ambito: 'repuestos', origen: A },
      { ambito: 'otro', seccion: 'documentos' },
    ]
    for (const caso of casos) {
      expect(destinoDeLaUrlVieja(caso, flujos, ORIGENES)).not.toMatch(/[?&](origen|ambito)=/)
    }
  })
})
