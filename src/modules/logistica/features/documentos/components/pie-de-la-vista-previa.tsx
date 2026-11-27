'use client'

import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { quePuedeHacer } from '../../../entities/documentos/revision'
import { AccionesDelDocumento } from './acciones-del-documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { InterruptorDelPortal } from './interruptor-del-portal'

type Props = {
  documento: DocumentoDeLaUnidad
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
  rechazarAlAbrir: boolean
}

// El pie de la vista previa: «Aprobar» y «Rechazar» (el motivo se escribe en la misma línea de los botones) y «Visible en el portal», con lo que `quePuedeHacer` apaga y su motivo escrito una sola
// vez. Reserva su alto: el campo del motivo, un conflicto o un aviso no mueven el modal.
export function PieDeLaVistaPrevia({ documento, tipo, contexto, rechazarAlAbrir }: Props) {
  const puede = quePuedeHacer(documento, tipo, contexto.claves)
  const dicho =
    puede.aprobar.tipo === 'apagada'
      ? puede.aprobar.motivo
      : puede.rechazar.tipo === 'apagada'
        ? puede.rechazar.motivo
        : null
  return (
    <div
      className="grid min-h-[12.5rem] w-full content-start gap-2 sm:min-h-[8.5rem]"
      data-pie-de-la-vista-previa
    >
      <AccionesDelDocumento
        documento={documento}
        tipo={tipo}
        contexto={contexto}
        enLinea
        rechazarAlAbrir={rechazarAlAbrir}
      />
      <InterruptorDelPortal
        documento={documento}
        tipo={tipo}
        contexto={contexto}
        motivoYaDicho={dicho}
      />
    </div>
  )
}
