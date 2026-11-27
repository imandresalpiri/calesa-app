// Los orígenes de Artes para quien mira: aquellos donde ve cotizaciones (la RLS de `artes_plantillas` acota igual). Sin ninguno, Artes no se
// usa (`MOTIVO_SIN_ARTES`). Puro.
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { OrigenDeArtes } from './tipos'

export function origenesDeArtes(
  permisos: Permisos,
  origenes: readonly { id: string; nombre: string; activo: boolean }[],
): OrigenDeArtes[] {
  return origenes
    .filter((o) => puede(permisos, 'cotizaciones.ver', o.id))
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
}
