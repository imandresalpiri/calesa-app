import { describe, expect, it } from 'vitest'
import { pasadasDesde, TOPE_DE_PASADAS } from './pasadas'

const FASE = '00000000-0000-4000-8000-000000000001'
const ANA = '00000000-0000-4000-8000-000000000002'

const fila = (id: number) => ({
  id,
  creado_en: '2026-11-20T10:00:00+00:00',
  nota: id === 1 ? 'Llegó' : null,
  a_fase_id: FASE,
  usuario_id: id === 1 ? ANA : null,
  a: { nombre: 'Puerto', color: '#123456', activa: id !== 2 },
  quien: id === 1 ? { nombre: 'Ana' } : null,
})

describe('pasadasDesde', () => {
  it('lee la fila con su fase y quién; sin persona, quien es nulo', () => {
    expect(pasadasDesde([fila(1), fila(2)])).toEqual({
      pasadas: [
        {
          historialId: 1,
          aFaseId: FASE,
          nombre: 'Puerto',
          color: '#123456',
          activa: true,
          entro: '2026-11-20T10:00:00+00:00',
          quienId: ANA,
          quien: 'Ana',
          nota: 'Llegó',
        },
        expect.objectContaining({ historialId: 2, activa: false, quienId: null, quien: null }),
      ],
      hayMas: false,
    })
  })

  it('corta al tope y dice que hay más', () => {
    const leidas = pasadasDesde(Array.from({ length: TOPE_DE_PASADAS + 1 }, (_, i) => fila(i + 10)))
    expect(leidas?.pasadas).toHaveLength(TOPE_DE_PASADAS)
    expect(leidas?.hayMas).toBe(true)
  })

  it('una forma que no es la prometida da nulo', () => {
    expect(pasadasDesde([{ ...fila(1), a: null }])).toBeNull()
    expect(pasadasDesde(null)).toBeNull()
  })
})
