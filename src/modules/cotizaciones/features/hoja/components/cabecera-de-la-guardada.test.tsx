import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CabeceraDeLaGuardada } from './cabecera-de-la-guardada'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import { ProveedorDelMenuDeLaGuardada } from './menu-de-la-guardada'
import { render } from './render-con-url.soporte'

vi.mock('../../revisiones/components/diferidos', () => ({
  PanelDeRevisionesDiferido: ({ abierto, numero }: { abierto: boolean; numero: number }) => (
    <div data-panel-de-revisiones={abierto ? 'abierto' : 'cerrado'}>Panel {numero}</div>
  ),
}))

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const props = {
  id: COTIZACION,
  numero: 123,
  clase: 'preventa' as const,
  actualizadoEn: '2026-11-04T10:00:00.123456+00:00',
  version: 1,
  cadena: { anterior: null, encima: null, puedeCotizarEncima: false },
  venceEl: '2026-12-04',
  vencida: false,
  origen: 'Miami',
  cliente: null,
  vehiculo: null,
  guardable: false,
}

// La cabecera como la monta la página: con el «⋯» (su proveedor) y, si se pide, con «Compartir» del hueco de la vista previa.
const conMenu = (ui: React.ReactElement, compartir = false) => (
  <ProveedorDelMenuDeLaGuardada>
    {compartir ? (
      <ContextoDeLaVistaPrevia
        value={{ dibujar: () => null, compartir: () => <button type="button">Compartir</button> }}
      >
        {ui}
      </ContextoDeLaVistaPrevia>
    ) : (
      ui
    )}
  </ProveedorDelMenuDeLaGuardada>
)

async function abrirElMenu() {
  const boton = screen.getByRole('button', { name: 'Más acciones de N.º 123' })
  act(() => {
    fireEvent.pointerDown(boton)
    fireEvent.mouseDown(boton)
    fireEvent.click(boton)
  })
  await waitFor(() => {
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0)
  })
}

afterEach(cleanup)

describe('CabeceraDeLaGuardada: «Revisiones» en el «⋯» (C1)', () => {
  it('la línea está para todo el que abre la página y abre el panel por su URL', async () => {
    render(conMenu(<CabeceraDeLaGuardada {...props} />))
    expect(document.querySelector('[data-panel-de-revisiones]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Revisiones' })).toBeNull()
    await abrirElMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Revisiones' }))
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-panel-de-revisiones]')
          ?.getAttribute('data-panel-de-revisiones'),
      ).toBe('abierto')
    })
    expect(screen.getByText('Panel 123')).toBeTruthy()
  })

  it('recargar con ?panel=revisiones lo abre', () => {
    render(conMenu(<CabeceraDeLaGuardada {...props} />), '?panel=revisiones')
    expect(
      document
        .querySelector('[data-panel-de-revisiones]')
        ?.getAttribute('data-panel-de-revisiones'),
    ).toBe('abierto')
  })
})

const OTRA = '00000000-0000-4000-8000-0000000000bb'
const NUEVA = '00000000-0000-4000-8000-0000000000cc'

describe('CabeceraDeLaGuardada: la cadena (C7)', () => {
  it('con la anterior visible: «Versión 2 de la n.º 120» con su enlace', () => {
    render(
      <CabeceraDeLaGuardada
        {...props}
        version={2}
        cadena={{
          anterior: { id: OTRA, numero: 120, version: 1 },
          encima: null,
          puedeCotizarEncima: false,
        }}
      />,
    )
    const enlace = screen.getByRole('link', { name: 'Versión 2 de la n.º 120' })
    expect(enlace.getAttribute('href')).toBe(`/cotizaciones/${OTRA}`)
  })

  it('con versión mayor que 1 y la anterior que no se ve: «Versión 3», sin enlace', () => {
    render(<CabeceraDeLaGuardada {...props} version={3} />)
    expect(screen.getByText('Versión 3')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Versión/ })).toBeNull()
  })

  it('con la versión nueva visible: «Hay una versión nueva: n.º 130 (versión 2).» con su enlace', () => {
    render(
      <CabeceraDeLaGuardada
        {...props}
        cadena={{
          anterior: null,
          encima: { id: NUEVA, numero: 130, version: 2 },
          puedeCotizarEncima: false,
        }}
      />,
    )
    expect(screen.getByText(/Hay una versión nueva:/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'n.º 130 (versión 2)' }).getAttribute('href')).toBe(
      `/cotizaciones/${NUEVA}`,
    )
  })

  it('con la versión nueva oculta: sólo dice que existe, sin número ni enlace (P11)', () => {
    render(
      <CabeceraDeLaGuardada
        {...props}
        cadena={{ anterior: null, encima: { oculta: true }, puedeCotizarEncima: false }}
      />,
    )
    expect(screen.getByText('Hay una versión nueva que no puedes ver.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /n\.º/ })).toBeNull()
  })

  it('sin anterior, en la versión 1 y sin nueva: nada de cadena', () => {
    render(<CabeceraDeLaGuardada {...props} />)
    expect(screen.queryByText(/Versión \d/)).toBeNull()
    expect(screen.queryByText(/Hay una versión nueva/)).toBeNull()
  })
})

describe('CabeceraDeLaGuardada: lo que va a la vista (T321)', () => {
  it('en la fila del título: las insignias tras la vigencia, el «⋯» y el grupo de «Guardar» y «Compartir»', () => {
    render(
      conMenu(
        <CabeceraDeLaGuardada {...props} guardable insignias={<span>Insignia de prueba</span>} />,
        true,
      ),
    )
    const insignia = screen.getByText('Insignia de prueba')
    const fila = insignia.parentElement
    expect(insignia.previousElementSibling?.textContent).toMatch(/^Vale hasta el /)
    const menu = screen.getByRole('button', { name: 'Más acciones de N.º 123' })
    expect(menu.closest('div')?.parentElement).toBe(fila)
    const grupo = document.querySelector('[data-acciones-de-la-cabecera]')
    expect(grupo?.parentElement).toBe(fila)
    expect(grupo?.children).toHaveLength(2)
    expect(grupo?.lastElementChild?.textContent).toBe('Compartir')
  })

  it('sin `guardable`, no hay lugar para «Guardar»: dice que es de sólo lectura (P13)', () => {
    render(conMenu(<CabeceraDeLaGuardada {...props} />, true))
    const acciones = document.querySelector('[data-acciones-de-la-cabecera]')
    expect(acciones?.children).toHaveLength(2)
    expect(acciones?.firstElementChild?.textContent).toBe(
      'Sólo lectura: no puedes guardar esta cotización.',
    )
  })

  it('las `acciones` de las áreas quedan fuera de la fila: sólo montan sus diálogos', () => {
    render(conMenu(<CabeceraDeLaGuardada {...props} acciones={<span>Diálogo de prueba</span>} />))
    const fila = screen.getByRole('heading', { level: 1 }).parentElement
    expect(screen.getByText('Diálogo de prueba').parentElement).not.toBe(fila)
  })
})
