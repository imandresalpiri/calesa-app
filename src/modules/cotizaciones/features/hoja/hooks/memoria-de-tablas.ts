import { memoriaDeLectura, type MemoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { leerTablaDeAyuda } from '../../../composicion.client'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import type { TablaDeAyuda } from '../../../entities/tabla-de-ayuda'

// Una tabla de referencia leída desde la hoja (la de una ayuda o las opciones de un dato del vehículo) vale 5 minutos con la misma hoja abierta, o la misma cotización: volver
// a abrir la ayuda o el panel no la lee de nuevo. Otra hoja abierta (guardar un dato del vehículo, una versión nueva) es otra clave y se lee otra vez.
const VIDA_MS = 5 * 60 * 1000
const memorias = new Map<string, MemoriaDeLectura<TablaDeAyuda>>()

export const claveDeLaTabla = (de: DeDondeCalcula, tabla: string): string =>
  de.tipo === 'guardada'
    ? `cotizacion\u0000${de.cotizacionId}\u0000${tabla}`
    : `abierta\u0000${de.abierta}\u0000${tabla}`

export function memoriaDeLaTabla(
  de: DeDondeCalcula,
  tabla: string,
): MemoriaDeLectura<TablaDeAyuda> {
  const clave = claveDeLaTabla(de, tabla)
  let memoria = memorias.get(clave)
  if (!memoria) {
    memoria = memoriaDeLectura(() => leerTablaDeAyuda({ tabla, de }), VIDA_MS)
    memorias.set(clave, memoria)
  }
  return memoria
}
