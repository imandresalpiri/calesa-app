'use client'

import { parseAsString, useQueryState } from 'nuqs'
import {
  CLAVE_DE_PESTANA_DE_FASE,
  PESTANA_INICIAL_DE_FASE,
  pestanaPedida,
  type PestanaDeFase,
} from '../../../entities/fases/bloques-de-fase'

// La pestaña del panel de una fase, en la URL (`?fase=<id>&pestana=identidad|ajustes`): sobrevive a recargar y se puede compartir. Sin ella, o con otro valor, «Reglas»
// (la que se usa más). Elegir otra **reemplaza** la entrada del historial (no suma una: «atrás» cierra el panel, no recorre pestañas) y no pide nada al servidor.
// Abrir otra fase o una sección del flujo la limpia (`CLAVES_DEL_PANEL_DE_FASE`).
export function usePestanaDeFase() {
  const [texto, setTexto] = useQueryState(
    CLAVE_DE_PESTANA_DE_FASE,
    parseAsString.withOptions({ history: 'replace' }),
  )
  return {
    pestana: pestanaPedida(texto),
    elegir: (pestana: PestanaDeFase) => {
      void setTexto(pestana === PESTANA_INICIAL_DE_FASE ? null : pestana)
    },
  }
}
