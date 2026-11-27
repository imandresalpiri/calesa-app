import { esUnidadDeVehiculo, type UnidadAbierta } from '../../../entities/nucleo/unidad'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import { LimiteDelHueco } from './limite-del-hueco'

// Un vehículo dibuja el `componente` del hueco (las áreas que sólo tratan vehículos); un ítem, la `repuesto.componente` de su variante, y sin ella no dibuja nada.
function ComponenteDelHueco({ hueco, unidad }: { hueco: HuecoDeLaUnidad; unidad: UnidadAbierta }) {
  if (unidad.tipo === 'repuesto') {
    const Componente = hueco.repuesto?.componente
    return Componente === undefined ? null : <Componente unidad={unidad} />
  }
  return esUnidadDeVehiculo(unidad) ? <hueco.componente unidad={unidad} /> : null
}

// El contenido de un hueco, en su límite de error: si se rompe al dibujarse, lo dice ahí y el resto de la unidad sigue en pie. Lo usan las tarjetas de la unidad y «Qué falta».
export function ContenidoDelHueco({
  hueco,
  unidad,
}: {
  hueco: HuecoDeLaUnidad
  unidad: UnidadAbierta
}) {
  return (
    <LimiteDelHueco titulo={hueco.titulo}>
      <ComponenteDelHueco hueco={hueco} unidad={unidad} />
    </LimiteDelHueco>
  )
}
