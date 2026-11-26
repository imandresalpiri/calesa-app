'use client'

import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import { useParametrosDeAgenda } from '../hooks/use-parametros-de-agenda'

// «Ir a una fecha» de la agenda, a la vista en la barra (como en `/actividad`): el selector de un día, hacia atrás o hacia adelante, sin tope.
// Ir escribe `?fecha=` y conserva la vista.
export function IrAUnaFechaDeLaAgenda({ zona }: { zona: string }) {
  const [, poner] = useParametrosDeAgenda()
  return (
    <IrAUnaFecha
      zona={zona}
      max={null}
      ocupado={false}
      alIr={(dia) => {
        void poner({ fecha: dia })
      }}
    />
  )
}
