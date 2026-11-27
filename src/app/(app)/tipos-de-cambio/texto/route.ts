import { responderCompartirTiposCambio } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'

// El texto para WhatsApp de los tipos de cambio elegidos en el popover de la barra (`docs/UX.md` › «Barra superior»): la empresa, el momento en su zona, un tipo
// por línea y la leyenda, armado en el servidor con la sesión de quien lo pide. Lo ve toda persona activa (como el popover), sin clave propia.
//
//   GET /tipos-de-cambio/texto?ids=<guid>,<guid>…   (de 1 a 30); `&sin-moneda=1`: la vista del Modo Live, sin moneda
//   200 text/plain | 307 al ingreso o a cerrar la sesión | 400, 404 y 500 text/plain
export async function GET(peticion: Request) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  await requerirSesion()
  return responderCompartirTiposCambio('texto', new URL(peticion.url).searchParams)
}
