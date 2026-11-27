'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { GrupoDeAyuda } from '@/shared/lib/atajos'

// Lo que las pantallas suman a la lista de «?» mientras están montadas (`useAyudaDePantalla()`): un grupo por pantalla, con su título. Es un registro del
// navegador, no del árbol: la lista (`<ListaDeAtajos>`, por `diferido()`) lo lee al abrirse y lo sigue si cambia.
let grupos: readonly GrupoDeAyuda[] = []
const oyentes = new Set<() => void>()

function avisar() {
  oyentes.forEach((oyente) => {
    oyente()
  })
}

function registrar(grupo: GrupoDeAyuda): () => void {
  grupos = [...grupos, grupo]
  avisar()
  return () => {
    grupos = grupos.filter((otro) => otro !== grupo)
    avisar()
  }
}

// Suma `grupo` a la lista de «?» mientras el componente está montado. `grupo` debe ser estable (una constante o un `useMemo`).
export function useAyudaDePantalla(grupo: GrupoDeAyuda): void {
  useEffect(() => registrar(grupo), [grupo])
}

const SIN_GRUPOS: readonly GrupoDeAyuda[] = []

// Los grupos de las pantallas montadas, en el orden en que se montaron.
export function useGruposDeAyuda(): readonly GrupoDeAyuda[] {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
    () => grupos,
    () => SIN_GRUPOS,
  )
}
