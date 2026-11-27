import { describe, expect, it } from 'vitest'
import type { ProyectoDeVehiculo } from '../proyectos/resumen'
import type { EsperasDelVehiculo } from './esperas'
import { resumenDeLasEsperas } from './tarjeta-de-esperas'

const V = '00000000-0000-4000-8000-0000000000a1'
const proyecto = (cerradoEn: string | null): ProyectoDeVehiculo => ({
  id: 'p1',
  numero: 7,
  cerradoEn,
  actualizadoEn: '2026-11-01',
})
const VACIO: EsperasDelVehiculo = { items: [], hayMas: false }

const acciones = (r: ReturnType<typeof resumenDeLasEsperas>) =>
  r.acciones.map((a) => [a.etiqueta, a.destino.tipo === 'ruta' ? a.destino.href : 'drawer'])

describe('resumenDeLasEsperas', () => {
  it('sin proyecto y con permiso: «Pedir repuestos para este vehículo»', () => {
    const r = resumenDeLasEsperas({
      esperas: VACIO,
      vehiculoId: V,
      proyecto: null,
      puedeEditar: true,
    })
    expect(r.lineas).toEqual([
      'Este vehículo no espera ningún repuesto.',
      'Cuando espere un repuesto, verás cuál, en qué proyecto y qué fase espera.',
    ])
    expect(acciones(r)).toEqual([
      ['Pedir repuestos para este vehículo', `/repuestos?panel=nuevo-proyecto&vehiculo=${V}`],
      ['Ver lo que espera', 'drawer'],
    ])
  })

  it('con el proyecto abierto: «Agregar un repuesto»; cerrado: ninguna', () => {
    const abierto = resumenDeLasEsperas({
      esperas: VACIO,
      vehiculoId: V,
      proyecto: proyecto(null),
      puedeEditar: true,
    })
    expect(acciones(abierto)[0]).toEqual(['Agregar un repuesto', '/repuestos/p1?panel=nuevo-item'])
    const cerrado = resumenDeLasEsperas({
      esperas: VACIO,
      vehiculoId: V,
      proyecto: proyecto('2026-11-02'),
      puedeEditar: true,
    })
    expect(acciones(cerrado)).toEqual([['Ver lo que espera', 'drawer']])
  })

  it('sin `repuestos.editar` no ofrece empezar', () => {
    const r = resumenDeLasEsperas({
      esperas: VACIO,
      vehiculoId: V,
      proyecto: null,
      puedeEditar: false,
    })
    expect(r.acciones.map((a) => a.clave)).toEqual(['ver'])
  })

  it('con esperas: cuántas y la primera; sin lectura, lo dice', () => {
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
    expect(
      resumenDeLasEsperas({ esperas, vehiculoId: V, proyecto: null, puedeEditar: true }).lineas,
    ).toEqual(['Espera 1 repuesto', 'Faro · Proyecto 7'])
    expect(
      resumenDeLasEsperas({ esperas: null, vehiculoId: V, proyecto: null, puedeEditar: true })
        .lineas,
    ).toEqual(['No pudimos leer el resumen.'])
  })
})
