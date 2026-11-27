import type { ReactNode } from 'react'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { CabeceraDeLaUnidad } from './cabecera-de-la-unidad'
import { ColumnaDeQueFalta } from './columna-de-que-falta'
import { ContenidoDelHueco } from './contenido-del-hueco'

type Props = {
  unidad: UnidadAbierta
  // El nombre del origen de la unidad.
  origen: string
  // La fase de la unidad (nombre y color); nula si no tiene.
  fase: { nombre: string; color: string } | null
  // Los huecos que se dibujan, ya filtrados y en orden (`huecosVisibles`): el panel no decide permisos. De aquí sale «Qué falta»; los demás van en las tarjetas.
  huecos: readonly HuecoDeLaUnidad[]
  // Una línea de aviso bajo la cabecera (p. ej. que no se pudo leer el flujo del origen).
  aviso?: string | null
  // Lo que va bajo la cabecera: el bloque «Relacionados» de un vehículo (vive en `vehiculos` y lo compone `src/app`; `logistica` no lo conoce).
  relacionados?: ReactNode
  // Las tarjetas con sus resúmenes del servidor (`TarjetasDeLaUnidad` de `src/app`, con `?seccion=`): cada una abre sus huecos en un segundo drawer.
  tarjetas: ReactNode
}

const QUE_FALTA = 'que-falta'

// El panel de la unidad en el drawer de gastos y pagos (6.01): la cabecera, «Qué falta» a la vista y las tarjetas en una columna, sin cadena (D33: el drawer es angosto). No lee
// nada: recibe lo que se dibuja. La página de la unidad usa `PaginaDeLaUnidad`. Compatible con servidor.
export function PanelDeLaUnidad({
  unidad,
  origen,
  fase,
  huecos,
  aviso = null,
  relacionados = null,
  tarjetas,
}: Props) {
  const queFalta = huecos.find((h) => h.clave === QUE_FALTA)
  return (
    <div className="grid min-w-0 gap-4" data-slot="panel-de-la-unidad">
      <CabeceraDeLaUnidad unidad={unidad} origen={origen} fase={fase} aviso={aviso} />
      {relacionados}
      {queFalta ? (
        <ColumnaDeQueFalta titulo={queFalta.titulo}>
          <ContenidoDelHueco hueco={queFalta} unidad={unidad} />
        </ColumnaDeQueFalta>
      ) : null}
      {tarjetas}
    </div>
  )
}
