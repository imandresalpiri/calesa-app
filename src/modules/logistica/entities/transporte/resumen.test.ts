import { describe, expect, it } from 'vitest'
import { resumenDeTransporte } from './resumen'
import type { EntidadesDeLaUnidad } from './lectura-de-la-unidad'

const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const C = '00000000-0000-4000-8000-0000000000c1'
const E = '00000000-0000-4000-8000-0000000000e1'
const vehiculos = { n: 2, hayMas: false, hayOcultas: false }

describe('resumenDeTransporte', () => {
  it('sin transporte cargado', () => {
    const r = resumenDeTransporte(null, ORIGEN)
    expect(r.lineas).toEqual(['Esta unidad todavía no tiene transporte cargado.'])
    expect(r.acciones.map((a) => a.clave)).toEqual(['ver'])
  })

  it('suelta: lo dice', () => {
    const r = resumenDeTransporte({ embarque: null, contenedorDeLaUnidad: null }, ORIGEN)
    expect(r.lineas).toEqual(['Sin contenedor ni embarque.'])
  })

  it('en un contenedor de un embarque: las dos líneas y sus pantallas con el origen', () => {
    const lectura: EntidadesDeLaUnidad = {
      contenedorDeLaUnidad: {
        id: C,
        numero: 'MSCU123',
        actualizadoEn: 'x',
        estado: 'en_transito',
        vehiculos,
      },
      embarque: { id: E, booking: 'BK-9', actualizadoEn: 'x', estado: 'armandose', vehiculos },
    }
    const r = resumenDeTransporte(lectura, ORIGEN)
    expect(r.lineas).toEqual(['Contenedor MSCU123 · En tránsito', 'Embarque BK-9 · Armándose'])
    expect(r.aviso).toBeNull()
    expect(r.acciones.map((a) => a.etiqueta)).toEqual([
      'Ver el transporte',
      'Ver el contenedor',
      'Ver el embarque',
    ])
    expect(r.acciones[1]?.destino).toMatchObject({ tipo: 'ruta' })
    expect(JSON.stringify(r.acciones[1]?.destino)).toContain(`contenedor=${C}`)
    expect(JSON.stringify(r.acciones[2]?.destino)).toContain(`origen=${ORIGEN}`)
  })
})
