import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ENTRADAS_VACIAS, indiceDeHoja } from '../../../../entities/entradas'
import { hojaDePrueba, respuestaDePrueba } from '../../../../entities/hoja-de-prueba.soporte'
import type { RespuestaDeRecalculo } from '../../../../entities/recalculo'
import { ListaDePisadas } from './lista-de-pisadas'
import { RegionDelAvisoDePisado } from './region-del-aviso'

afterEach(cleanup)

// Lo pisado en la pantalla (`docs/COTIZADOR.md` › «Pisar un cálculo»): el aviso de la primera vez y la lista del resumen.
const indice = indiceDeHoja(hojaDePrueba().secciones)
const lista = (overrides: Record<string, number>, respuesta: RespuestaDeRecalculo | null) =>
  render(
    <ListaDePisadas
      contexto={{
        indice,
        entradas: { ...ENTRADAS_VACIAS, overrides: new Map(Object.entries(overrides)) },
        respuesta,
      }}
    />,
  )

describe('la lista de lo pisado del resumen', () => {
  it('una línea por pisada con lo escrito y lo calculado; el dinero por `<Monto>`', () => {
    lista(
      { fees: 500, factor: 0.5 },
      respuestaDePrueba({ calculados: { fees: 480, factor: null } }),
    )
    const lineas = [...document.querySelectorAll('[data-pisadas] li')]
    expect(lineas.map((l) => l.textContent.replace(/\s+/g, ' '))).toEqual([
      expect.stringMatching(/^Editado a mano: FEES .*500.*, calculado .*480/),
      expect.stringMatching(/^Editado a mano: FACTOR 0[.,]5, calculado —$/),
    ])
    expect(lineas[0]?.querySelectorAll('[data-monto]')).toHaveLength(2)
  })

  it('sin la respuesta no dice lo calculado; sin nada pisado no dibuja nada', () => {
    lista({ fees: 500 }, null)
    expect(document.querySelector('[data-pisadas] li')?.textContent).not.toContain('calculado')
    cleanup()
    const { container } = lista({ iva_c: 0.2 }, respuestaDePrueba())
    expect(container.innerHTML).toBe('')
  })
})

describe('el aviso de la primera vez', () => {
  const montar = (visible: boolean, alCerrar = vi.fn()) =>
    render(
      <div>
        <RegionDelAvisoDePisado visible={visible} alCerrar={alCerrar} />
        <div data-secciones="">
          <div data-xcell="">
            <button type="button" data-parada="0">
              Remate
            </button>
          </div>
        </div>
      </div>,
    )

  it('la región viva está aunque no haya aviso (vacía), y el aviso llega dentro de ella', async () => {
    const { rerender } = montar(false)
    const region = screen.getByRole('status')
    expect(region.childElementCount).toBe(0)
    rerender(
      <div>
        <RegionDelAvisoDePisado visible alCerrar={() => {}} />
      </div>,
    )
    const aviso = await screen.findByText(/Pisaste un cálculo: queda fijo aunque cambien los datos/)
    expect(screen.getByRole('status').contains(aviso)).toBe(true)
    expect(screen.getByRole('img', { name: 'Volver al calculado' }).textContent).toBe('↺')
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1)
  })

  it('«Cerrar el aviso» lo cierra y deja el foco en la primera celda, lo que sigue con Tab', async () => {
    const alCerrar = vi.fn()
    montar(true, alCerrar)
    const cerrar = await screen.findByRole('button', { name: 'Cerrar el aviso' })
    act(() => {
      fireEvent.click(cerrar)
    })
    expect(alCerrar).toHaveBeenCalledTimes(1)
    expect(document.activeElement?.textContent).toBe('Remate')
  })
})
