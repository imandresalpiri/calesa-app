'use client'

import { Columns3Icon, SquareDashedMousePointerIcon } from 'lucide-react'
import { panelDeLaSeleccion } from '../../../../../entities/plantilla/paneles-del-editor'
import type { Seleccion } from '../../../../../entities/plantilla/edicion/seleccion'
import type { PanelDeLaTarjeta } from '../../../hooks/use-panel-de-la-tarjeta'
import { BotonDeLaBarra, GrupoDeLaBarra } from './elementos'

type Props = {
  panel: PanelDeLaTarjeta
  seleccion: Seleccion | null
  ocupado: boolean
}

// «Columnas» (anchos, paleta y tamaño) y «Celda» o «Fila» (lo elegido): abren su panel al costado del lienzo, que no se mueve (`?panel=columnas|celda`). Tocar uno abierto
// lo cierra. Enter sobre un dato o el logo abre «Celda» en su «Contenido».
export function GrupoDePaneles({ panel, seleccion, ocupado }: Props) {
  const de = panelDeLaSeleccion(seleccion)
  return (
    <GrupoDeLaBarra nombre="Paneles">
      <BotonDeLaBarra
        titulo="Columnas: anchos, paleta y tamaño"
        motivo={null}
        ocupado={ocupado}
        abre={{ abierto: panel.columnas }}
        alTocar={panel.columnas ? panel.cerrar : panel.abrirColumnas}
      >
        <Columns3Icon aria-hidden className="size-4" />
        Columnas
      </BotonDeLaBarra>
      <BotonDeLaBarra
        titulo={
          de.nombre === 'Fila'
            ? 'Fila: su alto y cuándo se oculta'
            : 'Celda: contenido, color, formato y bordes'
        }
        motivo={de.motivo}
        ocupado={ocupado}
        abre={{ abierto: panel.celda }}
        alTocar={panel.celda ? panel.cerrar : panel.abrirCelda}
      >
        <SquareDashedMousePointerIcon aria-hidden className="size-4" />
        {de.nombre}
      </BotonDeLaBarra>
    </GrupoDeLaBarra>
  )
}
