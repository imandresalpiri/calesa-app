'use client'

import { Drawer } from '@/shared/ui/drawer'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import type { OrigenConUso } from '../../../../entities/origen'
import { DatosEnElDrawerDiferido } from '../diferidos'
import { usePanelDeDatos } from './use-panel-de-datos'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

// El drawer «Datos» de la página de un origen (`?panel=datos`): va siempre montado (así se desliza) y lo de adentro, con su código, se pide al abrirse por
// primera vez. Cada apertura empieza desde lo guardado; mientras está abierto, refrescar la página no borra lo tipeado.
export function DrawerDeDatos({ origen, puedeGestionar }: Props) {
  const panel = usePanelDeDatos()
  const apertura = useApertura(panel.abierto)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <Drawer abierto={panel.abierto} alCerrar={panel.cerrar} titulo="Datos del origen">
      {montar ? (
        <DatosEnElDrawerDiferido
          key={apertura}
          origen={origen}
          puedeGestionar={puedeGestionar}
          alCerrar={panel.cerrar}
        />
      ) : null}
    </Drawer>
  )
}
