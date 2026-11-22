import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { primerLugarDeLosCatalogos } from './primer-lugar'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))

describe('primerLugarDeLosCatalogos', () => {
  it('con cotizaciones.configurar, Colores en Orígenes', () => {
    expect(primerLugarDeLosCatalogos(con('cotizaciones.configurar', 'equipo.roles.ver'))).toBe(
      '/configuracion/origenes?panel=colores',
    )
  })

  it('con permisos de Roles, el bloque de cotizaciones', () => {
    expect(primerLugarDeLosCatalogos(con('equipo.roles.ver'))).toBe(
      '/configuracion/roles?bloque=cotizaciones',
    )
    expect(primerLugarDeLosCatalogos(con('equipo.roles.gestionar'))).toBe(
      '/configuracion/roles?bloque=cotizaciones',
    )
  })

  it('sólo con los catálogos de logística, Puertos', () => {
    expect(primerLugarDeLosCatalogos(con('logistica.catalogos.gestionar'))).toBe(
      '/logistica/configuracion/puertos',
    )
  })

  it('con flujos o repuestos, Tipos de documento', () => {
    expect(primerLugarDeLosCatalogos(con('flujos.configurar'))).toBe(
      '/logistica/configuracion/tipos-de-documento',
    )
    expect(primerLugarDeLosCatalogos(con('repuestos.configurar'))).toBe(
      '/logistica/configuracion/tipos-de-documento',
    )
  })

  it('sin ninguno, el inicio de Configuración', () => {
    expect(primerLugarDeLosCatalogos([])).toBe('/configuracion/inicio')
    expect(primerLugarDeLosCatalogos(con('leads.ver'))).toBe('/configuracion/inicio')
  })
})
