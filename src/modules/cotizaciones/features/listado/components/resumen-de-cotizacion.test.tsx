import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type * as ReactTipos from 'react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CotizacionDelListado } from '../../../entities/listado/filas-del-listado'
import type { LecturaDelServidor } from '../../../entities/listado/resumen-del-listado'
import type { HuecosDelResumen, QuienDelResumen } from '../../hoja/components/huecos-del-resumen'

// El pedido al servidor sale por nuqs (`shallow: false`): cada escritura que va al servidor cuenta como un pedido.
const pedido = vi.fn()
const alEscribir = (evento: UrlUpdateEvent) => {
  if (!evento.options.shallow) {
    pedido()
  }
}
// Un pedido que no termina: `useTransition` queda pendiente mientras `enCamino` sea true (la navegación de verdad devuelve el control y el pedido sigue).
const estado = { enCamino: false }
vi.mock('react', async (importar) => {
  const react = await importar<typeof ReactTipos>()
  return {
    ...react,
    useTransition: () => {
      const [pendiente, empezar] = react.useTransition()
      return [pendiente || estado.enCamino, empezar] as const
    },
  }
})
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/cotizaciones',
  useSearchParams: () => new URLSearchParams(),
}))

import { ResumenDeCotizacion } from './resumen-de-cotizacion'

afterEach(() => {
  cleanup()
  estado.enCamino = false
  pedido.mockClear()
})

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const origenes = [{ id: ORIGEN, nombre: 'Subastas', color: null }]

const cotizacion = (extra: Partial<CotizacionDelListado> = {}): CotizacionDelListado => ({
  id: ID,
  numero: 1234,
  origenId: ORIGEN,
  leadId: null,
  vehiculoId: null,
  creadoPor: '00000000-0000-4000-8000-0000000000bb',
  clase: 'preventa',
  estado: 'activa',
  titulo: 'Título de prueba',
  totalBase: 100,
  monedaMostrar: null,
  creadoEn: '2026-03-01T12:00:00.123456+00:00',
  venceEl: '2026-04-01',
  vencida: false,
  privada: false,
  cliente: null,
  vehiculo: null,
  autor: 'Ana',
  aprobada: false,
  modo: null,
  ...extra,
})

function dibujar(opciones: {
  busqueda: string
  filas?: CotizacionDelListado[]
  delServidor?: LecturaDelServidor | null
  huecos?: HuecosDelResumen
  quienes?: Record<string, QuienDelResumen>
  aprobarEn?: 'todos' | readonly string[]
  vehiculosVisibles?: 'todos' | readonly string[]
}) {
  return render(
    <NuqsTestingAdapter searchParams={opciones.busqueda} onUrlUpdate={alEscribir} hasMemory>
      <ResumenDeCotizacion
        filas={opciones.filas ?? []}
        origenes={origenes}
        delServidor={opciones.delServidor ?? null}
        huecos={opciones.huecos}
        quienes={opciones.quienes}
        aprobarEn={opciones.aprobarEn}
        vehiculosVisibles={opciones.vehiculosVisibles}
      />
    </NuqsTestingAdapter>,
  )
}

