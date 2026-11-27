import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { GrupoDeAyuda } from '@/shared/lib/atajos'
import { useAyudaDePantalla, useGruposDeAyuda } from './ayuda-de-pantalla'

afterEach(cleanup)

const GRUPO: GrupoDeAyuda = {
  titulo: 'Editor',
  atajos: [{ combinacion: 'alt+m', descripcion: 'Combinar' }],
}

function Pantalla() {
  useAyudaDePantalla(GRUPO)
  return null
}

describe('ayuda de pantalla', () => {
  it('suma su grupo a la lista mientras la pantalla está montada y lo quita al irse', () => {
    const { result } = renderHook(() => useGruposDeAyuda())
    expect(result.current).toEqual([])
    let montada!: ReturnType<typeof render>
    act(() => {
      montada = render(<Pantalla />)
    })
    expect(result.current).toEqual([GRUPO])
    act(() => {
      montada.unmount()
    })
    expect(result.current).toEqual([])
  })
})
