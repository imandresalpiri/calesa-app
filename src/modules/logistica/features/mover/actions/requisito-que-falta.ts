import 'server-only'
import { etiquetaDeRequisito, faltaDeRequisito, type RequisitoVista } from '@/modules/flujos'
import type { RequisitoQueFalta } from '../../../entities/mover/accion-de-requisito'

/** Un requisito de `flujos` como lo piden las acciones de «Qué falta» (con su etiqueta y lo que falta, ya escritos). Lo comparten `leerQueFalta` y `leerRequisitosDeLaFase`. */
export function requisitoQueFalta(r: RequisitoVista): RequisitoQueFalta {
  return {
    requisitoId: r.requisitoId,
    tipo: r.tipo,
    cumplido: r.cumplido,
    bloqueante: r.bloqueante,
    detalle: r.detalle,
    etiqueta: etiquetaDeRequisito(r),
    falta: faltaDeRequisito(r),
  }
}
