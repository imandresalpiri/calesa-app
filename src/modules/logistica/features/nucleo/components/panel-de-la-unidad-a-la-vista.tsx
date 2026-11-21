import { enElOrdenDelItem, type HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { ProveedorDelDestinoInicial } from '../destino-inicial'
import { CabeceraDeLaUnidad } from './cabecera-de-la-unidad'
import { seccionesDeLaUnidad, type SeccionDeLaUnidad } from './contenido-del-hueco'
import { LimiteDelHueco } from './limite-del-hueco'
import { SeccionDelHuecoALaVista } from './seccion-del-hueco-a-la-vista'

type Props = {
  unidad: UnidadAbierta
  origen: string
  fase: { nombre: string; color: string } | null
  // Los huecos visibles (`huecosVisibles`): el panel no decide permisos; los reordena con `ORDEN_DEL_ITEM`.
  huecos: readonly HuecoDeLaUnidad[]
  aviso?: string | null
  // El destino que «Qué falta» abre solo (`?destino=`); nulo, ninguno.
  destinoInicial?: string | null
  // Lo que pone quien compone el panel entre «Qué falta» y el resto (los bloques de `repuestos`: imágenes, stock, compras), cada uno ya con su permiso.
  bloques?: readonly SeccionDeLaUnidad[]
  // Sin cabecera (`false`) el panel va bajo un título que ya dice qué ítem es (el drawer de un ítem de `/repuestos/[id]`): sólo queda su línea de `aviso`, si la hay.
  conCabecera?: boolean
}

const QUE_FALTA = 'que-falta'

function Seccion({ seccion }: { seccion: SeccionDeLaUnidad }) {
  return (
    <SeccionDelHuecoALaVista clave={seccion.clave} titulo={seccion.titulo}>
      {seccion.contenido}
    </SeccionDelHuecoALaVista>
  )
}

// El panel de un ítem de repuesto con sus secciones a la vista (la variante de `PanelDeLaUnidad`, que sigue plegable en el drawer de `/logistica/gastos?vehiculo=`):
// la cabecera, «Qué falta» primero, los bloques del ítem y el resto de los huecos en `ORDEN_DEL_ITEM`. Cada sección se dibuja una sola vez (un `data-bloque-del-hueco`
// repetido mandaría los atajos a otro lado) y va en su `LimiteDelHueco`. No lee nada.
export function PanelDeLaUnidadALaVista({
  unidad,
  origen,
  fase,
  huecos,
  aviso = null,
  destinoInicial = null,
  bloques = [],
  conCabecera = true,
}: Props) {
  const secciones = seccionesDeLaUnidad(unidad, enElOrdenDelItem(huecos))
  const queFalta = secciones.filter((s) => s.clave === QUE_FALTA)
  const resto = secciones.filter((s) => s.clave !== QUE_FALTA)
  const propios = bloques.map((b) => ({
    ...b,
    contenido: <LimiteDelHueco titulo={b.titulo}>{b.contenido}</LimiteDelHueco>,
  }))
  return (
    <ProveedorDelDestinoInicial destino={destinoInicial}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" data-slot="panel-de-la-unidad">
        {conCabecera ? (
          <CabeceraDeLaUnidad unidad={unidad} origen={origen} fase={fase} aviso={aviso} />
        ) : aviso ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{aviso}</p>
        ) : null}
        {[...queFalta, ...propios, ...resto].map((seccion) => (
          <Seccion key={seccion.clave} seccion={seccion} />
        ))}
      </div>
    </ProveedorDelDestinoInicial>
  )
}
