'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { QUE_ES_EL_CONTENEDOR } from '../../../entities/transporte/textos'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'

// El drawer de un contenedor (`?contenedor=<uuid>`) sobre la lista de Embarques o sobre la página de su embarque. Es el marco: lo de adentro (`<CuerpoDelContenedor>`, leído en el
// servidor) llega de la página como hijo. Cerrar quita el contenedor y el panel que hubiera encima, y vuelve a pedir la página (`shallow: false`). Sólo muestra: no guarda nada
// tipeado (sus formularios son modales que preguntan por sí solos), así que cerrar no pregunta.
export function DrawerDelContenedor({ children }: { children: ReactNode }) {
  const paneles = usePanelDeEmbarques()
  return (
    <Drawer
      abierto={paneles.contenedor !== null}
      alCerrar={() => paneles.cerrar({ conContenedor: false })}
      titulo="Contenedor"
      descripcion={QUE_ES_EL_CONTENEDOR}
      ancho="amplio"
    >
      {children}
    </Drawer>
  )
}
