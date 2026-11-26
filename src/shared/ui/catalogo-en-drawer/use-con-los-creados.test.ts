import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { fallo, ok } from '@/shared/lib/errores'
import type { OperacionesDelCatalogo } from './tipos'
import { useConLosCreados } from './use-con-los-creados'

const elemento = (id: string, nombre: string): ElementoDeCatalogo => ({
  id,
  nombre,
  orden: 10,
  activo: true,
  actualizadoEn: 'v1',
})

const DATOS = elemento('g1', 'Datos')
const MEDIDAS = elemento('g2', 'Medidas')

const listo = () => Promise.resolve(ok(null))
const operaciones = (): OperacionesDelCatalogo => ({
  agregar: vi.fn(listo),
  renombrar: vi.fn(listo),
  activar: vi.fn(listo),
  mover: vi.fn(listo),
  quitar: vi.fn(listo),
  enCurso: false,
})

afterEach(cleanup)

describe('useConLosCreados', () => {
  it('suma lo creado desde el combo a lo leído y no lo que se rechazó', async () => {
    const { result } = renderHook(() => useConLosCreados([DATOS]))
    await act(async () => {
      await result.current.conCrear(() => Promise.resolve(ok(MEDIDAS)))('Medidas')
      await result.current.conCrear(() =>
        Promise.resolve(fallo('duplicado', 'Ya existe «Datos».')),
      )('datos')
    })
    expect(result.current.lista).toEqual([DATOS, MEDIDAS])
  })

  it('cuando la lectura lo trae, gana lo leído (un renombre ya revalidado)', async () => {
    const { result, rerender } = renderHook(({ lista }) => useConLosCreados(lista), {
      initialProps: { lista: [DATOS] },
    })
    await act(async () => {
      await result.current.conCrear(() => Promise.resolve(ok(MEDIDAS)))('Medidas')
    })
    const renombrado = { ...MEDIDAS, nombre: 'Medidas finales', actualizadoEn: 'v2' }
    rerender({ lista: [DATOS, renombrado] })
    expect(result.current.lista).toEqual([DATOS, renombrado])
  })

  it('lo que el drawer quita sale de la lista; si quitar falla, queda', async () => {
    const { result } = renderHook(() => useConLosCreados([DATOS]))
    await act(async () => {
      await result.current.conCrear(() => Promise.resolve(ok(MEDIDAS)))('Medidas')
    })
    const fallida = {
      ...operaciones(),
      quitar: vi.fn(() => Promise.resolve(fallo('conflicto', 'Otra persona…'))),
    }
    await act(async () => {
      await result.current.conQuitar(fallida).quitar(MEDIDAS, { mover: false })
    })
    expect(result.current.lista).toEqual([DATOS, MEDIDAS])
    await act(async () => {
      await result.current.conQuitar(operaciones()).quitar(MEDIDAS, { mover: false })
    })
    expect(result.current.lista).toEqual([DATOS])
  })
})
