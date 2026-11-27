// Lo que quien mira puede hacer desde el «⋯» de las tarjetas de una unidad de vehículo, resuelto en el servidor con `puede()` en el origen de la unidad: los resúmenes
// reciben booleanos, nunca los permisos (que no viajan al navegador). Ver una tarjeta no se pregunta aquí: si se dibuja, ya pasó por los permisos y la regla de sus
// huecos (`huecosVisibles`). Cada área arma sus acciones en su resumen (`entities/<área>/resumen.ts`). Escribir una nota sólo pide ver la unidad (`logistica.ver`, como `crearNota`). Puro, sin I/O.
import { puede, type Permisos } from '@/shared/lib/permisos'

export type CapacidadesDeLaTarjeta = {
  subirDocumentos: boolean
  editarGastos: boolean
  editarPagos: boolean
  escribirNotas: boolean
}

/** Las capacidades de quien mira en el origen de la unidad. */
export function capacidadesDeLaTarjeta(
  permisos: Permisos,
  origenId: string,
): CapacidadesDeLaTarjeta {
  return {
    subirDocumentos: puede(permisos, 'logistica.documentos.subir', origenId),
    editarGastos: puede(permisos, 'logistica.gastos.editar', origenId),
    editarPagos: puede(permisos, 'logistica.pagos.editar', origenId),
    escribirNotas: puede(permisos, 'logistica.ver', origenId),
  }
}
