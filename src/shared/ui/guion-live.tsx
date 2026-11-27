// Server Component a propósito: un <script> renderizado desde un Client Component no se ejecuta
// al navegar y React avisa. Este se emite una sola vez, en el HTML del layout raíz.
import { codigoDelGuionDelLive } from '@/shared/lib/modo-live'

export { CLASE_LIVE, CLAVE_LIVE } from '@/shared/lib/modo-live'

// Va en el <body> antes que el contenido: aplica la clase del Modo Live antes del primer pintado,
// así una recarga con el modo encendido nunca deja ver un símbolo de moneda.
export function GuionLive() {
  return <script dangerouslySetInnerHTML={{ __html: codigoDelGuionDelLive() }} />
}
