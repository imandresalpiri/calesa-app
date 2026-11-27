import { describe, expect, it } from 'vitest'
import type { PasadaLeida } from './cadena'
import { filtroDesdeLaUrl, hayFiltro, opcionesDelFiltro, SIN_FILTRO } from './filtro-del-historial'

const ID = '00000000-0000-4000-8000-000000000001'
const ID2 = '00000000-0000-4000-8000-000000000002'

const pasada = (
  aFaseId: string,
  nombre: string,
  quienId: string | null,
  quien: string | null,
): PasadaLeida => ({
  historialId: 1,
  aFaseId,
  nombre,
  color: null,
  activa: true,
  entro: '2026-11-01T00:00:00Z',
  quienId,
  quien,
  nota: null,
})

describe('filtro del historial', () => {
  it('lee la URL: ids válidos y «sistema»; lo demás se descarta', () => {
    expect(filtroDesdeLaUrl({ fase: ID, quien: ID2 })).toEqual({ fase: ID, quien: ID2 })
    expect(filtroDesdeLaUrl({ fase: null, quien: 'sistema' })).toEqual({
      fase: null,
      quien: 'sistema',
    })
    expect(filtroDesdeLaUrl({ fase: 'x', quien: 'Ana' })).toEqual(SIN_FILTRO)
    expect(filtroDesdeLaUrl({ fase: undefined, quien: undefined })).toEqual(SIN_FILTRO)
    expect(filtroDesdeLaUrl({ fase: 'sistema', quien: null })).toEqual(SIN_FILTRO)
  })

  it('dice si hay filtro', () => {
    expect(hayFiltro(SIN_FILTRO)).toBe(false)
    expect(hayFiltro({ fase: ID, quien: null })).toBe(true)
    expect(hayFiltro({ fase: null, quien: 'sistema' })).toBe(true)
  })

  it('arma las opciones sin repetir, por nombre, con «Sistema» para un cambio sin persona', () => {
    const opciones = opcionesDelFiltro([
      pasada(ID, 'Puerto', ID2, 'Beto'),
      pasada(ID2, 'Aduana', null, null),
      pasada(ID, 'Puerto', ID2, 'Beto'),
      pasada(ID2, 'Aduana', ID, 'Ana'),
    ])
    expect(opciones.fases).toEqual([
      { valor: ID2, etiqueta: 'Aduana' },
      { valor: ID, etiqueta: 'Puerto' },
    ])
    expect(opciones.quienes).toEqual([
      { valor: ID, etiqueta: 'Ana' },
      { valor: ID2, etiqueta: 'Beto' },
      { valor: 'sistema', etiqueta: 'Sistema' },
    ])
  })
})
