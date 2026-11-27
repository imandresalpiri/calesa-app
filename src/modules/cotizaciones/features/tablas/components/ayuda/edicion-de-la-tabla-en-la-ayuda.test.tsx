import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type * as Toasts from '@/shared/ui/toasts'
import type { PropsDeLaEdicionDeLaTabla } from '../../../hoja/components/huecos'

const { leer, ejecutar, avisarExito } = vi.hoisted(() => ({
  leer: vi.fn(),
  ejecutar: vi.fn(),
  avisarExito: vi.fn(),
}))
vi.mock('../../../../areas/tablas/composicion.client', () => ({
  leerTablaParaEditarEnElNavegador: leer,
}))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../../actions/publicar-tabla', () => ({ publicarTabla: {} }))
vi.mock('@/shared/ui/toasts', async (original) => ({
  ...(await original<typeof Toasts>()),
  avisarExito,
}))

import { EdicionDeLaTablaEnLaAyuda } from './edicion-de-la-tabla-en-la-ayuda'

const TABLA_ID = '00000000-0000-4000-8000-0000000000aa'
const ORIGEN_ID = '00000000-0000-4000-8000-0000000000bb'
const COLUMNAS = [
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto' },
  { clave: 'iva', etiqueta: 'IVA', tipo: 'numero' },
]
const FILAS = [
  { tipo: 'Sedán', iva: 0.1494 },
  { tipo: 'Camioneta', iva: 0.2 },
]
const VIVA = {
  id: TABLA_ID,
  origenId: ORIGEN_ID,
  clave: 'iva',
  nombre: 'IVA por tipo',
  descripcion: null,
  // La viva tiene una columna que el bloque no muestra: se conserva al publicar.
  columnas: [...COLUMNAS, { clave: 'nota', etiqueta: 'Nota', tipo: 'texto' }],
  version: 7,
  nota: null,
  publicadoEn: null,
  publicadoPor: null,
  compartida: false,
  tapada: false,
}
const leida = (filas = FILAS) =>
  ok({
    tabla: VIVA,
    filas: filas.map((valores, i) => ({ id: `f${String(i)}`, valores: { ...valores, nota: 'x' } })),
  })

// «IVA» llena la celda «IVA %»: en la tabla de la hoja, cada cifra es un botón «Usar …».
const LLENA_POR = new Map([
  [
    'iva',
    {
      nodo: 'iva',
      celda: 'iva',
      lado: 'principal' as const,
      etiqueta: 'IVA %',
      formato: 'pct' as const,
    },
  ],
])

function montar(alPublicada: PropsDeLaEdicionDeLaTabla['alPublicada'] = () => 'tabla') {
  render(
    <EdicionDeLaTablaEnLaAyuda
      tabla={{ id: TABLA_ID, nombre: 'IVA por tipo' }}
      rotulo="IVA %"
      base={{
        tabla: {
          clave: 'iva',
          nombre: 'IVA por tipo',
          columnas: COLUMNAS,
          filas: FILAS,
          hayMas: false,
        },
        columnas: COLUMNAS,
        dinero: null,
        llenaPor: LLENA_POR,
        alElegir: vi.fn(),
      }}
      enLaConfiguracion={<a href="/configuracion">Editar en la configuración</a>}
      quieta={null}
      alPublicada={alPublicada}
    />,
  )
}

const pedido = () =>
  ejecutar.mock.calls[0]?.[0] as {
    tablaId: string
    filas: Record<string, unknown>[]
    nota: string
    versionEsperada: number
  }

beforeEach(() => {
  leer.mockReset()
  ejecutar.mockReset()
  avisarExito.mockReset()
})
afterEach(cleanup)

