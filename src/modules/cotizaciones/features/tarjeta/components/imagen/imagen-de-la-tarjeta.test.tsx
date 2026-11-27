import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

// El visor real llega por `diferido()`: aquí, uno que dice con qué se montó.
const visor = vi.hoisted(() => vi.fn())
vi.mock('./diferidos', () => ({
  VisorDeLaImagenDiferido: (props: { pedidos: number; url: string; clave: string }) => {
    visor(props)
    return <p>visor con {props.pedidos} pedidos</p>
  },
}))

import { ImagenDeLaTarjeta } from './imagen-de-la-tarjeta'

const ID = '00000000-0000-4000-8000-000000000001'
const ALT = 'Imagen de la tarjeta de la cotización n.º 12'

const montar = (
  total: { valor: number } | null = { valor: 1234.5 },
  { visor, lugar }: { visor?: string; lugar?: 'resumen' | 'lista' } = {},
) =>
  render(
    <NuqsTestingAdapter searchParams={visor === undefined ? {} : { visor }}>
      <ImagenDeLaTarjeta
        cotizacionId={ID}
        numero={12}
        total={total}
        {...(lugar === undefined ? {} : { lugar })}
      />
    </NuqsTestingAdapter>,
  )
const imagen = () => screen.getByAltText(ALT)
// La imagen pone su `src` recién con su turno en la cola (una promesa: asíncrono). jsdom no tiene `IntersectionObserver`: está a la vista enseguida.
const conTurno = () => screen.findByAltText(ALT)
// La URL que pide una imagen (jsdom la vuelve absoluta).
const urlDe = (img: HTMLElement) => {
  const url = new URL(img.getAttribute('src') ?? '', 'http://localhost')
  return url.pathname + url.search
}
const pedida = () => urlDe(imagen())
// `next/image` avisa la carga tras decodificarla: asíncrono.
const cargar = async () => {
  fireEvent.load(await conTurno())
  await waitFor(() => {
    expect(screen.queryByRole('status')).toBeNull()
  })
}

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('live')
  visor.mockReset()
})

describe('<ImagenDeLaTarjeta>', () => {
  it('con su turno pide la imagen a su ruta; mientras carga, el recuadro con el total y «Preparando la imagen…»', async () => {
    montar()
    expect(screen.queryByAltText(ALT)).toBeNull()
    expect(urlDe(await conTurno())).toBe(`/cotizaciones/${ID}/imagen`)
    expect(imagen().getAttribute('loading')).toBe('eager')
    expect(screen.getByRole('status').textContent).toBe('Preparando la imagen…')
    // El total, con <Monto> (el formato regional lo prueba `formato.ts`).
    expect(document.querySelector('[data-monto-valor]')?.textContent).toMatch(/1.?234/)
    expect(screen.getByRole('button', { name: /en grande/ })).toHaveProperty('disabled', true)
  })

  it('sin total, sólo el texto', () => {
    montar(null)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(document.querySelector('[data-monto]')).toBeNull()
  })

  it('si falla, lo dice con «Reintentar», que vuelve a la cola y la pide con otra URL', async () => {
    montar()
    fireEvent.error(await conTurno())
    expect(screen.getByText('No se pudo armar la imagen.')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByRole('status').textContent).toBe('Preparando la imagen…')
    await waitFor(() => {
      expect(pedida()).toBe(`/cotizaciones/${ID}/imagen?intento=1`)
    })
  })

  it('a lo sumo cuatro se piden a la vez: la quinta, cuando una termina', async () => {
    const ids = [1, 2, 3, 4, 5].map((n) => `00000000-0000-4000-8000-00000000000${String(n)}`)
    render(
      <NuqsTestingAdapter>
        {ids.map((id, i) => (
          <ImagenDeLaTarjeta key={id} cotizacionId={id} numero={i + 1} total={null} />
        ))}
      </NuqsTestingAdapter>,
    )
    const pedidas = () => [...document.querySelectorAll('img')].map(urlDe)
    await waitFor(() => {
      expect(pedidas()).toHaveLength(4)
    })
    expect(pedidas()).not.toContain(`/cotizaciones/${ids[4] ?? ''}/imagen`)
    fireEvent.load(screen.getByAltText('Imagen de la tarjeta de la cotización n.º 2'))
    await waitFor(() => {
      expect(pedidas()).toContain(`/cotizaciones/${ids[4] ?? ''}/imagen`)
    })
  })
})

describe('<ImagenDeLaTarjeta>: el visor y el Modo Live', () => {
  it('cargada, se ve sola y el clic la abre en el visor (que se monta recién ahí)', async () => {
    montar()
    await cargar()
    expect(visor).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: `Ver la ${ALT.toLocaleLowerCase('es')} en grande` }),
    )
    expect(screen.getByText('visor con 1 pedidos')).toBeTruthy()
    expect(visor).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: `/cotizaciones/${ID}/imagen`,
        pedidos: 1,
        clave: `imagen-${ID}`,
      }),
    )
  })

  it('un enlace con la clave de antes (`portada-…`) monta el visor con esa clave; la de otro lugar, no', () => {
    montar(undefined, { visor: `portada-${ID}` })
    expect(visor).toHaveBeenLastCalledWith(
      expect.objectContaining({ clave: `portada-${ID}`, pedidos: 0 }),
    )
    cleanup()
    visor.mockReset()
    montar(undefined, { visor: `portada-${ID}`, lugar: 'lista' })
    expect(visor).not.toHaveBeenCalled()
  })

  it('con el Modo Live pide la variante sin moneda, también el visor, y el clic la abre', async () => {
    document.documentElement.classList.add('live')
    montar()
    expect(urlDe(await conTurno())).toBe(`/cotizaciones/${ID}/imagen?sin-moneda=1`)
    expect(imagen().getAttribute('data-imagen-moneda')).toBe('sin')
    await cargar()
    expect(screen.queryByText('Oculto en Modo Live')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /en grande/ }))
    expect(visor).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: `/cotizaciones/${ID}/imagen?sin-moneda=1`,
        variante: 'sin',
        pedidos: 1,
      }),
    )
  })

  it('cambiar el Modo Live vuelve a pedirla en la otra variante, con el recuadro mientras llega', async () => {
    montar()
    await cargar()
    expect(imagen().getAttribute('data-imagen-moneda')).toBe('con')
    act(() => {
      document.documentElement.classList.add('live')
      window.dispatchEvent(new StorageEvent('storage', { key: 'modo-live', newValue: '1' }))
    })
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('Preparando la imagen…')
    })
    expect(urlDe(await conTurno())).toBe(`/cotizaciones/${ID}/imagen?sin-moneda=1`)
    expect(screen.getByRole('button', { name: /en grande/ })).toHaveProperty('disabled', true)
  })
})
