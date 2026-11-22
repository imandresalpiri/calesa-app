import { describe, expect, it } from 'vitest'
import type { ClaveDePaso, PasoParaCotizar } from '@/modules/origenes'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conDestino } from './origenes/pasos'
import { faltasPorSeccion } from './que-falta'

const CHINA = { id: '00000000-0000-4000-8000-000000000001', nombre: 'China' }
const JAPON = { id: '00000000-0000-4000-8000-000000000002', nombre: 'Japón' }

const faltan = (...pasos: [ClaveDePaso, PasoParaCotizar['estado']][]): PasoParaCotizar[] =>
  pasos.map(([clave, estado]) => ({ clave, titulo: clave, estado, frase: 'x' }))

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))

const TODO = con('cotizaciones.configurar', 'flujos.configurar', 'empresa.ajustes.gestionar')

function de(origen: typeof CHINA, pasos: PasoParaCotizar[], permisos: Permisos = TODO) {
  return { origen, pasos: conDestino(pasos, permisos, origen.id) }
}

describe('faltasPorSeccion', () => {
  it('una línea por origen en Orígenes, enlazada a la primera pestaña que falla', () => {
    expect(
      faltasPorSeccion([de(CHINA, faltan(['flujo', 'bloquea'], ['formula', 'bloquea']))]),
    ).toEqual({
      origenes: [
        {
          clave: CHINA.id,
          texto: 'China: falta configurar el flujo y activar una fórmula',
          ruta: `/configuracion/origenes/${CHINA.id}/fases`,
        },
      ],
    })
  })

  it('la tarjeta, a la pestaña Tarjeta; tres o más, con comas', () => {
    expect(faltasPorSeccion([de(JAPON, faltan(['tarjeta', 'aviso']))]).origenes?.[0]?.ruta).toBe(
      `/configuracion/origenes/${JAPON.id}/tarjeta`,
    )
    expect(
      faltasPorSeccion([
        de(CHINA, faltan(['campos', 'aviso'], ['flujo', 'bloquea'], ['tarjeta', 'aviso'])),
      ]).origenes?.[0]?.texto,
    ).toBe('China: falta activar sus campos, configurar el flujo y publicar la tarjeta')
  })

  it('sin el permiso en ese origen, ese paso no se dice; sin ninguno, no hay línea', () => {
    const soloFormulaEnOtro: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: JAPON.id, alcance: 'todos' },
    ]
    expect(
      faltasPorSeccion([de(CHINA, faltan(['formula', 'bloquea']), soloFormulaEnOtro)]),
    ).toEqual({})
    const soloFlujo = con('flujos.configurar')
    expect(
      faltasPorSeccion([de(CHINA, faltan(['flujo', 'bloquea'], ['formula', 'bloquea']), soloFlujo)])
        .origenes?.[0]?.texto,
    ).toBe('China: falta configurar el flujo')
  })

  it('apibara va una sola vez a Empresa, aunque haya dos subastas', () => {
    const faltas = faltasPorSeccion([
      de(CHINA, faltan(['datos', 'aviso'])),
      de(JAPON, faltan(['datos', 'aviso'], ['formula', 'bloquea'])),
    ])
    expect(faltas.empresa).toEqual([
      {
        clave: 'apibara',
        texto: 'Falta activar apibara',
        ruta: '/configuracion/empresa/integraciones',
      },
    ])
    expect(faltas.origenes?.map((falta) => falta.texto)).toEqual([
      'Japón: falta activar una fórmula',
    ])
  })

  it('sin el permiso de la empresa, apibara no se dice', () => {
    expect(
      faltasPorSeccion([de(CHINA, faltan(['datos', 'aviso']), con('flujos.configurar'))]),
    ).toEqual({})
  })

  it('sin pasos que falten, nada', () => {
    expect(faltasPorSeccion([de(CHINA, [])])).toEqual({})
  })
})
