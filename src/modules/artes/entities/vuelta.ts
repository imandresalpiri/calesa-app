// Adónde vuelve el editor de artes («Volver a Artes», y el aviso de pantalla chica): a la lista como se dejó, con sus filtros. La lista anota
// su dirección en `sessionStorage` al abrir una plantilla (`CLAVE_DE_LA_VUELTA_A_ARTES`) y el editor la lee con `vueltaAArtes()`: sólo vale
// una dirección propia de `/artes` (no la de una plantilla); si no, `/artes`. Puro.
import { returnToSeguro, RUTAS } from '@/shared/lib/rutas'

export const CLAVE_DE_LA_VUELTA_A_ARTES = 'artes:volver'

export function vueltaAArtes(guardada: string | null): string {
  const segura = returnToSeguro(guardada)
  if (segura === null) {
    return RUTAS.artes
  }
  const ruta = segura.split(/[?#]/)[0]
  return ruta === RUTAS.artes ? segura : RUTAS.artes
}
