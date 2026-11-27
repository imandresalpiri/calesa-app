'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_LA_PERSONA,
  PANEL_DE_LA_PERSONA,
  PANEL_PERSONA_A_SU_ROL,
  type PersonaDelLive,
} from '../../../entities/live-configuracion'
import { useElegidoPorUrl } from './use-elegido-por-url'

const NO_ESTA = 'Esa persona no está en la lista: búscala por su nombre.'

// Los dos paneles de una persona de la lista, con su URL: el modal (`?panel=persona&persona=<id>`) y la confirmación de «Volver a lo de su rol»
// (`?panel=persona-a-su-rol&persona=<id>`), que no abre sin lo propio. Sólo las de la lista leída (con «Ver más» o la búsqueda de `?q=`).
export function usePanelesDeLasPersonas(personas: readonly PersonaDelLive[]) {
  const buscar = (id: string) => personas.find((persona) => persona.id === id) ?? null
  const editar = useElegidoPorUrl(
    usePanelPorUrl(PANEL_DE_LA_PERSONA, [CLAVE_DE_LA_PERSONA]),
    CLAVE_DE_LA_PERSONA,
    buscar,
    (persona) => (persona === null ? NO_ESTA : null),
  )
  const aSuRol = useElegidoPorUrl(
    usePanelPorUrl(PANEL_PERSONA_A_SU_ROL, [CLAVE_DE_LA_PERSONA]),
    CLAVE_DE_LA_PERSONA,
    buscar,
    (persona) => {
      if (persona === null) return NO_ESTA
      return persona.ajustes === null ? 'Esa persona ya sigue lo de su rol.' : null
    },
  )
  return { editar, aSuRol }
}
