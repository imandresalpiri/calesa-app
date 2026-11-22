import { datosO } from '@/shared/lib/errores'
import { leerTonosDelCatalogo } from '../../../areas/diseno/composicion'
import { TarjetaDeColores } from './tarjeta-de-colores'

// La tarjeta «Colores» de Configuración › Orígenes, leída en el servidor con la sesión de quien mira y detrás de su `<Suspense>`. Pide `cotizaciones.configurar` en algún
// origen (lo comprueba la página) y la base lo vuelve a pedir al escribir (la lectura la puede cualquiera con sesión). Una lectura que falla sube hasta el límite de la
// tarjeta, que ofrece «Reintentar»: la lista de orígenes no se cae.
export async function SeccionDeLosColores() {
  return <TarjetaDeColores lista={datosO(await leerTonosDelCatalogo())} />
}
