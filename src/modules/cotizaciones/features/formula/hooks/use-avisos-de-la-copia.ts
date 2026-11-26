'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  avisosGuardados,
  claveDeLosAvisos,
  textosDeLosAvisos,
  type TextoDeUnAviso,
} from '../../../entities/avisos-de-la-copia'

// Quien oye `ocultar()`: el único cambio de esa clave mientras la planilla está abierta.
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function leer(clave: string): string | null {
  try {
    return window.sessionStorage.getItem(clave)
  } catch {
    // Sin `sessionStorage` (modo privado estricto): sin avisos.
    return null
  }
}

function ocultar(clave: string) {
  try {
    window.sessionStorage.removeItem(clave)
  } catch {
    // Sin `sessionStorage`: no había nada guardado.
  }
  for (const oyente of oyentes) oyente()
}

export type AvisosDeLaCopia = { textos: readonly TextoDeUnAviso[]; ocultar: () => void }

// Los avisos de la copia (docs/GLOSARIO.md) de una fórmula recién copiada de otro origen: los guardó «Nueva fórmula» en `sessionStorage` (`claveDeLosAvisos(id)`)
// y se leen con `useSyncExternalStore` (al hidratar, ninguno: el servidor no tiene `sessionStorage`). Siguen ahí al recargar la pestaña; `ocultar()` los borra y
// lo oyen todos los que los leen (la marca del botón ⓘ y el modal «Información de la fórmula»).
export function useAvisosDeLaCopia(formulaDelOrigenId: string): AvisosDeLaCopia {
  const clave = claveDeLosAvisos(formulaDelOrigenId)
  const guardado = useSyncExternalStore(
    suscribir,
    () => leer(clave),
    () => null,
  )
  const textos = useMemo(() => textosDeLosAvisos(avisosGuardados(guardado)), [guardado])
  return {
    textos,
    ocultar: () => {
      ocultar(clave)
    },
  }
}
