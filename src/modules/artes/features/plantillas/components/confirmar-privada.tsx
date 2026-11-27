'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { PlantillaDeArte } from '../../../entities/tipos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  plantilla: PlantillaDeArte | null
  enCurso: boolean
  alHacerlaPrivada: (plantilla: PlantillaDeArte) => Promise<boolean>
}

// «Hacerla privada» la de otra persona (`?panel=privada&plantilla=<id>`): quien la cambia deja de verla, por eso se confirma (la propia va
// directo, con «Deshacer»).
export function ConfirmarHacerlaPrivada({
  abierto,
  alCerrar,
  plantilla,
  enCurso,
  alHacerlaPrivada,
}: Props) {
  const autor = plantilla?.autorNombre ?? 'su autor'
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (plantilla) {
          await alHacerlaPrivada(plantilla)
        }
        alCerrar()
      }}
      titulo={
        plantilla ? `Hacer privada «${plantilla.nombre}»` : 'Hacer privada la plantilla de arte'
      }
      descripcion={`Dejará de verse en el equipo; sólo ${autor} la verá.`}
      etiquetaConfirmar="Hacerla privada"
      enCurso={enCurso}
      focoAlCerrar={() => false}
    />
  )
}
