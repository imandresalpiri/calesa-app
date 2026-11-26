'use client'

import { borradorAtrasado, type LecturaDeLaFormula } from '../../../entities/formula/versiones'
import { marcaDeLaInformacion } from '../../../entities/informacion-de-la-formula'
import type { AvisosDeLaCopia } from '../hooks/use-avisos-de-la-copia'
import { BotonDeLaInformacion } from './informacion'
import { PublicarDelBorrador } from './publicar-del-borrador'

type Props = {
  origen: string
  formula: LecturaDeLaFormula
  avisos: AvisosDeLaCopia
  alPublicar: () => void
  // Hay cambios aplicados sin guardar: «Publicar…» espera.
  espera: boolean
}

// El ⓘ «Información de la fórmula» (con su marca si algo bloquea) y, con el borrador al día, «Publicar…». En la barra suben a ella por un portal y esta fila
// queda vacía (`empty:hidden`); en la puesta en marcha, van aquí, arriba de la planilla.
export function AccionesDeLaVersion({ origen, formula, avisos, alPublicar, espera }: Props) {
  const atrasado =
    formula.borrador !== null && borradorAtrasado(formula.borrador, formula.publicada)
  const marca = marcaDeLaInformacion({
    conPublicada: formula.publicada !== null,
    atrasado,
    conAvisos: avisos.textos.length > 0,
    origen,
  })
  return (
    <div className="flex flex-wrap items-center gap-2 empty:hidden">
      <BotonDeLaInformacion marca={marca} />
      {formula.borrador && !atrasado ? (
        <PublicarDelBorrador alPublicar={alPublicar} espera={espera} />
      ) : null}
    </div>
  )
}
