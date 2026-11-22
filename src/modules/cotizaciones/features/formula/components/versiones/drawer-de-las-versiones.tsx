'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DE_LAS_VERSIONES } from './panel'

// El drawer «Versiones» de la pestaña Planilla (`?panel=versiones`): la lista de versiones de la fórmula elegida, con «Revertir» en cada archivada. Lo abre el
// botón «Versiones» de la barra de la fórmula; «Revertir» abre su confirmación (que ocupa `?panel=`) y el drawer se va.
export function DrawerDeLasVersiones({ children }: { children: ReactNode }) {
  const panel = usePanelPorUrl(PANEL_DE_LAS_VERSIONES)
  return (
    <Drawer
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo="Versiones"
      descripcion="Las publicadas de esta fórmula, de la más nueva a la más vieja."
    >
      {children}
    </Drawer>
  )
}
