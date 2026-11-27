// El resumen de una tarjeta de la unidad (`docs/GLOSARIO.md` › «Tarjeta de la unidad»): lo arma el servidor (la lectura acotada de su área y una función pura) y viaja
// como datos. Las acciones de su «⋯» van resueltas con `puede()`: ni los permisos ni las reglas viajan al navegador. La primera acción es la principal (tocar la tarjeta).
// Sin I/O.
import type { ClaveDeTarjeta } from './tarjetas'

/** A dónde lleva una acción: el drawer de la tarjeta (con claves de URL que suma y un elemento que enfoca al abrir) u otra pantalla. */
export type DestinoDeLaAccion =
  | { tipo: 'drawer'; url?: Readonly<Record<string, string>>; enfocar?: string }
  | { tipo: 'ruta'; href: string }

export type AccionDeLaTarjeta = {
  clave: string
  etiqueta: string
  destino: DestinoDeLaAccion
}

export type ResumenDeTarjeta = {
  // Hasta dos líneas; la tarjeta las corta con elipsis.
  lineas: string[]
  // El aviso propio del tema («2 por aprobar», «Pago sin confirmar»); nulo sin aviso.
  aviso: string | null
  acciones: AccionDeLaTarjeta[]
}

export const NO_SE_LEYO_EL_RESUMEN = 'No pudimos leer el resumen.'

const VER: Record<ClaveDeTarjeta, string> = {
  documentos: 'Ver los documentos',
  transporte: 'Ver el transporte',
  repuestos: 'Ver lo que espera',
  aduana: 'Ver la aduana',
  dinero: 'Ver el dinero',
  notas: 'Ver las notas',
  historial: 'Ver el historial',
}

/** «Ver …»: abre el drawer de la tarjeta sin nada más. */
export function accionDeVer(tarjeta: ClaveDeTarjeta): AccionDeLaTarjeta {
  return { clave: 'ver', etiqueta: VER[tarjeta], destino: { tipo: 'drawer' } }
}

/** Si el resumen no se pudo leer, la tarjeta lo dice en su línea y se abre igual: el drawer lee lo suyo. */
export function resumenQueNoSeLeyo(tarjeta: ClaveDeTarjeta): ResumenDeTarjeta {
  return { lineas: [NO_SE_LEYO_EL_RESUMEN], aviso: null, acciones: [accionDeVer(tarjeta)] }
}
