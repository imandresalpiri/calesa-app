import { describe, expect, it } from 'vitest'
import { ENTIDADES_DE_LA_ACTIVIDAD } from './etiquetas'
import { cuelgaDeUnaUnidad, enlaceDelRegistro, entidadEnFrase, iconoDeEntidad } from './registro'

const ID = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const SIN_DESTINO = { vehiculoId: null, proyectoId: null, itemId: null, cotizacionId: null }

describe('el registro en la frase', () => {
  it('toda entidad de la actividad tiene icono y nombre propios', () => {
    for (const tabla of Object.keys(ENTIDADES_DE_LA_ACTIVIDAD)) {
      expect(iconoDeEntidad(tabla), tabla).not.toBe('otro')
      expect(entidadEnFrase(tabla), tabla).not.toBe('un registro')
    }
    expect(iconoDeEntidad('lotes_papelera')).toBe('otro')
    expect(entidadEnFrase('lotes_papelera')).toBe('un registro')
  })

  it('el icono por tipo de registro', () => {
    expect(iconoDeEntidad('leads')).toBe('lead')
    expect(iconoDeEntidad('cotizaciones')).toBe('cotizacion')
    expect(iconoDeEntidad('repuestos_items')).toBe('repuestos')
    expect(iconoDeEntidad('tipos_cambio')).toBe('configuracion')
    expect(cuelgaDeUnaUnidad('gastos')).toBe(true)
    expect(cuelgaDeUnaUnidad('vehiculos')).toBe(false)
    expect(iconoDeEntidad('embarques')).toBe('transporte')
    expect(entidadEnFrase('contenedores')).toBe('un contenedor')
    expect(cuelgaDeUnaUnidad('embarques')).toBe(false)
  })

  it('cada registro a su página; sin título (borrado o sin acceso), sin enlace', () => {
    const base = { registroId: ID, registroTitulo: 'X', registroDestino: null }
    expect(enlaceDelRegistro({ ...base, tabla: 'leads' })).toBe(`/leads/${ID}`)
    expect(enlaceDelRegistro({ ...base, tabla: 'cotizaciones' })).toBe(`/cotizaciones/${ID}`)
    expect(enlaceDelRegistro({ ...base, tabla: 'declaraciones_aduana' })).toBe(
      `/logistica/aduana?declaracion=${ID}`,
    )
    expect(enlaceDelRegistro({ ...base, tabla: 'embarques' })).toBe(`/logistica/embarques/${ID}`)
    expect(enlaceDelRegistro({ ...base, tabla: 'contenedores' })).toBe(
      `/logistica/embarques?contenedor=${ID}`,
    )
    expect(enlaceDelRegistro({ ...base, tabla: 'embarques', registroTitulo: null })).toBeNull()
    expect(enlaceDelRegistro({ ...base, tabla: 'vehiculos', registroTitulo: null })).toBeNull()
    expect(enlaceDelRegistro({ ...base, tabla: 'tabla_desconocida' })).toBeNull()
  })

  it('lo que cuelga de otra cosa va a ella; lo de configuración, a su página', () => {
    const base = { registroId: ID, registroTitulo: 'X' }
    expect(
      enlaceDelRegistro({
        ...base,
        tabla: 'comprobantes',
        registroDestino: { ...SIN_DESTINO, cotizacionId: OTRO },
      }),
    ).toBe(`/cotizaciones/${OTRO}`)
    expect(
      enlaceDelRegistro({
        ...base,
        tabla: 'gastos',
        registroDestino: { ...SIN_DESTINO, proyectoId: OTRO, itemId: ID },
      }),
    ).toBe(`/repuestos/${OTRO}?item=${ID}`)
    expect(
      enlaceDelRegistro({
        ...base,
        tabla: 'pagos',
        registroDestino: { ...SIN_DESTINO, proyectoId: OTRO },
      }),
    ).toBe(`/repuestos/${OTRO}`)
    expect(
      enlaceDelRegistro({
        registroId: ID,
        registroTitulo: null,
        registroDestino: null,
        tabla: 'roles_permisos',
      }),
    ).toBe('/configuracion/roles')
  })
})
