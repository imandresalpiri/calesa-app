import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos, useAtajo } from '@/shared/ui/atajos'
import type { AltaDelPanel } from '../alta-del-panel'
import type { VehiculoDelPanel } from '../../../entities/panel-para-cotizar'
import { PanelDelVehiculo } from './panel-del-vehiculo'

const altaMontada = vi.fn()
// La action del dato del vehículo importa el servidor: aquí no se elige ningún dato.
vi.mock('../actions/guardar-dato-del-vehiculo', () => ({ guardarDatoDelVehiculo: {} }))
vi.mock('./diferidos', () => ({
  AltaDesdeElPanelDiferida: (props: {
    vista: string
    textoInicial: string
    consultarAlMontar: boolean
    alVolver: () => void
    alElegir: (id: string) => void
  }) => {
    altaMontada(props)
    return (
      <div>
        <p>Alta {props.vista}</p>
        <button type="button" onClick={props.alVolver}>
          Volver a la lista
        </button>
        <button
          type="button"
          onClick={() => {
            props.alElegir(NUEVO)
          }}
        >
          Crear y elegir
        </button>
      </div>
    )
  },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/cotizaciones/nuevo',
  useSearchParams: () => new URLSearchParams('origen=o&lead=l&panel=vehiculo'),
}))

const ELEGIDO = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const NUEVO = '00000000-0000-4000-8000-000000000099'
const vehiculo = (id: string, titulo: string): VehiculoDelPanel => ({
  id,
  numero: 3,
  titulo,
  anio: 2020,
  lote: '77',
  precio: null,
  creadoEn: '2026-10-01T08:00:00Z',
  cotizadoEn: '2026-10-29T08:00:00Z',
  cierreSubastaEn: null,
  situacion: 'fase',
  portadaRuta: null,
})
let filas = [vehiculo(ELEGIDO, 'Corolla elegido'), vehiculo(OTRO, 'Civic otro')]
const leer = vi.fn((_pedido: { lista: string; texto?: string }) =>
  Promise.resolve({ ok: true, data: { filas, siguiente: null, anterior: null } }),
)
vi.mock('../../../composicion.client', () => ({
  leerListaDelPanel: (pedido: { lista: string; texto?: string }) => leer(pedido),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  filas = [vehiculo(ELEGIDO, 'Corolla elegido'), vehiculo(OTRO, 'Civic otro')]
})

// La hoja registra «guardar» antes de que se abra el panel.
function Hoja({ alGuardar }: { alGuardar: () => void }) {
  useAtajo('guardar', alGuardar)
  return null
}

type Opciones = {
  esSubasta: boolean
  alGuardar: () => void
  conElegido: boolean
  historial: ReactNode
  url: string
  alta: AltaDelPanel | null
  arriba: ReactNode
  soloElegido: boolean
  sinQuitar: boolean
  motivo: string | null
}

function montar(pedidas: Partial<Opciones> = {}) {
  const {
    esSubasta,
    alGuardar,
    conElegido,
    historial,
    url,
    alta,
    arriba,
    soloElegido,
    sinQuitar,
    motivo,
  } = {
    esSubasta: true,
    alGuardar: vi.fn(),
    conElegido: true,
    historial: null,
    url: '?origen=o&lead=l&panel=vehiculo&lista=ultima',
    alta: null,
    arriba: null,
    soloElegido: false,
    sinQuitar: false,
    motivo: null,
    ...pedidas,
  }
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(cambio) => cambios.push(cambio)} hasMemory>
      <ProveedorAtajos>
        <Hoja alGuardar={alGuardar} />
        <PanelDelVehiculo
          abierto
          alCerrar={vi.fn()}
          origenId="o"
          esSubasta={esSubasta}
          elegido={
            conElegido
              ? { id: ELEGIDO, numero: 3, titulo: 'Corolla elegido', lote: '77', portadaRuta: null }
              : null
          }
          alta={alta}
          claveDeLaUrl="vehiculo"
          historial={historial}
          arriba={arriba}
          soloElegido={soloElegido}
          sinQuitar={sinQuitar}
          motivo={motivo}
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return { alGuardar, cambios }
}

