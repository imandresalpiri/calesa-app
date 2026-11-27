import { describe, expect, it } from 'vitest'
import type { EsperasDelVehiculo } from './esperas'
import { resumenDeLasEsperas, type AccionDeLaTarjetaDeEsperas } from './tarjeta-de-esperas'

const VACIO: EsperasDelVehiculo = { items: [], hayMas: false }
const EMPEZAR: AccionDeLaTarjetaDeEsperas = {
  clave: 'pedir',
  etiqueta: 'Pedir repuestos para este vehículo',
  destino: { tipo: 'ruta', href: '/repuestos?panel=nuevo-proyecto' },
}
const claves = (r: ReturnType<typeof resumenDeLasEsperas>) => r.acciones.map((a) => a.clave)

describe('resumenDeLasEsperas', () => {
  it('sin esperas: qué verá cuando espere y, si llega, cómo empezar antes de «Ver»', () => {
    const r = resumenDeLasEsperas({ esperas: VACIO, empezar: EMPEZAR })
    expect(r.lineas).toEqual([
      'Este vehículo no espera ningún repuesto.',
      'Cuando espere un repuesto, verás cuál, en qué proyecto y qué fase espera.',
    ])
    expect(claves(r)).toEqual(['pedir', 'ver'])
    expect(claves(resumenDeLasEsperas({ esperas: VACIO, empezar: null }))).toEqual(['ver'])
  })

  it('con esperas: cuántas y la primera, sin empezar; sin lectura, lo dice', () => {
    const esperas: EsperasDelVehiculo = {
      items: [
        {
          itemId: 'i',
          descripcion: 'Faro',
          proyectoId: 'p1',
          proyectoNumero: 7,
          faseId: 'f',
          faseNombre: null,
          esperas: [],
        },
      ],
      hayMas: false,
    }
    const con = resumenDeLasEsperas({ esperas, empezar: EMPEZAR })
    expect(con.lineas).toEqual(['Espera 1 repuesto', 'Faro · Proyecto 7'])
    expect(claves(con)).toEqual(['ver'])
    expect(resumenDeLasEsperas({ esperas: null, empezar: EMPEZAR }).lineas).toEqual([
      'No pudimos leer el resumen.',
    ])
  })
})
