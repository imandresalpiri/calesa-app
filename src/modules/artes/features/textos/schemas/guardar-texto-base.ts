import { z } from 'zod'

// Lo que cruza el límite al guardar el texto base de un origen. El texto, con holgura sobre el largo de la base (lo normaliza y lo mide la
// action con `validarTextoBase()`, y la RPC otra vez); la versión esperada como el texto que dio la base, nunca por `Date` (nula: la fila no se
// pudo leer).
export const esquemaGuardarTextoBase = z.object({
  origenId: z.guid(),
  texto: z.string().max(4000),
  actualizadoEnEsperado: z.string().min(1).max(64).nullable(),
})

export type PedidoDeGuardarTextoBase = z.infer<typeof esquemaGuardarTextoBase>

// Lo que se dice si la action no aceptó lo que mandó el panel (manda lo que leyó: no debería pasar).
export const MENSAJE_DE_VALIDACION_DEL_TEXTO_BASE = 'No pudimos leer el texto base. Recarga.'

// Por qué quien mira no cambia el texto base de un origen (el panel lo dice en sólo lectura; la action, si llega igual).
export function motivoSinPermisoDelTextoBase(origen: string | null): string {
  return origen
    ? `Sólo quien configura cotizaciones en ${origen} cambia este texto.`
    : 'Sólo quien configura cotizaciones en este origen cambia este texto.'
}

export const MOTIVO_SIN_EL_ORIGEN = 'No pudimos leer el origen de este texto base. Recarga.'
