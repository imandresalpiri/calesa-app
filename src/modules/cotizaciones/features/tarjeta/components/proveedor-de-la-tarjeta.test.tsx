import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { ContextoDeLaVistaPrevia } from '../../hoja/components/hueco-de-la-vista-previa'
import { calculoDePrueba } from '../../../entities/tarjeta/tarjeta.soporte'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'

// La action del modo «Retocar» (llega con la vista previa): sin servidor en las pruebas.
const retocarLaTarjeta = vi.hoisted(() => vi.fn())
vi.mock('../actions/retocar-la-tarjeta', () => ({ retocarLaTarjeta }))
vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  leerTarjeta: () =>
    Promise.resolve<Resultado<LecturaDeLaTarjeta>>({
      ok: true,
      data: { estado: 'sin_plantilla' },
    }),
}))
// El pie de la vista previa conmuta el Live con el router (sin el proveedor del marco, el interruptor no se dibuja).
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { ProveedorDeLaTarjeta } from './proveedor-de-la-tarjeta'

afterEach(cleanup)

function Consumidor() {
  const hueco = useContext(ContextoDeLaVistaPrevia)
  if (hueco === null) {
    return <p>sin proveedor</p>
  }
  return (
    <>
      {hueco.dibujar({
        abierta: true,
        cerrar: () => undefined,
        formulaId: '00000000-0000-4000-8000-0000000000aa',
        calculo: calculoDePrueba(),
        estado: { tipo: 'al_dia' },
        monedaBs: null,
        avisos: { difiere: false, cambiosSinGuardar: false },
      })}
    </>
  )
}

describe('<ProveedorDeLaTarjeta>', () => {
  it('sin proveedor el hueco es nulo', () => {
    render(<Consumidor />)
    expect(screen.getByText('sin proveedor')).toBeTruthy()
  })

  it('llena el hueco con el modal y le da lo que la página sabe', async () => {
    render(
      <ProveedorDeLaTarjeta
        titulo={null}
        cliente={null}
        vehiculo={{ titulo: 'Toyota Hilux 2020', lote: null, vin: null }}
        asesor={{ nombre: 'Ana Pérez', telefono: null, cargo: null, foto: null }}
        numero={7}
        vencida={false}
        venceEl={null}
        guardadaEl={null}
        empresa={null}
        logo={null}
        cotizacionId="00000000-0000-4000-8000-0000000000bb"
      >
        <Consumidor />
      </ProveedorDeLaTarjeta>,
    )
    // El código del modal se pide al abrirse (`diferido()`): la primera vez tarda en transformarse.
    await waitFor(
      () => {
        expect(screen.getByText('Ana Pérez')).toBeTruthy()
      },
      { timeout: 10_000 },
    )
    // Sin plantilla, la tarjeta por omisión: el rótulo y el dato en dos celdas, como en V1.
    expect(screen.getByText('Asesor:')).toBeTruthy()
    expect(screen.getByText('Toyota Hilux 2020')).toBeTruthy()
    expect(screen.getByText('Cotización n.º')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    // Con el id de una guardada, el pie ofrece su PDF.
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeTruthy()
    // La espera de arriba es de 10 s: la prueba necesita más que los 5 s de siempre (cayó a los 5,4 s con la suite en paralelo).
  }, 15_000)
})

describe('<ProveedorDeLaTarjeta> y «Compartir»', () => {
  it('«Compartir» sólo en una guardada: en la hoja nueva el hueco no lo trae', () => {
    const vistos: boolean[] = []
    function Mirar() {
      vistos.push(useContext(ContextoDeLaVistaPrevia)?.compartir !== undefined)
      return null
    }
    const pagina = {
      titulo: null,
      cliente: null,
      vehiculo: null,
      asesor: null,
      numero: null,
      vencida: false,
      venceEl: null,
      guardadaEl: null,
      empresa: null,
      logo: null,
    }
    render(
      <ProveedorDeLaTarjeta {...pagina} cotizacionId={null}>
        <Mirar />
      </ProveedorDeLaTarjeta>,
    )
    render(
      <ProveedorDeLaTarjeta {...pagina} cotizacionId="00000000-0000-4000-8000-0000000000bb">
        <Mirar />
      </ProveedorDeLaTarjeta>,
    )
    expect(vistos).toEqual([false, true])
  })
})