describe('ResumenDeCotizacion', () => {
  it('con la fila en la página: título con el número, origen, «—» sin cliente y «Abrir cotización» a su página', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion()] })
    expect(screen.getByRole('dialog', { name: 'Cotización n.º 1234' })).toBeTruthy()
    expect(screen.getByText('Subastas')).toBeTruthy()
    expect(screen.getByText('Título de prueba')).toBeTruthy()
    expect(screen.getByText('Cliente').nextElementSibling?.textContent).toBe('—')
    expect(screen.getByText('Vehículo').nextElementSibling?.textContent).toBe('—')
    expect(screen.getByRole('link', { name: 'Abrir cotización' }).getAttribute('href')).toBe(
      `/cotizaciones/${ID}`,
    )
    expect(pedido).not.toHaveBeenCalled()
  })

  it('con el cliente y el vehículo leídos, los dibuja; vencida lo dice', () => {
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion({ cliente: 'Gala Guarda', vehiculo: 'Hilux', vencida: true })],
    })
    expect(screen.getByText('Gala Guarda')).toBeTruthy()
    expect(screen.getByText('Hilux')).toBeTruthy()
    expect(screen.getByText('Vencida')).toBeTruthy()
  })

  it('la que leyó el servidor se dibuja igual que una de la página, sin pedir nada', () => {
    dibujar({
      busqueda: `?cotizacion=${ID.toUpperCase()}`,
      delServidor: { id: ID, estado: 'listo', cotizacion: cotizacion({ numero: 77 }) },
    })
    expect(screen.getByRole('dialog', { name: 'Cotización n.º 77' })).toBeTruthy()
    expect(pedido).not.toHaveBeenCalled()
  })

  it('no disponible dice el texto de UX con role="status" y no ofrece abrirla', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, delServidor: { id: ID, estado: 'no_disponible' } })
    expect(screen.getByRole('dialog', { name: 'Cotización no disponible' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(
      'Esta cotización ya no está disponible: no existe o ya no tienes acceso.',
    )
    expect(screen.queryByRole('link', { name: 'Abrir cotización' })).toBeNull()
  })

  it('un id que no es guid dice «no disponible» sin pedir nada', () => {
    dibujar({ busqueda: '?cotizacion=abc' })
    expect(screen.getByRole('status')).toBeTruthy()
    expect(pedido).not.toHaveBeenCalled()
  })

  it('cargando: si no está en la página ni la leyó el servidor, esqueleto con aria-busy mientras el pedido está en camino y se pide una vez', async () => {
    estado.enCamino = true
    dibujar({ busqueda: `?cotizacion=${ID}` })
    expect(screen.getByLabelText('Cargando la cotización').getAttribute('aria-busy')).toBe('true')
    await waitFor(() => {
      expect(pedido).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText('Cargando la cotización')).toBeTruthy()
  })

  it('«Reintentar» en camino vuelve al esqueleto, no al error', async () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, delServidor: { id: ID, estado: 'error' } })
    estado.enCamino = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Cargando la cotización')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('el error de lo que leyó el servidor ofrece «Reintentar», que pide la página otra vez', async () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, delServidor: { id: ID, estado: 'error' } })
    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar la cotización.')
    expect(pedido).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(pedido).toHaveBeenCalledTimes(1)
    })
  })

  it('pedido ya y sin lectura de ese id, el esqueleto no se queda para siempre: dice error con «Reintentar»', async () => {
    // La escritura de prueba termina al instante y la página no trae nada: la vista pasa de «cargando» a «error».
    dibujar({ busqueda: `?cotizacion=${ID}` })
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(pedido).toHaveBeenCalledTimes(1)
  })

  it('sin la clave, cerrado: no hay diálogo', () => {
    dibujar({ busqueda: '', filas: [cotizacion()] })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ResumenDeCotizacion con pestañas', () => {
  it('con el hueco de las pestañas lo dibuja bajo el detalle, con lo que quien mira puede hacer; sin lo calculado, nada de adjuntar ni moderar', () => {
    const Pestanas: NonNullable<HuecosDelResumen['Pestanas']> = (props) => (
      <p data-testid="pestanas">
        {props.cotizacion.id}:{props.cotizacion.clase}:{String(props.puedeAdjuntar)}:
        {String(props.puedeModerar)}:{String(props.abierto)}
      </p>
    )
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion()],
      huecos: { Pestanas },
      quienes: { [ID]: { puedeAdjuntar: true, puedeModerar: false } },
    })
    expect(screen.getByTestId('pestanas').textContent).toBe(`${ID}:preventa:true:false:true`)
    cleanup()
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion()], huecos: { Pestanas } })
    expect(screen.getByTestId('pestanas').textContent).toBe(`${ID}:preventa:false:false:true`)
  })

  it('sin hueco no hay pestañas', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion()] })
    expect(screen.queryByTestId('pestanas')).toBeNull()
  })
})

