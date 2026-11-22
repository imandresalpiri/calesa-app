import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PoliticaDeLaCola } from '../../../../entities/cola/politica'
import { TarjetaDeLaPolitica } from './tarjeta-de-la-politica'

// La tarjeta «Política de la cola»: sus valores a la vista, sólo su «⋯» (ningún botón de acción suelto) y tocarla abre el modal por la URL.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('../actions/guardar-politica', () => ({ guardarPoliticaDeLaCola: vi.fn() }))

const POLITICA: PoliticaDeLaCola = {
  colaActiva: false,
  ttlContactoMinutos: 30,
  diasPegajoso: 14,
  maxAbiertasDefault: 5,
  maxIntentos: 3,
  whatsappRespaldo: null,
  actualizadoEn: '2026-10-12T14:00:00.123456+00:00',
}

afterEach(cleanup)

function dibujar() {
  const Con = withNuqsTestingAdapter()
  render(
    <Con>
      <TarjetaDeLaPolitica politica={POLITICA} />
    </Con>,
  )
}

describe('TarjetaDeLaPolitica', () => {
  it('muestra sus valores como texto, sin inputs', () => {
    dibujar()
    const tarjeta = screen.getByRole('region', { name: 'Política de la cola' })
    expect(tarjeta.textContent).toContain('Apagada')
    expect(tarjeta.textContent).toContain('Minutos para contactar')
    expect(tarjeta.textContent).toContain('30')
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('sólo lleva su «⋯» y el botón con nombre de la tarjeta, ningún «Editar» suelto', () => {
    dibujar()
    const botones = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(botones).toEqual(['Editar Política de la cola', 'Más acciones de Política de la cola'])
  })

  it('tocar la tarjeta abre el modal con sus campos', async () => {
    dibujar()
    fireEvent.click(screen.getByRole('region', { name: 'Política de la cola' }))
    expect(await screen.findByRole('dialog', { name: 'Política de la cola' })).toBeTruthy()
  })
})
