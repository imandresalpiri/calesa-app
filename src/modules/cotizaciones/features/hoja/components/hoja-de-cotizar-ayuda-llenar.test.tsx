import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import type * as Toasts from '@/shared/ui/toasts'
import type { RecalculoInicial } from '../../../entities/apertura'
import { SIN_DESHACER_EN_LA_HOJA } from '../../../entities/destino-de-la-ayuda'
import { hojaDesde, type HojaLista } from '../../../entities/hoja'
import { crudaDeLaHoja, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { TablaDeAyuda } from '../../../entities/tabla-de-ayuda'
import type { Guardado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'

const { leerTablaDeAyuda, avisarConDeshacer, avisar } = vi.hoisted(() => ({
  leerTablaDeAyuda: vi.fn(),
  avisarConDeshacer: vi.fn(),
  avisar: vi.fn(),
}))
vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn(), leerTablaDeAyuda }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/shared/ui/toasts', async (original) => ({
  ...(await original<typeof Toasts>()),
  avisarConDeshacer,
  avisar,
}))

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
  formato: 'raw',
  editable: true,
  ...mas,
})

// La ayuda de «ayudada»: una tabla cuyas columnas llenan IVA (un número), FLETE (dinero) y BLOQUEADA (un cálculo que no se pisa), y que resalta la fila del año del vehículo.
const AYUDA = [
  {
    tipo: 'tabla',
    tabla: 'impuestos',
    columnas: [
      { columna: 'tipo' },
      { columna: 'anio' },
      { columna: 'iva', llena: 'iva' },
      { columna: 'flete', llena: 'flete' },
      { columna: 'otro', llena: 'bloqueada' },
    ],
    resaltar: true,
    casa: [{ columna: 'anio', campo: 'anio' }],
  },
]

function hojaConAyuda(abierta: string): HojaLista {
  const hoja = hojaDesde({
    ...crudaDeLaHoja(),
    secciones: [
      {
        id: 'a',
        titulo: 'Impuestos',
        presentacion: 'principal',
        items: [
          celda('ayudada', { ayuda: AYUDA }),
          celda('iva'),
          celda('flete', { formato: 'usd' }),
          celda('bloqueada', {
            tipo_nodo: 'calculo',
            editable: false,
            motivo: { codigo: 'se_calcula' },
          }),
        ],
      },
    ],
  })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return { ...hoja, abierta }
}

const TABLA: TablaDeAyuda = {
  clave: 'impuestos',
  nombre: 'Impuestos por tipo',
  columnas: [
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto' },
    { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
    { clave: 'iva', etiqueta: 'IVA', tipo: 'numero' },
    { clave: 'flete', etiqueta: 'Flete', tipo: 'numero' },
    { clave: 'otro', etiqueta: 'Otro', tipo: 'numero' },
  ],
  filas: [
    { tipo: 'Sedán', anio: 2017, iva: 0.12, flete: 1000, otro: 1 },
    { tipo: 'SUV', anio: 2018, iva: 0.13, flete: 1500, otro: 2 },
  ],
  hayMas: false,
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { bloqueada: 7 } }),
  estado: { tipo: 'al_dia' },
}

// La tabla de una ayuda se recuerda por hoja abierta en la memoria del módulo: cada prueba, con la suya.
let vuelta = 0
const montar = (valoresDelVehiculo?: Record<string, number | string>) =>
  render(
    <NuqsTestingAdapter searchParams="">
      <HojaDeCotizar
        hoja={hojaConAyuda(`abierta.${String(vuelta)}`)}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
        valoresDelVehiculo={valoresDelVehiculo}
      />
    </NuqsTestingAdapter>,
  )

const abrir = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ayuda de AYUDADA' }))
  const panel = await screen.findByRole('dialog', { name: 'Ayuda de AYUDADA' })
  await within(panel).findByRole('region', { name: 'Tabla Impuestos por tipo' })
  return panel
}

const valorDe = (nodo: string) =>
  document.querySelector(`[data-nodo="${nodo}"] [data-parada="0"]`)?.textContent ?? ''

// Lo que hace «Deshacer» en el aviso que dejó el último clic.
const deshacer = () => {
  const ultimo = avisarConDeshacer.mock.lastCall as [string, () => void] | undefined
  if (!ultimo) {
    throw new Error('No hubo aviso con «Deshacer».')
  }
  act(() => {
    ultimo[1]()
  })
}

