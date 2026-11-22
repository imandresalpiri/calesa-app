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

const { leerTablaDeAyuda } = vi.hoisted(() => ({ leerTablaDeAyuda: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn(), leerTablaDeAyuda }))
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

const ID_DE_FLETES = '7d0c1b8e-4c1f-4d34-9a51-2f1f7f3b8e10'
const COLUMNAS_DE_FLETES = [{ columna: 'monto' }, { columna: 'zona' }, { columna: 'borrada' }]

const celda = (nodo: string, ayuda: unknown[]) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'raw',
  editable: true,
  ayuda,
})

// c1: texto, título, texto con negrita, la tabla de fletes con columnas (con el id de la viva: quien mira configura), otro título y la de seguros. c2: la de fletes sin
// el id (quien mira no configura). c3: más filas que una página.
function hojaDeBloques(abierta: string): HojaLista {
  const hoja = hojaDesde({
    ...crudaDeLaHoja(),
    secciones: [
      {
        id: 'a',
        titulo: 'Flete',
        presentacion: 'principal',
        items: [
          celda('c1', [
            { tipo: 'texto', texto: 'Antes del título' },
            { tipo: 'titulo', texto: 'Cómo se calcula el flete' },
            { tipo: 'texto', texto: 'Usa la **zona** del puerto' },
            { tipo: 'tabla', tabla: 'fletes', columnas: COLUMNAS_DE_FLETES, id: ID_DE_FLETES },
            { tipo: 'titulo', texto: 'Otra parte' },
            { tipo: 'tabla', tabla: 'seguros' },
          ]),
          celda('c2', [{ tipo: 'tabla', tabla: 'fletes', columnas: COLUMNAS_DE_FLETES }]),
          celda('c3', [{ tipo: 'tabla', tabla: 'larga' }]),
        ],
      },
    ],
  })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return { ...hoja, abierta }
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { c1: 1, c2: 2, c3: 3 } }),
  estado: { tipo: 'al_dia' },
}

const tabla = (clave: string, filas: number): TablaDeAyuda => ({
  clave,
  nombre: clave === 'fletes' ? 'Fletes por zona' : `Tabla ${clave}`,
  columnas: [
    { clave: 'zona', etiqueta: 'Zona', tipo: 'texto' },
    { clave: 'monto', etiqueta: 'Monto', tipo: 'numero' },
    { clave: 'nota', etiqueta: 'Nota', tipo: 'texto' },
  ],
  filas: Array.from({ length: filas }, (_, i) => ({ zona: `Z${String(i)}`, monto: i, nota: 'n' })),
  hayMas: false,
})

const leida = (t: TablaDeAyuda): Resultado<TablaDeAyuda> => ({ ok: true, data: t })

// La tabla de una ayuda se recuerda por hoja abierta en la memoria del módulo: cada prueba, con la suya.
let vuelta = 0
let hoja = hojaDeBloques('abierta.0')
const montar = () =>
  render(
    <NuqsTestingAdapter searchParams="">
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

const abrir = async (nodo: string, titulo: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Ayuda de ${nodo}` }))
  return screen.findByRole('dialog', { name: titulo })
}

beforeEach(() => {
  vuelta += 1
  hoja = hojaDeBloques(`abierta.${String(vuelta)}`)
  window.sessionStorage.clear()
  leerTablaDeAyuda.mockReset()
  leerTablaDeAyuda.mockImplementation(({ tabla: clave }: { tabla: string }) =>
    Promise.resolve(leida(tabla(clave, clave === 'larga' ? 25 : 2))),
  )
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HojaDeCotizar: la ayuda en bloques', () => {
  it('el primer título es el del panel; los demás bloques van en su orden y lo que va entre ** sale en negrita', async () => {
    montar()
    const panel = await abrir('C1', 'Cómo se calcula el flete')
    await within(panel).findByText('Fletes por zona')
    await within(panel).findByText('Tabla seguros')
    expect(within(panel).getAllByText('Cómo se calcula el flete')).toHaveLength(1)
    expect(within(panel).getByText('zona', { selector: 'strong' })).toBeTruthy()
    const texto = panel.textContent
    const orden = ['Antes del título', 'Usa la', 'Fletes por zona', 'Otra parte', 'Tabla seguros']
    const posiciones = orden.map((t) => texto.indexOf(t))
    expect(posiciones.every((p) => p >= 0)).toBe(true)
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones)
    expect(within(panel).getByRole('heading', { name: 'Otra parte' })).toBeTruthy()
  })

  it('las tablas de una ayuda se leen a la vez, no una tras otra', async () => {
    leerTablaDeAyuda.mockReturnValue(new Promise(() => {}))
    montar()
    await abrir('C1', 'Cómo se calcula el flete')
    await waitFor(() => {
      expect(leerTablaDeAyuda).toHaveBeenCalledTimes(2)
    })
    expect(leerTablaDeAyuda.mock.calls.map(([p]) => (p as { tabla: string }).tabla)).toEqual([
      'fletes',
      'seguros',
    ])
  })

  it('un bloque con columnas dibuja ésas, en su orden; a quien configura le dice cuál ya no está en la tabla', async () => {
    montar()
    const panel = await abrir('C1', 'Cómo se calcula el flete')
    const fletes = await within(panel).findByRole('region', { name: 'Tabla Fletes por zona' })
    expect(
      within(fletes)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Monto', 'Zona'])
    expect(within(panel).getByText('La columna «borrada» ya no está en la tabla.')).toBeTruthy()
  })

  it('a quien no configura (el bloque sin el id de la tabla viva) no le avisa de la columna que falta', async () => {
    montar()
    const panel = await abrir('C2', 'Ayuda de C2')
    await within(panel).findByRole('columnheader', { name: 'Monto' })
    expect(within(panel).queryByText(/ya no está en la tabla/)).toBeNull()
  })

  it('dibuja las filas de a 20 y «Ver más filas» suma las siguientes', async () => {
    montar()
    const panel = await abrir('C3', 'Ayuda de C3')
    await within(panel).findByRole('columnheader', { name: 'Zona' })
    expect(within(panel).getAllByRole('row')).toHaveLength(21)
    fireEvent.click(within(panel).getByRole('button', { name: 'Ver más filas' }))
    expect(within(panel).getAllByRole('row')).toHaveLength(26)
    expect(within(panel).queryByRole('button', { name: 'Ver más filas' })).toBeNull()
  })
})
