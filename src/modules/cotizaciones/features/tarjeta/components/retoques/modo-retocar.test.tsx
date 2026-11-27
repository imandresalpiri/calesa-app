import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import type { LecturaDeLaTarjeta } from '../../../../entities/tarjeta/lectura-de-la-tarjeta'
import { tarjetaDesde } from '../../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  crudaDeLaTarjeta,
  DEFINICION_DE_PRUEBA,
} from '../../../../entities/tarjeta/tarjeta.soporte'

// «Retocar» en la vista previa de una guardada y el modo «Retocar la tarjeta» (que llega con `diferido()`), con la lectura y la action simuladas.
type Pedido = { resolver: (r: Resultado<LecturaDeLaTarjeta>) => void }
const pedidos: Pedido[] = []
vi.mock('../../../../areas/tarjeta/composicion.client', () => ({
  leerTarjeta: () =>
    new Promise<Resultado<LecturaDeLaTarjeta>>((resolver) => {
      pedidos.push({ resolver })
    }),
}))
const retocarLaTarjeta = vi.hoisted(() => vi.fn())
vi.mock('../../actions/retocar-la-tarjeta', () => ({ retocarLaTarjeta }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import VistaPreviaDeLaTarjeta, { type DatosDeLaPagina } from '../vista-previa-de-la-tarjeta'

const lista = (mas: Record<string, unknown> = {}): Resultado<LecturaDeLaTarjeta> => {
  const lectura = tarjetaDesde(crudaDeLaTarjeta(mas))
  if (lectura === null) {
    throw new Error('no se lee')
  }
  return { ok: true, data: lectura }
}
const pagina: DatosDeLaPagina = {
  titulo: null,
  cliente: null,
  vehiculo: { titulo: 'Toyota Hilux 2020', lote: null, vin: null },
  asesor: { nombre: 'Ana Pérez', telefono: null, cargo: null, foto: null },
  numero: null,
  vencida: false,
  venceEl: null,
  guardadaEl: null,
  empresa: null,
  logo: null,
  cotizacionId: null,
}

function dibujar(mas: Partial<React.ComponentProps<typeof VistaPreviaDeLaTarjeta>> = {}) {
  return render(
    <VistaPreviaDeLaTarjeta
      abierta
      cerrar={() => undefined}
      formulaId="00000000-0000-4000-8000-0000000000aa"
      calculo={calculoDePrueba()}
      estado={null}
      monedaBs="BOB"
      avisos={{ difiere: false, cambiosSinGuardar: false }}
      pagina={pagina}
      {...mas}
    />,
  )
}

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

const COTIZACION = '00000000-0000-4000-8000-0000000000bb'
const VERSION = '2026-11-18T19:00:00.123456+00:00'
const guardada = (puedeRetocar = true): DatosDeLaPagina => ({
  ...pagina,
  numero: 9,
  cotizacionId: COTIZACION,
  retoque: { retoques: null, actualizadoEn: VERSION, puedeRetocar },
})

describe('<VistaPreviaDeLaTarjeta>: «Retocar» en una guardada', () => {
  beforeEach(() => {
    retocarLaTarjeta.mockReset()
    // jsdom no desplaza: el campo a lo ancho del modal se trae a la vista.
    Element.prototype.scrollIntoView = () => undefined
  })

  it('no está en la hoja nueva ni para quien no la puede guardar', async () => {
    dibujar()
    pedidos[0]?.resolver(lista())
    await screen.findByText('TOTAL DÓLARES')
    expect(screen.queryByRole('button', { name: 'Retocar' })).toBeNull()
    cleanup()
    pedidos.length = 0
    dibujar({ pagina: guardada(false) })
    pedidos[0]?.resolver(lista())
    await screen.findByText('TOTAL DÓLARES')
    expect(screen.queryByRole('button', { name: 'Retocar' })).toBeNull()
  })

  it('con la tarjeta por omisión o con cambios sin guardar va apagado con su motivo', async () => {
    dibujar({ pagina: guardada() })
    pedidos[0]?.resolver({ ok: true, data: { estado: 'sin_plantilla' } })
    const motivo = await screen.findByText(
      'Esta cotización usa la tarjeta por omisión: no hay textos para retocar.',
    )
    const retocar = screen.getByRole('button', { name: 'Retocar' })
    expect((retocar as HTMLButtonElement).disabled).toBe(true)
    expect(retocar.getAttribute('aria-describedby')).toBe(motivo.id)
    cleanup()
    pedidos.length = 0
    dibujar({ pagina: guardada(), avisos: { difiere: false, cambiosSinGuardar: true } })
    pedidos[0]?.resolver(lista())
    await screen.findByText('Guarda o descarta los cambios de la hoja para retocar la tarjeta.')
    expect((screen.getByRole('button', { name: 'Retocar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
})

describe('<VistaPreviaDeLaTarjeta>: el modo «Retocar»', () => {
  beforeEach(() => {
    retocarLaTarjeta.mockReset()
    // jsdom no desplaza: el campo a lo ancho del modal se trae a la vista.
    Element.prototype.scrollIntoView = () => undefined
  })

  it('retoca un texto y oculta una fila: «Listo» manda sólo lo cambiado con la versión que se tenía', async () => {
    retocarLaTarjeta.mockResolvedValue({
      data: { ok: true, data: { actualizadoEn: 'v2', repetido: false } },
    })
    dibujar({ pagina: guardada() })
    pedidos[0]?.resolver(lista())
    fireEvent.click(await screen.findByRole('button', { name: 'Retocar' }))
    expect(await screen.findByRole('heading', { name: 'Retocar la tarjeta' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar el texto «Asesor:»' }))
    const campo = await screen.findByRole('textbox', { name: 'Texto de la celda' })
    fireEvent.change(campo, { target: { value: 'Vendedor:' } })
    expect(screen.getByText('9 de 300')).toBeTruthy()
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(screen.queryByRole('textbox', { name: 'Texto de la celda' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar la fila «TOTAL DÓLARES»' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Listo' }))
    await waitFor(() => {
      expect(retocarLaTarjeta).toHaveBeenCalledWith({
        cotizacionId: COTIZACION,
        actualizadoEnEsperado: VERSION,
        retoques: { celdas: { c_asesor_rotulo: 'Vendedor:' }, filas_ocultas: ['total'] },
      })
    })
  })

  it('un texto de más de 300 apaga «Listo» con su motivo; Esc en el campo lo deja como estaba', async () => {
    dibujar({ pagina: guardada() })
    pedidos[0]?.resolver(lista())
    fireEvent.click(await screen.findByRole('button', { name: 'Retocar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar el texto «Asesor:»' }))
    const campo = await screen.findByRole('textbox', { name: 'Texto de la celda' })
    fireEvent.change(campo, { target: { value: 'x'.repeat(301) } })
    expect(screen.getByText('Tiene 301 caracteres: el máximo es 300.')).toBeTruthy()
    fireEvent.keyDown(campo, { key: 'Enter' })
    const motivo = await screen.findByText(
      'Acorta el texto de la celda «Asesor:»: tiene más de 300 caracteres.',
    )
    const listo = screen.getByRole('button', { name: 'Listo' })
    expect((listo as HTMLButtonElement).disabled).toBe(true)
    expect(listo.getAttribute('aria-describedby')).toBe(motivo.id)
    fireEvent.click(screen.getByRole('button', { name: `Cambiar el texto «${'x'.repeat(40)}…»` }))
    fireEvent.keyDown(await screen.findByRole('textbox', { name: 'Texto de la celda' }), {
      key: 'Escape',
    })
    // Esc vuelve a lo que tenía al abrirlo (el largo, que ya estaba en el borrador); «Cancelar» descarta todo.
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByRole('heading', { name: 'Vista previa' })).toBeTruthy()
    expect(retocarLaTarjeta).not.toHaveBeenCalled()
  })
})

// El rótulo del asesor como un texto con datos que lleva el total: el campo cambia su texto entero, con la cifra, con el Modo Live o sin él.
const conElTotalEnElRotulo = () =>
  lista({
    definicion: {
      ...DEFINICION_DE_PRUEBA,
      celdas: DEFINICION_DE_PRUEBA.celdas.map((c) =>
        c.id === 'c_asesor_rotulo'
          ? {
              ...c,
              contenido: {
                tipo: 'texto',
                partes: ['Total ', { tipo: 'dato', nodo: 'total', mostrar: 'monto' }],
              },
            }
          : c,
      ),
    },
  })

describe('<VistaPreviaDeLaTarjeta>: el modo «Retocar» con el Modo Live', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined
  })
  afterEach(() => {
    document.documentElement.classList.remove(CLASE_LIVE)
  })

  it('con Live, un texto con un monto abre su campo con el texto que se guarda: la cifra entera', async () => {
    document.documentElement.classList.add(CLASE_LIVE)
    dibujar({ pagina: guardada() })
    pedidos[0]?.resolver(conElTotalEnElRotulo())
    fireEvent.click(await screen.findByRole('button', { name: 'Retocar' }))
    fireEvent.click(
      await screen.findByRole('button', { name: /^Cambiar el texto «Total .*1\.355/ }),
    )
    const campo = await screen.findByRole('textbox', { name: 'Texto de la celda' })
    expect((campo as HTMLTextAreaElement).value).toMatch(/^Total .*1\.355/)
    expect(screen.queryByText(/apaga el Modo Live/)).toBeNull()
  })

  it('sin Live, el mismo texto abre su campo con la cifra', async () => {
    dibujar({ pagina: guardada() })
    pedidos[0]?.resolver(conElTotalEnElRotulo())
    fireEvent.click(await screen.findByRole('button', { name: 'Retocar' }))
    fireEvent.click(
      await screen.findByRole('button', { name: /^Cambiar el texto «Total .*1\.355/ }),
    )
    const campo = await screen.findByRole('textbox', { name: 'Texto de la celda' })
    expect((campo as HTMLTextAreaElement).value).toMatch(/^Total .*1\.355/)
  })
})
