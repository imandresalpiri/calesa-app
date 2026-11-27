'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DEL_ROL,
  PANEL_DEL_ROL,
  PANEL_ROL_POR_DEFECTO,
  type AjustesDeUnRol,
} from '../../../entities/live-configuracion'
import { useElegidoPorUrl } from './use-elegido-por-url'

const NO_ESTA = 'Ese rol ya no está en la lista.'

// Los dos paneles de un rol, con su URL: el modal (`?panel=rol&rol=<id>`) y la confirmación de «Volver a lo por defecto»
// (`?panel=rol-por-defecto&rol=<id>`), que no abre con un rol que ya está «Por defecto».
export function usePanelesDeLosRoles(roles: readonly AjustesDeUnRol[]) {
  const buscar = (id: string) => roles.find((fila) => fila.rol.id === id) ?? null
  const editar = useElegidoPorUrl(
    usePanelPorUrl(PANEL_DEL_ROL, [CLAVE_DEL_ROL]),
    CLAVE_DEL_ROL,
    buscar,
    (fila) => (fila === null ? NO_ESTA : null),
  )
  const porDefecto = useElegidoPorUrl(
    usePanelPorUrl(PANEL_ROL_POR_DEFECTO, [CLAVE_DEL_ROL]),
    CLAVE_DEL_ROL,
    buscar,
    (fila) => {
      if (fila === null) return NO_ESTA
      return fila.ajustes === null ? 'Ese rol ya tiene los ajustes por defecto.' : null
    },
  )
  return { editar, porDefecto }
}
