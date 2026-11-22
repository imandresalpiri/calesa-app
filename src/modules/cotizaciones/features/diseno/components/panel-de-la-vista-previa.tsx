'use client'

import type { Tono } from '@/shared/ui/xcell'
import type { Diseno } from '../../../entities/diseno'
import type { DisenoParaEditar } from '../../../entities/diseno/edicion-del-diseno'
import type { VistaPreviaDelDiseno } from '../hooks/use-vista-previa-del-diseno'
import { ControlesDeLaVistaPrevia } from './controles-de-la-vista-previa'
import { VistaPreviaDelDisenoDiferido } from './diferidos'

type Props = {
  origen: { id: string; nombre: string }
  trabajo: Diseno
  leida: DisenoParaEditar
  tonos: readonly Tono[]
  // `?vista=`: la abre y la cierra el editor, que decide si va al costado.
  vista: VistaPreviaDelDiseno
}

// «Vista previa» del editor del diseño (4.22-5): los controles y, abierta (`?vista=`), la hoja dibujada con el diseño en edición. Su código se pide al abrirla.
// Abierta y desde `xl`, va al costado del editor, pegada arriba al desplazarse (la columna 2 de la grilla del editor); cerrada, el botón queda en su lugar.
export function PanelDeLaVistaPrevia({ origen, trabajo, leida, tonos, vista }: Props) {
  return (
    <div
      data-columna-de-la-vista-previa
      className={
        vista.abierta
          ? 'grid min-w-0 gap-3 self-start xl:sticky xl:top-4 xl:col-start-2 xl:row-span-5 xl:row-start-1'
          : 'grid min-w-0 gap-3'
      }
    >
      <ControlesDeLaVistaPrevia
        ancho={vista.ancho}
        alAlternar={vista.alternar}
        alElegir={vista.elegir}
      />
      {vista.ancho === null ? null : (
        <VistaPreviaDelDisenoDiferido
          origen={origen}
          trabajo={trabajo}
          leida={leida}
          tonos={tonos}
          ancho={vista.ancho}
        />
      )}
    </div>
  )
}