describe('editar la tabla desde la ayuda', () => {
  it('✎ lee la tabla viva y abre la fila; «Guardar» publica la tabla entera con la versión, la nota de la celda y lo tipeado', async () => {
    leer.mockResolvedValue(leida())
    ejecutar.mockResolvedValue({ data: ok({ version: 8, formulas: [] }) })
    const alPublicada = vi.fn<PropsDeLaEdicionDeLaTabla['alPublicada']>(() => 'tabla')
    montar(alPublicada)
    fireEvent.click(screen.getByRole('button', { name: 'Editar la fila 2' }))
    const campo = await screen.findByRole('textbox', { name: 'IVA, fila 2' })
    expect(leer).toHaveBeenCalledWith(TABLA_ID)
    expect(screen.getByText('Sin cambios.')).toBeInTheDocument()
    fireEvent.change(campo, { target: { value: '0,25' } })
    expect(screen.getByText('Cambios sin guardar.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(alPublicada).toHaveBeenCalledWith({ version: 8, formulas: [] })
    })
    expect(pedido()).toMatchObject({
      tablaId: TABLA_ID,
      versionEsperada: 7,
      nota: 'Desde la ayuda de «IVA %».',
      filas: [
        { tipo: 'Sedán', iva: 0.1494, nota: 'x' },
        { tipo: 'Camioneta', iva: 0.25, nota: 'x' },
      ],
    })
    expect(avisarExito).toHaveBeenCalledWith('Tabla publicada (versión 8).')
    // Publicada, vuelve a la de la hoja: sin campos ni barra.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('🗑 tacha la fila hasta guardar y no la publica; «Volver» la devuelve', async () => {
    leer.mockResolvedValue(leida())
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la fila 1' }))
    const volver = await screen.findByRole('button', { name: 'Volver la fila 1' })
    expect(volver.closest('tr')).toHaveAttribute('data-quitada')
    expect(screen.getByText('Cambios sin guardar.')).toBeInTheDocument()
    fireEvent.click(volver)
    // Sin nada editado, vuelve la tabla de la hoja: sin barra y con las cifras que llenan la celda.
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Usar .* en IVA %$/ })).toHaveLength(2)
  })

  it('✎ y «Cancelar» sin cambios vuelven a la tabla de la hoja, con los botones que llenan la celda', async () => {
    leer.mockResolvedValue(leida())
    montar()
    expect(screen.getAllByRole('button', { name: /^Usar .* en IVA %$/ })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Editar la fila 2' }))
    await screen.findByRole('textbox', { name: 'IVA, fila 2' })
    // Mientras se edita, lo que se ve es lo que se publica: sin botones que llenan.
    expect(screen.queryByRole('button', { name: /^Usar / })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Sin cambios.')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Usar .* en IVA %$/ })).toHaveLength(2)
  })
})

describe('editar la tabla desde la ayuda: lo que no sale', () => {
  it('lo que no se lee se dice en su campo y apaga «Guardar»', async () => {
    leer.mockResolvedValue(leida())
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Editar la fila 1' }))
    const campo = await screen.findByRole('textbox', { name: 'IVA, fila 1' })
    fireEvent.change(campo, { target: { value: 'mucho' } })
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Corrige la celda marcada para guardar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('«+ Añadir fila» suma una vacía al final, abierta; «Cancelar» la saca', async () => {
    leer.mockResolvedValue(leida())
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir fila' }))
    const campo = await screen.findByRole('textbox', { name: 'Tipo, fila 3' })
    // El foco lo pone un efecto tras montar el campo: con la máquina cargada llega después de que el campo aparece.
    await waitFor(() => {
      expect(campo).toHaveFocus()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('otra persona publicó antes (PT409): el conflicto con «Recargar» y «Guardar» apagado', async () => {
    leer.mockResolvedValue(leida())
    ejecutar.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'conflicto', mensaje: 'Rosa publicó la versión 8 hace 1 min.' },
      },
    })
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la fila 2' }))
    await screen.findByRole('button', { name: 'Volver la fila 2' })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Rosa publicó la versión 8 hace 1 min.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    await waitFor(() => {
      expect(leer).toHaveBeenCalledTimes(2)
    })
  })

  it('una tabla que no se puede editar aquí lleva a la configuración', async () => {
    leer.mockResolvedValue(fallo('regla', 'La tabla tiene más de 2.000 filas.'))
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Editar la fila 1' }))
    expect(await screen.findByText('Esta tabla se edita en la configuración.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar en la configuración' })).toBeInTheDocument()
  })

  it('si la hoja pasa a la versión nueva, la espera; la tabla que cambió desde que se abrió la hoja se avisa', async () => {
    leer.mockResolvedValue(
      leida([
        { tipo: 'Sedán', iva: 0.15 },
        { tipo: 'Camioneta', iva: 0.2 },
      ]),
    )
    ejecutar.mockResolvedValue({ data: ok({ version: 8, formulas: [{ origenId: ORIGEN_ID }] }) })
    montar(() => 'hoja')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la fila 1' }))
    expect(
      await screen.findByText(
        'La tabla cambió desde que abriste la hoja: estás editando la de hoy.',
      ),
    ).toBeInTheDocument()
    // Con la tabla cambiada, lo pedido sobre la fila de la hoja no se hace: sólo se abre.
    expect(screen.getByText('Sin cambios.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la fila 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(
      await screen.findByText('Poniendo la hoja al día con la tabla nueva…'),
    ).toBeInTheDocument()
  })
})
