'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'

type Props = { abierto: boolean; alCerrar: () => void; children: ReactNode }

// El panel de la guía en una pantalla angosta: un cajón a la derecha (`?panel=lateral`). Es sólo el marco: lo escrito vive en la página, que guarda su
// borrador y pregunta al salir; cerrar el cajón no descarta nada.
export function PanelEnDrawer({ abierto, alCerrar, children }: Props) {
  return (
    <Drawer lado="right" abierto={abierto} alCerrar={alCerrar} titulo="Panel de la guía">
      <div data-panel-de-la-guia>{children}</div>
    </Drawer>
  )
}
