import { describe, expect, it } from 'vitest'
import type { PasadaLeida } from './cadena'
import { resumenDelHistorial, resumenDeNotas } from './resumen-de-notas'

const AHORA = new Date('2026-11-27T15:00:00Z')

const pasada = (nombre: string, extra: Partial<PasadaLeida> = {}): PasadaLeida => ({
  historialId: 1,
  aFaseId: nombre,
  nombre,
  color: null,
  activa: true,
  entro: '2026-11-27T13:00:00Z',
  quienId: null,
  quien: null,
  nota: null,
  ...extra,
})

describe('resumenDeNotas', () => {
  it('vacío, con «Escribir una nota» primero si puede', () => {
    const r = resumenDeNotas({ nota: null, puedeEscribir: true, ahora: AHORA })
    expect(r.lineas).toEqual(['Sin notas todavía.'])
    expect(r.acciones.map((a) => a.clave)).toEqual(['escribir', 'ver'])
    expect(r.acciones[0]?.destino).toEqual({ tipo: 'drawer', enfocar: '[data-nota-nueva]' })
    expect(
      resumenDeNotas({ nota: null, puedeEscribir: false }).acciones.map((a) => a.clave),
    ).toEqual(['ver'])
  })

  it('la última nota: quién, cuándo y su texto', () => {
    const r = resumenDeNotas({
      nota: { cuerpo: 'Llamar al puerto', autor: 'Ana', creadoEn: '2026-11-27T13:00:00Z' },
      puedeEscribir: true,
      ahora: AHORA,
    })
    expect(r.lineas).toEqual(['Ana, hace 2 horas', 'Llamar al puerto'])
  })
})

describe('resumenDelHistorial', () => {
  it('sin lectura, sin cambios y el último cambio con quién', () => {
    expect(resumenDelHistorial(null).lineas).toEqual(['No pudimos leer las fases pasadas.'])
    expect(resumenDelHistorial([]).lineas).toEqual(['Todavía no cambió de fase.'])
    const r = resumenDelHistorial(
      [pasada('Puerto', { quienId: 'x', quien: 'Beto' }), pasada('Compra')],
      AHORA,
    )
    expect(r.lineas).toEqual(['«Compra» → «Puerto»', 'Beto, hace 2 horas'])
    expect(resumenDelHistorial([pasada('Compra')], AHORA).lineas).toEqual([
      'Entró a «Compra»',
      'Sistema, hace 2 horas',
    ])
  })
})
