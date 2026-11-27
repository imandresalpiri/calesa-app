// La demora de la unidad en su fase (la insignia «Demorada» de la cabecera): el espejo de `_logistica_dias(p_fase)` de la base, que decide las demoradas de la cadena,
// de la bandeja y de `alertas_demora`. Una fase alerta si es de logística, no es final, la regla `alerta_demora` del flujo está activa y sus días
// (`coalesce(fases.demora_dias, ajustes_empresa.demora_dias_default)`) pasan de 0; la unidad está demorada si entró a la fase hace más de esos días. Una subasta no
// ganada no cuenta (`situacion = 'no_ganada'`, como en la cadena). Si cambia la función SQL, cambia esto y su test. Sin I/O.
import type { SituacionDeLaUnidad } from './situacion'

const MS_POR_DIA = 86_400_000

export type FaseParaLaDemora = {
  esLogistica: boolean
  esFinal: boolean
  // Nulo: la de la empresa.
  demoraDias: number | null
}

export type PedidoDeDemora = {
  faseDesde: string | null
  // Nula si la unidad no tiene fase o el flujo no se pudo leer.
  fase: FaseParaLaDemora | null
  demoraPorDefecto: number | null
  reglaDeDemoraActiva: boolean
  situacion: SituacionDeLaUnidad
  ahora?: Date
}

/** Los días que la fase tolera; nulo si la fase no alerta (`_logistica_dias`). */
export function diasDeDemoraDeLaFase(
  fase: FaseParaLaDemora | null,
  demoraPorDefecto: number | null,
  reglaDeDemoraActiva: boolean,
): number | null {
  if (fase === null || !fase.esLogistica || fase.esFinal || !reglaDeDemoraActiva) return null
  const dias = fase.demoraDias ?? demoraPorDefecto
  return dias !== null && dias > 0 ? dias : null
}

/** ¿Está demorada? Con los días de la fase, para decirlos («Demorada: más de 7 días»). Nulo si no lo está o no se sabe. */
export function demoraDeLaUnidad(pedido: PedidoDeDemora): { dias: number } | null {
  const { faseDesde, fase, demoraPorDefecto, reglaDeDemoraActiva, situacion } = pedido
  if (situacion === 'no_ganada' || faseDesde === null) return null
  const dias = diasDeDemoraDeLaFase(fase, demoraPorDefecto, reglaDeDemoraActiva)
  if (dias === null) return null
  const desde = Date.parse(faseDesde)
  if (Number.isNaN(desde)) return null
  const ahora = (pedido.ahora ?? new Date()).getTime()
  return desde < ahora - dias * MS_POR_DIA ? { dias } : null
}