function tipear(nodo: string, texto: string) {
  fireEvent.click(document.querySelector(`[data-nodo="${nodo}"] [data-parada="0"]`) as Element)
  const entrada = document.querySelector<HTMLInputElement>(`[data-nodo="${nodo}"] input`)
  if (!entrada) {
    throw new Error('No se abrió la edición')
  }
  fireEvent.change(entrada, { target: { value: texto } })
  fireEvent.keyDown(entrada, { key: 'Enter' })
}

beforeEach(() => {
  vuelta += 1
  window.sessionStorage.clear()
  leerTablaDeAyuda.mockReset()
  leerTablaDeAyuda.mockResolvedValue({ ok: true, data: TABLA })
  avisarConDeshacer.mockReset()
  avisar.mockReset()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.classList.remove(CLASE_LIVE)
})

describe('HojaDeCotizar: un valor de la tabla de la ayuda llena su celda', () => {
  it('el valor es un botón que lo escribe en su celda, cierra la ayuda y avisa con «Deshacer», que vuelve a lo de antes', async () => {
    montar()
    const panel = await abrir()
    const antes = valorDe('iva')
    fireEvent.click(within(panel).getByRole('button', { name: 'Usar 0,13 en IVA' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Ayuda de AYUDADA' })).toBeNull()
    })
    expect(valorDe('iva')).toMatch(/0,13/)
    expect(avisarConDeshacer).toHaveBeenCalledWith('IVA = 0,13', expect.any(Function))
    deshacer()
    expect(valorDe('iva')).toBe(antes)
    expect(avisar).not.toHaveBeenCalled()
  })

  it('después de otro cambio en la hoja, «Deshacer» no toca nada y lo dice', async () => {
    montar()
    const panel = await abrir()
    fireEvent.click(within(panel).getByRole('button', { name: 'Usar 0,12 en IVA' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    tipear('iva', '5')
    deshacer()
    expect(valorDe('iva')).toMatch(/^5/)
    expect(avisar).toHaveBeenCalledWith(SIN_DESHACER_EN_LA_HOJA)
  })

  it('una columna que llena una celda con candado, o que no llena nada, queda como texto', async () => {
    montar()
    const panel = await abrir()
    expect(within(panel).queryByRole('button', { name: /en BLOQUEADA/ })).toBeNull()
    const nombres = within(panel)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label') ?? '')
      .filter((n) => n.startsWith('Usar '))
    // Dos filas por las dos columnas que llenan una celda que se tipea.
    expect(nombres).toHaveLength(4)
  })

  it('con el Modo Live, un destino de dinero dice la cifra sin su moneda en el botón y en el aviso', async () => {
    document.documentElement.classList.add(CLASE_LIVE)
    montar()
    const panel = await abrir()
    const deFlete = within(panel).getAllByRole('button', { name: /^Usar [\d.,]+ en FLETE$/ })
    expect(deFlete).toHaveLength(2)
    fireEvent.click(deFlete[1] as HTMLElement)
    expect(avisarConDeshacer).toHaveBeenCalledWith(
      expect.stringMatching(/^FLETE = [\d.,]+$/),
      expect.any(Function),
    )
  })
})

describe('HojaDeCotizar: «Tu vehículo» en la tabla de la ayuda', () => {
  it('resalta la primera fila que casa con los datos del vehículo', async () => {
    montar({ anio: 2018 })
    const panel = await abrir()
    const resaltada = panel.querySelector('[data-fila-del-vehiculo]')
    expect(resaltada?.textContent).toContain('Tu vehículo')
    expect(resaltada?.textContent).toContain('SUV')
    expect(panel.querySelectorAll('[data-fila-del-vehiculo]')).toHaveLength(1)
  })

  it('sin un vehículo (o si ninguna fila casa) no resalta ninguna', async () => {
    montar()
    const panel = await abrir()
    expect(panel.querySelector('[data-fila-del-vehiculo]')).toBeNull()
    cleanup()
    vuelta += 1
    montar({ anio: 2030 })
    const otro = await abrir()
    expect(otro.querySelector('[data-fila-del-vehiculo]')).toBeNull()
    expect(within(otro).queryByText('Tu vehículo')).toBeNull()
  })
})
