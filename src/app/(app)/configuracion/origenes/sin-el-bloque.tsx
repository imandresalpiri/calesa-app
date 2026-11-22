'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { MOTIVO_SIN_EL_BLOQUE, PANELES_PARA_TODOS } from './paneles-para-todos'

// Sin `cotizaciones.configurar` en ningún origen el bloque «Para todos los orígenes» no se dibuja, y un `?panel=colores` o `?panel=vigencia` escrito a mano no abre nada:
// se avisa y la URL se limpia (`useRevisionAlAbrir()`, como las tarjetas de ajustes). No dibuja nada.
export function SinElBloque() {
  const [panel, ponerPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const ajeno = panel !== null && (PANELES_PARA_TODOS as readonly string[]).includes(panel)
  useRevisionAlAbrir(ajeno ? panel : null, MOTIVO_SIN_EL_BLOQUE, () => {
    void ponerPanel(null)
  })
  return null
}
