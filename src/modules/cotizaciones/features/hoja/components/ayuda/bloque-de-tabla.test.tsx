import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import type { ContextoDeHoja } from '../../../../entities/binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from '../../../../entities/entradas'
import type { TablaDeAyuda } from '../../../../entities/tabla-de-ayuda'
import type { PropsDeLaEdicionDeLaTabla } from '../huecos'
import { BloqueDeTabla, type BloqueDeTablaEnLaHoja } from './bloque-de-tabla'
import { ContextoDeLaEdicionDeLaTabla } from './hueco-de-la-edicion'

const { leerTablaDeAyuda, refresh } = vi.hoisted(() => ({
  leerTablaDeAyuda: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('../../../../composicion.client', () => ({ leerTablaDeAyuda }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const ORIGEN = '00000000-0000-4000-8000-0000000000bb'
const TABLA_ID = '00000000-0000-4000-8000-0000000000aa'
const TABLA: TablaDeAyuda = {
  clave: 'impuestos',
  nombre: 'Impuestos por tipo',
  columnas: [{ clave: 'iva', etiqueta: 'IVA', tipo: 'numero' }],
  filas: [{ iva: 0.12 }],
  hayMas: false,
}
const CONTEXTO: ContextoDeHoja = {
  indice: indiceDeHoja([]),
  entradas: ENTRADAS_VACIAS,
  respuesta: null,
  origenId: ORIGEN,
}
const bloque = (id: string | null): BloqueDeTablaEnLaHoja => ({
  tipo: 'tabla',
  tabla: 'impuestos',
  columnas: null,
  resaltar: false,
  casa: null,
  id,
})

// El hueco de prueba: dice qué recibió y publica con las fórmulas que se le piden.
function EdicionDePrueba({ tabla, rotulo, alPublicada }: PropsDeLaEdicionDeLaTabla) {
  return (
    <div>
      <p>
        Editando {tabla.nombre} desde {rotulo}
      </p>
      <button
        type="button"
        onClick={() => {
          alPublicada({ version: 2, formulas: [{ origenId: ORIGEN }] })
        }}
      >
        Publicar con este origen
      </button>
      <button
        type="button"
        onClick={() => {
          alPublicada({ version: 2, formulas: [] })
        }}
      >
        Publicar sin este origen
      </button>
    </div>
  )
}

let vuelta = 0
const montar = (id: string | null, { conHueco }: { conHueco: boolean }) => {
  const lectura = {
    tipo: 'abierta' as const,
    origenId: ORIGEN,
    abierta: `a.${String(vuelta)}`,
    vehiculoId: null,
  }
  const contenido = (
    <BloqueDeTabla
      bloque={bloque(id)}
      lectura={lectura}
      dinero={null}
      contexto={CONTEXTO}
      rotulo="IVA %"
      alElegir={undefined}
    />
  )
  render(
    conHueco ? (
      <ContextoDeLaEdicionDeLaTabla value={EdicionDePrueba}>
        {contenido}
      </ContextoDeLaEdicionDeLaTabla>
    ) : (
      contenido
    ),
  )
}

beforeEach(() => {
  vuelta += 1
  leerTablaDeAyuda.mockReset()
  leerTablaDeAyuda.mockResolvedValue({ ok: true, data: TABLA })
  refresh.mockReset()
})
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

describe('BloqueDeTabla: la edición desde la ayuda', () => {
  it('con el hueco y el id de la tabla viva, la edita ahí mismo con el rótulo de la celda', async () => {
    montar(TABLA_ID, { conHueco: true })
    expect(await screen.findByText('Editando Impuestos por tipo desde IVA %')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar en la configuración' })).toBeNull()
  })

  it('publicada con una versión nueva para este origen, la página se vuelve a pedir; si no, la tabla se lee otra vez', async () => {
    montar(TABLA_ID, { conHueco: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar con este origen' }))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(leerTablaDeAyuda).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar sin este origen' }))
    await waitFor(() => {
      expect(leerTablaDeAyuda).toHaveBeenCalledTimes(2)
    })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('sin el hueco (una guardada), a quien configura sólo el camino a la configuración', async () => {
    montar(TABLA_ID, { conHueco: false })
    const enlace = await screen.findByRole('link', { name: 'Editar en la configuración' })
    expect(enlace).toHaveAttribute(
      'href',
      `/configuracion/origenes/${ORIGEN}/planilla?panel=tablas&tabla=${TABLA_ID}`,
    )
  })

  it('con el Modo Live se edita igual ahí mismo: los números se ven', async () => {
    document.documentElement.classList.add(CLASE_LIVE)
    montar(TABLA_ID, { conHueco: true })
    expect(await screen.findByText('Editando Impuestos por tipo desde IVA %')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar en la configuración' })).toBeNull()
  })

  it('sin el id (quien no configura), ni edición ni enlace', async () => {
    montar(null, { conHueco: true })
    expect(
      await screen.findByRole('region', { name: 'Tabla Impuestos por tipo' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Editando/)).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
