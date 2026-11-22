import { consultaDelDrawerDeLasTablas, rutaDeParteDelOrigen } from '@/shared/lib/rutas'
import type { ParametrosDeLaUrl } from '../../../con-parametros'
import { textos } from './pestana'

// A dónde lleva `…/<id>/tablas` (la pestaña de antes): al drawer de las tablas sobre la Planilla (`?panel=tablas`), con `?tabla=` y el panel de la tabla
// en `accion`.
export function destinoDeLasTablasViejas(origenId: string, parametros: ParametrosDeLaUrl): string {
  return rutaDeParteDelOrigen(
    origenId,
    'planilla',
    consultaDelDrawerDeLasTablas(textos(parametros)),
  )
}
