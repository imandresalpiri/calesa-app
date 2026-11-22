import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDesde, type HojaLista } from '../../../entities/hoja'
import { crudaDeLaHoja, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { Guardado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'

vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const QUIETO: Guardado = {
  estado: { tipo: 'listo' },
  enLinea: true,
  hayPendiente: false,
  ocupado: false,
  guardar: () => {},
  guardarConLaAbierta: () => {},
  olvidarAviso: () => {},
  reiniciar: () => {},
}

const celda = (nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'usd',
  editable: true,
  ...mas,
})

// Principal, avanzada, principal, avanzada: «Avanzado» va donde estaba la primera, con las dos adentro.
function hojaDeAvanzado(): HojaLista {
  const hoja = hojaDesde({
    ...crudaDeLaHoja(),
    secciones: [
      { id: 'a', titulo: 'Subasta', presentacion: 'principal', items: [celda('a1')] },
      {
        id: 'x',
        titulo: 'Componentes CIF',
        presentacion: 'avanzado',
        items: [celda('x1', { ayuda: [{ tipo: 'texto', texto: 'Cómo se usa x1' }] })],
      },
      {
        id: 'b',
        titulo: 'Aduana',
        presentacion: 'principal',
        items: [
          celda('b1', { ayuda: [{ tipo: 'texto', texto: 'Cómo se usa b1' }] }),
          celda('b3', {
            ayuda: [
              { tipo: 'texto', texto: 'Mira la subasta' },
              {
                tipo: 'enlaces',
                enlaces: [
                  { titulo: 'Copart', url: 'https://www.copart.com/' },
                  { titulo: 'IAA', url: 'https://www.iaai.com/' },
                ],
              },
            ],
          }),
          celda('b2', { ayuda: [{ tipo: 'tabla', tabla: 'aduana' }] }),
        ],
      },
      { id: 'y', titulo: 'Póliza', presentacion: 'avanzado', items: [celda('y1')] },
    ],
  })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { a1: 1, x1: 2, b1: 3, b2: 4, b3: 6, y1: 5 } }),
  estado: { tipo: 'al_dia' },
}

const montar = (
  busqueda = '',
  guardado: Guardado = QUIETO,
  onUrlUpdate?: (cambio: UrlUpdateEvent) => void,
) =>
  render(
    <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={onUrlUpdate}>
      <HojaDeCotizar
        hoja={hojaDeAvanzado()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={guardado}
      />
    </NuqsTestingAdapter>,
  )

// Un `matchMedia` de mentira: la pantalla es ancha (la ayuda entra al costado).
beforeEach(() => {
  window.sessionStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HojaDeCotizar: la ayuda de texto', () => {
  it('una celda con ayuda de texto tiene «Ayuda de X» y abre el texto', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda de B1' }))
    const panel = await screen.findByRole('dialog', { name: 'Ayuda de B1' })
    expect(within(panel).getByText('Cómo se usa b1')).toBeTruthy()
  })

  it('una celda con ayuda de tabla tiene su botón y una sin ayuda no', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Ayuda de B2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ayuda de A1' })).toBeNull()
  })

  it('?ayuda=bloques&nodo= abre la ayuda de una celda de la hoja; un nodo que no se dibuja no abre nada', async () => {
    montar('?ayuda=bloques&nodo=b1')
    expect(await screen.findByRole('dialog', { name: 'Ayuda de B1' })).toBeTruthy()
    cleanup()
    montar('?ayuda=bloques&nodo=x1')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(screen.queryByText('Cómo se usa x1')).toBeNull()
  })

  it('los enlaces de la ayuda abren en otra pestaña, sin opener ni referrer, y su nombre lo dice', async () => {
    montar('?ayuda=bloques&nodo=b3')
    const panel = await screen.findByRole('dialog', { name: 'Ayuda de B3' })
    expect(within(panel).getByRole('heading', { name: 'Consulta estas fuentes' })).toBeTruthy()
    const enlace = within(panel).getByRole('link', { name: /^Copart\s*\(abre en otra pestaña\)$/ })
    expect(enlace.getAttribute('href')).toBe('https://www.copart.com/')
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
    expect(within(panel).getAllByRole('link')).toHaveLength(2)
  })

  it('una URL de antes (`?ayuda=texto`) abre la misma ayuda y pasa a `bloques` sin sumar una entrada al historial', async () => {
    const onUrlUpdate = vi.fn<(cambio: UrlUpdateEvent) => void>()
    montar('?ayuda=texto&nodo=b1', QUIETO, onUrlUpdate)
    expect(await screen.findByRole('dialog', { name: 'Ayuda de B1' })).toBeTruthy()
    await waitFor(() => {
      expect(onUrlUpdate).toHaveBeenCalled()
    })
    const cambio = onUrlUpdate.mock.calls.at(-1)?.[0]
    expect(cambio?.searchParams.get('ayuda')).toBe('bloques')
    expect(cambio?.searchParams.get('nodo')).toBe('b1')
    expect(cambio?.options.history).toBe('replace')
  })

  it('una ayuda sin enlaces no dice «Consulta estas fuentes»', async () => {
    montar('?ayuda=bloques&nodo=b1')
    const panel = await screen.findByRole('dialog', { name: 'Ayuda de B1' })
    expect(within(panel).queryByText('Consulta estas fuentes')).toBeNull()
  })
})
