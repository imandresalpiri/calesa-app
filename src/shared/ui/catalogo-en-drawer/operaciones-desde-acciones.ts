import type { DestinoAlQuitar, ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { enviarAccion, type ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { OperacionesDelCatalogo } from './tipos'

// Lo que responde una Server Action del catálogo (`executeAsync` de su `useAction`).
type Respuesta = Promise<{ data?: ResultadoDeAccion<unknown>; serverError?: ErrorApp } | undefined>

export type AccionesDelCatalogo = {
  agregar: (nombre: string) => Respuesta
  // Renombrar y activar van por la misma: sólo lo que cambia, con la versión que vio.
  guardar: (
    elemento: ElementoDeCatalogo,
    cambios: { nombre?: string; activo?: boolean },
  ) => Respuesta
  mover: (elemento: ElementoDeCatalogo, despuesDe: string | null) => Respuesta
  quitar: (elemento: ElementoDeCatalogo, destino: DestinoAlQuitar) => Respuesta
  enCurso: boolean
}

// Las operaciones del drawer a partir de las actions de un módulo: cada envío pasa por `enviarAccion()` (sin red, se dice y se conserva
// lo escrito). `revisa` es lo que se dice si la entrada no pasó el esquema de la action.
export function operacionesDesdeAcciones(
  acciones: AccionesDelCatalogo,
  revisa: string,
): OperacionesDelCatalogo {
  return {
    agregar: (nombre) => enviarAccion(acciones.agregar(nombre), revisa),
    renombrar: (elemento, nombre) => enviarAccion(acciones.guardar(elemento, { nombre }), revisa),
    activar: (elemento, activo) => enviarAccion(acciones.guardar(elemento, { activo }), revisa),
    mover: (elemento, despuesDe) => enviarAccion(acciones.mover(elemento, despuesDe), revisa),
    quitar: (elemento, destino) => enviarAccion(acciones.quitar(elemento, destino), revisa),
    enCurso: acciones.enCurso,
  }
}
