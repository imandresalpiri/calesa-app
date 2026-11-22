import { datosO } from '@/shared/lib/errores'
import { leerAjustesDeCotizacion } from '../../../composicion'
import { TarjetaDeVigencia } from './tarjeta-de-vigencia'

// La tarjeta «Vigencia» de Configuración › Orígenes: una fila que siempre existe, leída en el servidor detrás de su `<Suspense>`. Si no se puede leer, sube hasta el límite de la
// tarjeta, que ofrece «Reintentar» (nunca los de fábrica). `puedeCambiar` y `puedeIrARoles` los pone la página, que ya tiene los permisos.
export async function SeccionDeLaVigencia({
  puedeCambiar,
  puedeIrARoles,
}: {
  puedeCambiar: boolean
  puedeIrARoles: boolean
}) {
  return (
    <TarjetaDeVigencia
      ajustes={datosO(await leerAjustesDeCotizacion())}
      puedeCambiar={puedeCambiar}
      puedeIrARoles={puedeIrARoles}
    />
  )
}
