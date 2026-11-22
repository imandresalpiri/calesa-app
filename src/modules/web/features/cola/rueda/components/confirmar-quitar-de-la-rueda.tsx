'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import { configuracionDe } from '../../../../entities/cola/rueda'
import type { FilaDelTablero } from '../../../../entities/cola/tablero'
import { useQuitarDeLaRueda } from '../hooks/use-quitar-de-la-rueda'

export type PropsDeConfirmarQuitarDeLaRueda = {
  abierto: boolean
  alCerrar: () => void
  // Quien se quita (la última que se vio, mientras el diálogo se va).
  fila: FilaDelTablero | null
}

// «Quitar de la rueda» (`?panel=quitar-de-la-rueda&para=<usuarioId>`): confirma nombrando a la persona. Es reversible: al confirmar se hace en el acto y el
// aviso ofrece «Deshacer» (vuelve a habilitarla con los mismos valores). Si no pudo quitarla, el diálogo sigue abierto con el motivo en el aviso.
export function ConfirmarQuitarDeLaRueda({
  abierto,
  alCerrar,
  fila,
}: PropsDeConfirmarQuitarDeLaRueda) {
  const { quitar, enCurso } = useQuitarDeLaRueda()
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (fila && (await quitar(configuracionDe(fila), fila.nombre))) {
          alCerrar()
        }
      }}
      titulo={fila ? `Quitar a ${fila.nombre} de la rueda` : 'Quitar de la rueda'}
      descripcion="Deja de recibir turnos de la web. Se puede deshacer al momento."
      etiquetaConfirmar="Quitar de la rueda"
      enCurso={enCurso}
    />
  )
}
