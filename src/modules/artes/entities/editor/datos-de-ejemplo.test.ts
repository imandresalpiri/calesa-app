import { describe, expect, it } from 'vitest'
import { EMPRESA } from '../datos/datos-de-prueba.soporte'
import type { FijosDelArte } from '../datos/tipos'
import { valoresDelArte } from '../datos/valores-del-arte'
import { variablesDelArte } from '../datos/variables-del-arte'
import {
  ASESOR_DE_EJEMPLO,
  CLIENTE_DE_EJEMPLO,
  datosDelArteDeEjemplo,
  FOTOS_DE_EJEMPLO,
  fotoDeEjemplo,
  TARJETA_DE_EJEMPLO,
} from './datos-de-ejemplo'
import { esDelMismoOrigen } from './fuente-de-la-capa'

// Una empresa con su web y todas sus redes: lo que no depende del vehículo sale de ella.
const FIJOS: FijosDelArte = {
  asesor: { nombre: 'Teo Vargas', cargo: 'Asesor', whatsapp: '+591 71111111' },
  empresa: {
    ...EMPRESA,
    redes: {
      facebook: 'calesa',
      instagram: '@calesa',
      tiktok: '@calesa',
      youtube: 'calesa',
      x: '@calesa',
      linkedin: 'calesa',
    },
  },
}

describe('los datos de ejemplo', () => {
  it('llenan cada variable fija de un origen de subasta', () => {
    const catalogo = variablesDelArte({ tipo: 'subasta', campos: [] })
    const datos = datosDelArteDeEjemplo({ fijos: FIJOS, origen: 'Copart' })
    const valores = valoresDelArte(datos, { sinMoneda: false, catalogo })
    for (const { clave } of catalogo.variables) {
      expect(valores.get(clave), clave).toBeTruthy()
    }
  })

  it('nombran el origen de la plantilla y llevan el cliente de ejemplo', () => {
    const datos = datosDelArteDeEjemplo({ fijos: FIJOS, origen: 'Manuales' })
    expect(datos.deEjemplo).toBe(true)
    expect(datos.vehiculo?.origen).toBe('Manuales')
    expect(datos.lead).toEqual({ nombre: CLIENTE_DE_EJEMPLO })
  })

  it('quien comparte y la empresa son los de verdad; sin quien comparte, uno inventado', () => {
    const datos = datosDelArteDeEjemplo({ fijos: FIJOS, origen: 'Copart' })
    expect(datos.asesor).toBe(FIJOS.asesor)
    expect(datos.empresa).toBe(FIJOS.empresa)
    const sinAsesor = datosDelArteDeEjemplo({ fijos: { ...FIJOS, asesor: null }, origen: 'Copart' })
    expect(sinAsesor.asesor).toBe(ASESOR_DE_EJEMPLO)
  })

  it('con el Modo Live, el total sin la moneda', () => {
    const catalogo = variablesDelArte({ tipo: 'manual', campos: [] })
    const datos = datosDelArteDeEjemplo({ fijos: FIJOS, origen: 'Copart' })
    expect(valoresDelArte(datos, { sinMoneda: true, catalogo }).get('total')).not.toMatch(/USD/)
  })

  it('las fotos dan la vuelta después de la tercera', () => {
    expect(fotoDeEjemplo(0)).toBe(FOTOS_DE_EJEMPLO[0])
    expect(fotoDeEjemplo(3)).toBe(FOTOS_DE_EJEMPLO[0])
    expect(fotoDeEjemplo(4)).toBe(FOTOS_DE_EJEMPLO[1])
    expect(fotoDeEjemplo(-1)).toBe(FOTOS_DE_EJEMPLO[2])
  })

  it('todas las imágenes son del mismo origen', () => {
    const datos = datosDelArteDeEjemplo({ fijos: FIJOS, origen: 'Copart' })
    const imagenes = [
      ...FOTOS_DE_EJEMPLO.map((f) => f.src),
      TARJETA_DE_EJEMPLO.src,
      datos.cotizacion?.imagen.src ?? '',
      datos.cotizacion?.imagen.srcSinMoneda ?? '',
    ]
    for (const src of imagenes) {
      expect(src).toMatch(/^\/artes\/ejemplo\/[a-z0-9-]+\.svg$/)
      expect(esDelMismoOrigen(src)).toBe(true)
    }
  })
})
