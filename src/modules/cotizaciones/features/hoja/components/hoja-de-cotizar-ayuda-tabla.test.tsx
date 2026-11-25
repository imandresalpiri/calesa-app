import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDesde, type HojaLista } from '../../../entities/hoja'
import { crudaDeLaHoja, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { TablaDeAyuda } from '../../../entities/tabla-de-ayuda'
import type { Guardado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'

const { leerTablaDeAyuda, refresh } = vi.hoisted(() => ({
  leerTablaDeAyuda: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn(), leerTablaDeAyuda }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

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

// a1 (dinero) y f1 (un factor, `raw`) con ayuda de tabla, t1 con ayuda de texto, s1 sin ayuda; y1, en «Avanzado», con ayuda de tabla.
function hojaDeTablas(): HojaLista {
  const hoja = hojaDesde({
    ...crudaDeLaHoja(),
    secciones: [
      {
        id: 'a',
        titulo: 'Subasta',
        presentacion: 'principal',
        items: [
          celda('a1', { ayuda: [{ tipo: 'tabla', tabla: 'aduana' }] }),
          celda('f1', { formato: 'raw', ayuda: [{ tipo: 'tabla', tabla: 'factores' }] }),
          celda('t1', { ayuda: [{ tipo: 'texto', texto: 'Cómo se usa t1' }] }),
          celda('s1'),
        ],
      },
      {
        id: 'y',
        titulo: 'Póliza',
        presentacion: 'avanzado',
        items: [celda('y1', { ayuda: [{ tipo: 'tabla', tabla: 'poliza' }] })],
      },
    ],
  })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { a1: 1, f1: 2, t1: 3, s1: 4, y1: 5 } }),
  estado: { tipo: 'al_dia' },
}

const TABLA: TablaDeAyuda = {
  clave: 'aduana',
  nombre: 'Aduana por año',
  columnas: [
    { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
    { clave: 'factor', etiqueta: 'Factor', tipo: 'numero' },
  ],
  filas: [
    { anio: 2018, factor: 9191.5, oficina: 7 },
    { anio: 2019, factor: 0.123456789 },
  ],
  hayMas: false,
}

const leida = (mas: Partial<TablaDeAyuda> = {}): Resultado<TablaDeAyuda> => ({
  ok: true,
  data: { ...TABLA, ...mas },
})

// La tabla de una ayuda se recuerda por hoja abierta en la memoria del módulo: cada prueba, con la suya.
let hoja = hojaDeTablas()
let vuelta = 0
const montar = (busqueda = '') =>
  render(
    <NuqsTestingAdapter searchParams={busqueda}>
      <HojaDeCotizar
        hoja={hoja}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
      />
    </NuqsTestingAdapter>,
  )

const abrir = async (nombre: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Ayuda de ${nombre}` }))
  return screen.findByRole('dialog', { name: `Ayuda de ${nombre}` })
}

beforeEach(() => {
  vuelta += 1
  const base = hojaDeTablas()
  hoja = { ...base, abierta: `${base.abierta}.${String(vuelta)}` }
  window.sessionStorage.clear()
  leerTablaDeAyuda.mockReset()
  refresh.mockReset()
  leerTablaDeAyuda.mockResolvedValue(leida())
  // Un `matchMedia` de mentira: la pantalla es ancha (la ayuda entra al costado).
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HojaDeCotizar: la ayuda de una tabla', () => {
  it('no lee nada al abrir la hoja; el botón abre el panel y lee con la hoja abierta, sin cotización', async () => {
    montar()
    expect(leerTablaDeAyuda).not.toHaveBeenCalled()
    await abrir('A1')
    expect(leerTablaDeAyuda).toHaveBeenCalledTimes(1)
    const pedido = leerTablaDeAyuda.mock.calls[0]?.[0] as Record<string, unknown>
    expect(pedido).toEqual({
      tabla: 'aduana',
      de: { tipo: 'abierta', origenId: hoja.origen.id, abierta: hoja.abierta, vehiculoId: null },
    })
  })

  it('una celda con sólo texto en su ayuda no lee ninguna tabla', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda de T1' }))
    expect(await screen.findByText('Cómo se usa t1')).toBeTruthy()
    expect(leerTablaDeAyuda).not.toHaveBeenCalled()
  })

  it('mientras lee dibuja un esqueleto dentro del mismo panel', async () => {
    leerTablaDeAyuda.mockReturnValue(new Promise(() => {}))
    montar()
    const panel = await abrir('A1')
    const esqueleto = within(panel).getByLabelText('Cargando la tabla')
    expect(esqueleto.getAttribute('aria-busy')).toBe('true')
  })
})

describe('HojaDeCotizar: lo que dibuja la ayuda de una tabla', () => {
  it('dibuja las columnas declaradas con su etiqueta y las filas en su orden; una clave de más no se ve', async () => {
    montar()
    const panel = await abrir('A1')
    expect(await within(panel).findByRole('columnheader', { name: 'Año' })).toBeTruthy()
    expect(
      within(panel)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Año', 'Factor'])
    expect(within(panel).getByText('Aduana por año')).toBeTruthy()
    const filas = within(panel).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    // El año, sin separador de miles.
    expect(within(filas[0] as HTMLElement).getByText('2018')).toBeTruthy()
    expect(panel.textContent).not.toContain('oficina')
  })

  it('las cifras de la ayuda de una celda de dinero van en <Monto> (el Modo Live las tapa); las de una celda que no lo es, a la vista; el año, nunca', async () => {
    montar()
    const deDinero = await abrir('A1')
    await within(deDinero).findByRole('columnheader', { name: 'Factor' })
    const montos = [...deDinero.querySelectorAll('[data-monto]')]
    expect(montos).toHaveLength(2)
    expect(montos[0]?.querySelector('[data-monto-valor]')?.textContent).toMatch(/9\.191,50/)
    expect(deDinero.textContent).toContain('2018')
    cleanup()

    montar()
    const sinDinero = await abrir('F1')
    await within(sinDinero).findByRole('columnheader', { name: 'Factor' })
    expect(sinDinero.querySelectorAll('[data-monto]')).toHaveLength(0)
    expect(within(sinDinero).getByText('9.191,5')).toBeTruthy()
    expect(within(sinDinero).getByText('0,123457')).toBeTruthy()
  })

  it('sin columnas declaradas dibuja las claves de la primera fila', async () => {
    leerTablaDeAyuda.mockResolvedValue(leida({ columnas: [], nombre: 'aduana' }))
    montar()
    const panel = await abrir('A1')
    const encabezados = await within(panel).findAllByRole('columnheader')
    expect(encabezados.map((c) => c.textContent)).toEqual(['anio', 'factor', 'oficina'])
    // Sin tipo no se sabe si un número es dinero o un año: ninguno va por `<Monto>` (aunque la celda sea de dinero) y salen con `formatearNumero`.
    expect(panel.querySelectorAll('[data-monto]')).toHaveLength(0)
    expect(within(panel).getByText('2.018')).toBeTruthy()
  })

  it('una tabla sin filas lo dice', async () => {
    leerTablaDeAyuda.mockResolvedValue(leida({ filas: [] }))
    montar()
    const panel = await abrir('A1')
    expect(await within(panel).findByText('Esta tabla no tiene filas.')).toBeTruthy()
    expect(within(panel).queryByRole('table')).toBeNull()
  })

  it('si la lectura llegó a su tope, lo dice al pie sin esconder las filas, con el camino a la configuración', async () => {
    leerTablaDeAyuda.mockResolvedValue(leida({ hayMas: true }))
    montar()
    const panel = await abrir('A1')
    const tope = await within(panel).findByText(/^Mostrando las 2 primeras filas\./)
    expect(tope.textContent).toContain('Hay más filas: mira la tabla en la configuración.')
    expect(within(panel).getAllByRole('row')).toHaveLength(3)
  })
})

describe('HojaDeCotizar: los fallos de la ayuda de una tabla', () => {
  it('un fallo que se arregla volviendo a pedir ofrece «Reintentar» y vuelve a leer', async () => {
    leerTablaDeAyuda.mockResolvedValueOnce({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'Sin red: relation "tablas_referencia"' },
    })
    montar()
    const panel = await abrir('A1')
    const alerta = await within(panel).findByRole('alert')
    expect(alerta.textContent).toContain('No se pudo leer la tabla.')
    expect(alerta.textContent).not.toContain('relation')
    fireEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }))
    expect(await within(panel).findByRole('columnheader', { name: 'Año' })).toBeTruthy()
    expect(leerTablaDeAyuda).toHaveBeenCalledTimes(2)
  })

  it.each(['regla', 'sin_permiso', 'no_autenticado'] as const)(
    'un fallo «%s» ofrece «Recargar» y recarga la hoja',
    async (codigo) => {
      leerTablaDeAyuda.mockResolvedValue({ ok: false, error: { codigo, mensaje: 'x' } })
      montar()
      const panel = await abrir('A1')
      const alerta = await within(panel).findByRole('alert')
      expect(within(alerta).queryByRole('button', { name: 'Reintentar' })).toBeNull()
      fireEvent.click(within(alerta).getByRole('button', { name: 'Recargar' }))
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(leerTablaDeAyuda).toHaveBeenCalledTimes(1)
    },
  )

  it('volver a abrirla con la misma hoja abierta no la lee de nuevo y la dibuja de una vez; un fallo no se recuerda', async () => {
    leerTablaDeAyuda.mockResolvedValueOnce({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'x' },
    })
    montar()
    const cerrar = async (panel: HTMLElement) => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
      })
    }
    let panel = await abrir('A1')
    await within(panel).findByRole('alert')
    await cerrar(panel)
    panel = await abrir('A1')
    await within(panel).findByRole('columnheader', { name: 'Año' })
    await cerrar(panel)
    panel = await abrir('A1')
    expect(within(panel).getByRole('columnheader', { name: 'Año' })).toBeTruthy()
    expect(within(panel).queryByLabelText('Cargando la tabla')).toBeNull()
    expect(leerTablaDeAyuda).toHaveBeenCalledTimes(2)
  })
})

describe('HojaDeCotizar: ?ayuda=bloques&nodo=', () => {
  it('abre la ayuda de una celda con tabla de la hoja; la URL de antes (`tabla`), también', async () => {
    montar('?ayuda=bloques&nodo=a1')
    expect(await screen.findByRole('dialog', { name: 'Ayuda de A1' })).toBeTruthy()
    cleanup()
    montar('?ayuda=tabla&nodo=a1')
    expect(await screen.findByRole('dialog', { name: 'Ayuda de A1' })).toBeTruthy()
  })

  it('no abre una celda sin ayuda, un id inventado ni una de «Avanzado» con el modal cerrado', async () => {
    for (const nodo of ['s1', 'no_existe', 'y1']) {
      montar(`?ayuda=bloques&nodo=${nodo}`)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
      })
      cleanup()
    }
    expect(leerTablaDeAyuda).not.toHaveBeenCalled()
  })

  it('la ayuda de una celda de «Avanzado» se abre encima del modal y al cerrarla el foco vuelve a su botón, con el modal abierto', async () => {
    montar('?panel=avanzado&ayuda=bloques&nodo=y1')
    const panel = await screen.findByRole('dialog', { name: 'Ayuda de Y1' })
    expect(document.querySelector('[data-avanzado-cuerpo]')).not.toBeNull()
    await within(panel).findByRole('columnheader', { name: 'Año' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Ayuda de Y1' })).toBeNull()
    })
    expect(document.querySelector('[data-avanzado-cuerpo]')).not.toBeNull()
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ayuda de Y1' }))
    })
  })
})
