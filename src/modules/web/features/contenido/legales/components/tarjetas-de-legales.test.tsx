import { cleanup, render, screen } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LegalesDelSitio } from '../../../../entities/contenido/legales'
import { TarjetasDeLegales } from './tarjetas-de-legales'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/guardar-legales', () => ({ guardarLegales: vi.fn() }))

const parrafo = (texto: string) => ({ type: 'paragraph', content: [{ type: 'text', text: texto }] })

const legales: LegalesDelSitio = {
  terminos: {
    titulo: 'Términos y condiciones',
    doc: { type: 'doc', content: [parrafo('Pagas al recibir.')] } as never,
    actualizadoEn: '2026-11-12T10:00:00+00:00',
  },
  privacidad: null,
  actualizadoEn: '2026-11-12T10:00:00.000001+00:00',
}

afterEach(cleanup)

describe('TarjetasDeLegales', () => {
  it('una tarjeta por documento, con su estado, un extracto y su «⋯»', () => {
    const Con = withNuqsTestingAdapter()
    render(
      <Con>
        <TarjetasDeLegales legales={legales} />
      </Con>,
    )
    const terminos = screen.getByRole('region', { name: 'Términos y condiciones' })
    expect(terminos.textContent).toContain('Publicada')
    expect(terminos.textContent).toContain('Pagas al recibir.')
    expect(terminos.textContent).toContain('Última edición')

    const privacidad = screen.getByRole('region', { name: 'Política de privacidad' })
    expect(privacidad.textContent).toContain('Sin publicar')
    expect(privacidad.textContent).toContain('Todavía no se escribió')
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /^Más acciones de / })).toHaveLength(2)
  })
})
