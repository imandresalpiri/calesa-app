import { describe, expect, it } from 'vitest'
import { esquemaDeEmbarquesDelGrupo, lineaDelEmbarqueDelGrupo } from './embarques-del-grupo'

const ID = '11111111-1111-4111-8111-111111111111'
const ID2 = '22222222-2222-4222-8222-222222222222'
const embarque = (id: string, booking: string, origen: string | null) => ({
  id,
  booking,
  origen_id: origen,
  actualizado_en: '2026-11-26T10:00:00+00:00',
  estado: 'en_transito',
})

describe('los embarques del grupo', () => {
  it('se leen con su estado; uno sin origen es de repuestos', () => {
    expect(esquemaDeEmbarquesDelGrupo.parse([embarque(ID, 'BK', null)])).toEqual([
      {
        id: ID,
        booking: 'BK',
        origenId: null,
        actualizadoEn: '2026-11-26T10:00:00+00:00',
        estado: 'en_transito',
      },
    ])
    expect(
      esquemaDeEmbarquesDelGrupo.safeParse([{ ...embarque(ID, 'BK', null), estado: 'x' }]).success,
    ).toBe(false)
  })

  it('la línea de un contenedor nombra su embarque; con varios, «sus embarques»', () => {
    const uno = esquemaDeEmbarquesDelGrupo.parse([
      embarque(ID, 'BK-1', ID),
      embarque(ID2, 'BK-1', ID2),
    ])
    expect(lineaDelEmbarqueDelGrupo('contenedor', uno)).toBe(
      'La naviera, los puertos y las fechas son del embarque «BK-1»: cambian para todos sus vehículos.',
    )
    const dos = esquemaDeEmbarquesDelGrupo.parse([
      embarque(ID, 'BK-1', ID),
      embarque(ID2, 'BK-2', ID),
    ])
    expect(lineaDelEmbarqueDelGrupo('contenedor', dos)).toBe(
      'La naviera, los puertos y las fechas son de sus embarques: cambian para todos sus vehículos.',
    )
  })

  it('sin embarque o en un grupo por booking, sin línea', () => {
    expect(lineaDelEmbarqueDelGrupo('contenedor', [])).toBeNull()
    expect(
      lineaDelEmbarqueDelGrupo(
        'booking',
        esquemaDeEmbarquesDelGrupo.parse([embarque(ID, 'BK', ID)]),
      ),
    ).toBeNull()
  })
})
