import { responderCompartirTiposCambio } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'

// La imagen PNG de los tipos de cambio elegidos en el popover de la barra, con el logo y el nombre de la empresa, el momento en su zona y la leyenda
// (`ImageResponse` de `next/og`, en el servidor). Con la sesión de quien la pide; la ve toda persona activa (como el popover), sin clave propia.
//
//   GET /tipos-de-cambio/imagen?ids=<guid>,<guid>…   (de 1 a 30); `&sin-moneda=1`: la vista del Modo Live, sin moneda
//   200 image/png | 307 al ingreso o a cerrar la sesión | 400, 404 y 500 text/plain
export async function GET(peticion: Request) {
  await requerirSesion()
  return responderCompartirTiposCambio('imagen', new URL(peticion.url).searchParams)
}
