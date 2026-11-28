'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { PlantillaDeArte } from '../../../entities/tipos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La que se elimina (la última que se vio, mientras el diálogo se va).
  plantilla: PlantillaDeArte | null
  enCurso: boolean
  alEliminar: (plantilla: PlantillaDeArte) => Promise<void>
}

// «Eliminar» una plantilla de arte (`?panel=eliminar&plantilla=<id>`): lo irreversible pide confirmar nombrándola. Las imágenes que usa no se
// tocan: siguen en la biblioteca.
export function ConfirmarEliminarPlantilla({
  abierto,
  alCerrar,
  plantilla,
  enCurso,
  alEliminar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (plantilla) {
          await alEliminar(plantilla)
        }
        alCerrar()
      }}
      titulo={plantilla ? `Eliminar «${plantilla.nombre}»` : 'Eliminar la plantilla de arte'}
      descripcion="No se puede deshacer. Las imágenes que usa quedan en la biblioteca."
      etiquetaConfirmar="Eliminar"
      enCurso={enCurso}
      focoAlCerrar={() => false}
    />
  )
}
