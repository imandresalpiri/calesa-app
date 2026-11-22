'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useEffect, useRef } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import {
  AYUDA_EN_BLOQUES,
  AYUDAS_DE_ANTES,
  CLAVE_DE_AYUDA,
  CLAVE_DEL_NODO,
} from './urls-de-la-hoja'

// La ayuda de una celda en la URL (`?ayuda=bloques&nodo=<id>`): recargar la abre y «atrás» la cierra. El nodo es nulo si no hay una abierta; qué celda es y si se dibuja ahora lo
// resuelve quien la muestra (`celdaConAyuda`): la URL no abre lo que la hoja no enseña.
export type AyudaDeLaHoja = {
  nodo: string | null
  cerrar: () => void
  // De dónde leen las tablas de la ayuda: el de la hoja montada, el mismo del recálculo.
  lectura: DeDondeCalcula
}

// Un enlace de antes (`?ayuda=texto` o `?ayuda=tabla`) abre la misma ayuda y la URL pasa a `bloques` sin sumar una entrada al historial.
function useAyudaDeAntes() {
  const [url, escribir] = useQueryStates({
    [CLAVE_DE_AYUDA]: parseAsString,
    [CLAVE_DEL_NODO]: parseAsString,
  })
  const deAntes = AYUDAS_DE_ANTES.has(url[CLAVE_DE_AYUDA] ?? '')
  useEffect(() => {
    if (deAntes) {
      void escribir({ [CLAVE_DE_AYUDA]: AYUDA_EN_BLOQUES }, { history: 'replace' })
    }
  }, [deAntes, escribir])
  return deAntes ? url[CLAVE_DEL_NODO] : null
}

export function useAyudaDeLaHoja(lectura: DeDondeCalcula) {
  const panel = usePanelPorUrl(AYUDA_EN_BLOQUES, [CLAVE_DEL_NODO], { clave: CLAVE_DE_AYUDA })
  const deAntes = useAyudaDeAntes()
  // El callback que reciben todas las celdas es uno solo y no cambia (la `XCell` está en `memo`): abre con la última función de la URL.
  const abrir = useRef(panel.abrir)
  useEffect(() => {
    abrir.current = panel.abrir
  })
  const alAyudar = useCallback((nodo: string) => {
    abrir.current({ [CLAVE_DEL_NODO]: nodo })
  }, [])
  const ayuda: AyudaDeLaHoja = {
    nodo: panel.abierto ? panel.valor(CLAVE_DEL_NODO) : deAntes,
    cerrar: panel.cerrar,
    lectura,
  }
  return { ayuda, alAyudar }
}
