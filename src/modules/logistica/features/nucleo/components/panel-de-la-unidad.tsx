import type { ReactNode } from 'react'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { BloquesDeLaUnidad } from './bloques-de-la-unidad'
import { CabeceraDeLaUnidad } from './cabecera-de-la-unidad'
import { seccionesDeLaUnidad } from './contenido-del-hueco'

type Props = {
  unidad: UnidadAbierta
  // El nombre del origen de la unidad.
  origen: string
  // La fase de la unidad (nombre y color); nula si no tiene.
  fase: { nombre: string; color: string } | null
  // Los huecos que se dibujan, ya filtrados y en orden (`huecosVisibles`): el panel no decide permisos.
  huecos: readonly HuecoDeLaUnidad[]
  // Una línea de aviso bajo la cabecera (p. ej. que no se pudo leer el flujo del origen).
  aviso?: string | null
  // Lo que va bajo la cabecera, antes de los huecos: el bloque «Relacionados» de un vehículo (vive en `vehiculos` y lo compone la página; `logistica` no lo conoce). Nulo en un ítem de repuesto.
  relacionados?: ReactNode
}

// El panel de la unidad (6.01): la cabecera con el título, el origen, la fase y los días en ella, y debajo una sección a la vista por hueco. No lee nada: recibe lo que se dibuja. Es el contenido de los drawers
// (gastos y pagos, ítem de repuesto); la página de la unidad usa `PaginaDeLaUnidad`. Un hueco recibe sólo `{ unidad }` (datos serializables) y carga lo suyo al abrirse.
export function PanelDeLaUnidad({
  unidad,
  origen,
  fase,
  huecos,
  aviso = null,
  relacionados = null,
}: Props) {
  return (
    <div className="grid gap-4" data-slot="panel-de-la-unidad">
      <CabeceraDeLaUnidad unidad={unidad} origen={origen} fase={fase} aviso={aviso} />
      {relacionados}
      <BloquesDeLaUnidad secciones={seccionesDeLaUnidad(unidad, huecos)} />
    </div>
  )
}