describe('ResumenDeCotizacion con «De este vehículo»', () => {
  const VEHICULO = '00000000-0000-4000-8000-0000000000cc'
  const DeEsteVehiculo: NonNullable<HuecosDelResumen['DeEsteVehiculo']> = (props) => (
    <p data-testid="de-este-vehiculo">
      {props.vehiculo.id}:{props.vehiculo.titulo}:{props.cotizacionActual}:
      {JSON.stringify(props.aprobarEn)}
    </p>
  )
  // Las pestañas dibujan el bloque que les pasa el resumen (la quinta pestaña).
  const Pestanas: NonNullable<HuecosDelResumen['Pestanas']> = (props) => (
    <div data-testid="pestanas">{props.deEsteVehiculo}</div>
  )

  it('va dentro de las pestañas, después de la cabecera, con el vehículo, «Esta» y dónde aprueba quien mira', () => {
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion({ vehiculoId: VEHICULO, vehiculo: 'Toyota Hilux' })],
      huecos: { Pestanas, DeEsteVehiculo },
      aprobarEn: [ORIGEN],
    })
    const bloque = screen.getByTestId('de-este-vehiculo')
    expect(bloque.textContent).toBe(`${VEHICULO}:Toyota Hilux:${ID}:["${ORIGEN}"]`)
    const datos = screen.getByText('Cliente')
    const pestanas = screen.getByTestId('pestanas')
    expect(datos.compareDocumentPosition(bloque) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pestanas.contains(bloque)).toBe(true)
  })

  it('sin vehículo, o con uno que quien mira no ve (sin nombre), no hay bloque; sin saber dónde aprueba, en ninguno', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion()], huecos: { DeEsteVehiculo } })
    expect(screen.queryByTestId('de-este-vehiculo')).toBeNull()
    cleanup()
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion({ vehiculoId: VEHICULO, vehiculo: null })],
      huecos: { Pestanas, DeEsteVehiculo },
    })
    expect(screen.queryByTestId('de-este-vehiculo')).toBeNull()
    cleanup()
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion({ vehiculoId: VEHICULO, vehiculo: 'Hilux' })],
      huecos: { Pestanas, DeEsteVehiculo },
    })
    expect(screen.getByTestId('de-este-vehiculo').textContent).toContain(':[]')
  })
})

describe('ResumenDeCotizacion: ir al vehículo', () => {
  it('con un vehículo que quien mira ve, el título y el dato «Vehículo» enlazan a su ficha; sin permiso o sin vehículo, texto', () => {
    const VEHICULO = '33333333-3333-4333-8333-333333333333'
    const fila = cotizacion({ vehiculoId: VEHICULO, vehiculo: 'Hilux', titulo: 'Hilux 2022' })
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [fila], vehiculosVisibles: [ORIGEN] })
    const enlace = screen.getByRole('link', { name: 'Ver Hilux 2022 en Vehículos' })
    expect(enlace.getAttribute('href')).toBe(`/vehiculos/${VEHICULO}`)
    expect(enlace.closest('[data-titulo-de-la-cotizacion]')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Hilux' }).getAttribute('href')).toBe(
      `/vehiculos/${VEHICULO}`,
    )
    cleanup()
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [fila], vehiculosVisibles: [] })
    expect(screen.queryByRole('link', { name: /en Vehículos/ })).toBeNull()
    expect(screen.getByText('Hilux 2022')).toBeTruthy()
    cleanup()
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion()], vehiculosVisibles: 'todos' })
    expect(screen.queryByRole('link', { name: /en Vehículos/ })).toBeNull()
  })
})