describe('PanelDelVehiculo', () => {
  it('en un origen de subasta tiene las dos pestañas; en otro, sólo «Últ. cotización»', async () => {
    montar()
    expect(await screen.findByRole('tab', { name: 'Cierre subasta' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    cleanup()
    montar({ esSubasta: false })
    await screen.findByText('Civic otro')
    expect(screen.queryByRole('tab', { name: 'Cierre subasta' })).toBeNull()
    expect(screen.queryByText('Cierre subasta')).toBeNull()
  })

  it('el elegido va arriba con «Quitar», y su tarjeta dice «Seleccionado»', async () => {
    const { cambios } = montar()
    const elegida = await screen.findByRole('button', { name: /Corolla elegido/, current: true })
    expect(elegida.textContent).toContain('Seleccionado')
    expect(
      screen.getByRole('button', { name: /Civic otro/ }).getAttribute('aria-current'),
    ).toBeNull()
    expect(screen.getByRole('region', { name: 'Elegido' }).textContent).toContain('Corolla elegido')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?origen=o&lead=l'))
  })

  it('elegir pone el vehículo y quita el panel, en el servidor y reemplazando la entrada de abrirlo', async () => {
    const { cambios } = montar()
    fireEvent.click(await screen.findByRole('button', { name: /Civic otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${OTRO}`),
    )
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).toBe(false)
  })

  it('cada vehículo y el elegido llevan «Ver … en Vehículos»: la ficha en otra pestaña, sin elegir ni cerrar', async () => {
    const { cambios } = montar()
    const enlace = await screen.findByRole('link', { name: 'Ver Civic otro en Vehículos' })
    expect(enlace.getAttribute('href')).toBe(`/vehiculos/${OTRO}`)
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toBe('noopener')
    // Hermano del botón que elige, no hijo.
    expect(enlace.closest('button')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Ver Corolla elegido en Vehículos' })).toHaveLength(
      2,
    )
    fireEvent.click(enlace)
    expect(cambios).toHaveLength(0)
  })

  it('con el panel abierto, Ctrl+S no guarda la hoja', async () => {
    const { alGuardar } = montar()
    await screen.findByText('Civic otro')
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(alGuardar).not.toHaveBeenCalled()
  })

  it('el historial se dibuja dentro de la región «Elegido»; sin elegido, no', async () => {
    montar({ historial: <p>Aquí va el historial</p> })
    const region = await screen.findByRole('region', { name: 'Elegido' })
    expect(region.textContent).toContain('Aquí va el historial')
    cleanup()
    montar({ conElegido: false, historial: <p>Aquí va el historial</p> })
    await screen.findByText('Civic otro')
    expect(screen.queryByText('Aquí va el historial')).toBeNull()
  })
})

describe('PanelDelVehiculo: el buscador', () => {
  it('sin texto: el campo de búsqueda va arriba de «Elegido» y las pestañas siguen', async () => {
    montar()
    const campo = await screen.findByRole('searchbox', { name: 'Buscar un vehículo' })
    const elegido = screen.getByRole('region', { name: 'Elegido' })
    expect(campo.compareDocumentPosition(elegido) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    expect(screen.queryByText('Resultados')).toBeNull()
  })

  it('con un texto que se busca no hay pestañas: dice «Resultados» y pide la búsqueda', async () => {
    montar({ url: '?origen=o&lead=l&panel=vehiculo&lista=ultima&buscar=Civic' })
    await screen.findByText('Civic otro')
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Civic')
    expect(leer).toHaveBeenCalledWith(
      expect.objectContaining({ lista: 'busqueda', texto: 'Civic' }),
    )
  })

  it('sin resultados dice qué se buscó; con menos de 3 letras avisa y deja las pestañas', async () => {
    filas = []
    montar({ url: '?origen=o&lead=l&panel=vehiculo&buscar=zzq' })
    expect(
      await screen.findByText(
        'Ningún vehículo de este origen tiene «zzq» en el título, el VIN o el lote.',
      ),
    ).toBeTruthy()
    cleanup()
    montar({ url: '?origen=o&lead=l&panel=vehiculo&buscar=Ci' })
    expect(await screen.findByText('Escribe al menos 3 letras o números.')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    expect(screen.queryByText('Resultados')).toBeNull()
  })

  it('elegir un resultado quita también lo buscado', async () => {
    const { cambios } = montar({ url: '?origen=o&lead=l&panel=vehiculo&buscar=Civic' })
    fireEvent.click(await screen.findByRole('button', { name: /Civic otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${OTRO}`),
    )
  })
})

describe('PanelDelVehiculo › lo de arriba y sólo el elegido (T307)', () => {
  it('lo de arriba va antes del buscador', async () => {
    montar({ arriba: <p>Campo de arriba</p> })
    const arriba = await screen.findByText('Campo de arriba')
    const buscador = screen.getByRole('searchbox')
    expect(arriba.compareDocumentPosition(buscador) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sólo el elegido: lo de arriba y el elegido sin «Quitar», sin buscador ni listas', async () => {
    montar({ arriba: <p>Campo de arriba</p>, soloElegido: true })
    expect(await screen.findByText('Campo de arriba')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Elegido' }).textContent).toContain('Corolla elegido')
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.queryByText('Civic otro')).toBeNull()
  })
})

describe('PanelDelVehiculo › cambiar el vehículo de una guardada (T315)', () => {
  it('sin «Quitar»: el elegido sin el botón, con el buscador y las listas para elegir otro', async () => {
    const { cambios } = montar({ sinQuitar: true })
    expect(await screen.findByText('Civic otro')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Elegido' }).textContent).toContain('Corolla elegido')
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull()
    expect(screen.getByRole('searchbox')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Civic otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${OTRO}`),
    )
  })

  it('sólo el elegido con un motivo: el motivo va después de lo de arriba y antes del elegido', async () => {
    montar({
      arriba: <p>Campo de arriba</p>,
      soloElegido: true,
      motivo: 'Una cotización final no cambia de vehículo.',
    })
    const arriba = await screen.findByText('Campo de arriba')
    const motivo = screen.getByText('Una cotización final no cambia de vehículo.')
    const elegido = screen.getByRole('region', { name: 'Elegido' })
    expect(arriba.compareDocumentPosition(motivo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(motivo.compareDocumentPosition(elegido) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })
})
