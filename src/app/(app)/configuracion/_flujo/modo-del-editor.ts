import type { FlujoFijo } from '@/modules/flujos/pantallas/configuracion'
import { puede, type Permisos } from '@/shared/lib/permisos'

export type ModoDelEditor = 'edicion' | 'lectura'

// Cómo se arma el editor del flujo. En un origen, quien configura su flujo lo edita; quien sólo gestiona ahí los catálogos de logística entra a la pestaña
// Fases y ve el diagrama sin cambiarlo (sin huecos de escritura, sin «Reglas» ni «Revisar»). El flujo de repuestos sólo lo abre quien lo configura (la página
// ya lo comprobó): siempre en edición. Es la primera llave: la base vuelve a decidir cada escritura.
export function modoDelEditor(permisos: Permisos, fijo: FlujoFijo): ModoDelEditor {
  if (!('origenId' in fijo)) {
    return 'edicion'
  }
  return puede(permisos, 'flujos.configurar', fijo.origenId) ? 'edicion' : 'lectura'
}
