'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { panelDelHueco } from '../../../entities/transporte/paneles'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'

type Props = {
  // La clave del hueco del grupo (`documentos`, `gastos`…) y su título.
  clave: string
  titulo: string
  // Lo que dice de quién es («Del contenedor MSCU1234.»).
  descripcion: string
  // El componente del hueco, que compone `src/app` con el grupo.
  children: ReactNode
}

// Un hueco del grupo (subir un documento a sus vehículos, prorratear un gasto, mover el contenedor) en su drawer: `?panel=grupo-<clave>` desde el «⋯» del embarque o del
// contenedor. Cerrarlo vuelve a lo que había debajo (la página o el drawer del contenedor).
export function DrawerDelHueco({ clave, titulo, descripcion, children }: Props) {
  const paneles = usePanelDeEmbarques()
  return (
    <Drawer
      abierto={paneles.panel === panelDelHueco(clave)}
      alCerrar={() => paneles.cerrar()}
      titulo={titulo}
      descripcion={descripcion}
      ancho="amplio"
    >
      {children}
    </Drawer>
  )
}
