// Por qué no se crea una salida al soltar el asa de una fase sobre otra: el espejo de `transicion_crear`, con sus mismos textos. Ahorra una ida a la
// base; quien decide sigue siendo la base (su rechazo se muestra igual). Puro: sin I/O ni React.
import type { FlujoParaConfigurar } from './flujo'

type FlujoParaVincular = Pick<FlujoParaConfigurar, 'fases' | 'transiciones'>

export function motivoParaNoVincular(
  flujo: FlujoParaVincular,
  de: string,
  a: string,
): string | null {
  if (de === a) return 'Una transición no puede volver a la misma fase.'
  const nombre = (id: string) => flujo.fases.find((f) => f.id === id)?.nombre ?? 'otra fase'
  if (flujo.transiciones.some((t) => t.deFaseId === de && t.aFaseId === a)) {
    return `Ya hay una transición de «${nombre(de)}» a «${nombre(a)}».`
  }
  const destino = flujo.fases.find((f) => f.id === a)
  if (destino && !destino.activa)
    return `La fase «${destino.nombre}» está jubilada: no puede ser destino.`
  return null
}
