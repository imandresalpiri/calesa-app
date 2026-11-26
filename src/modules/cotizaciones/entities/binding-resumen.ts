// El resumen de la hoja (el total, lo que la tarjeta suma aparte y los subtotales), de la última respuesta del recálculo: lo que la tarjeta del total y los
// subtotales dibujan. Puro; sale también por `binding.ts`.
import type { ContextoDeHoja } from './binding'
import type { IndiceDeHoja } from './entradas'
import type { NodoDeTarjeta } from './hoja'
import { primerResultado } from './primer-resultado'
import type { RespuestaDeRecalculo } from './recalculo'

// Un valor de la respuesta como número (un texto, el de una variante, no lo es).
export const numeroDe = (v: number | string | null | undefined): number | null =>
  typeof v === 'number' ? v : null

export type TotalDelResumen =
  { tipo: 'sin_calcular' } | { tipo: 'valor'; usd: number } | { tipo: 'faltante'; motivo: string }

// Sin total porque algo falta. Si lo que falta nace donde esta hoja no dibuja nada (un nodo que el nivel esconde, un grupo, el total mismo) se dice así, sin nombrarlo.
function motivoDeSinTotal(respuesta: RespuestaDeRecalculo, indice: IndiceDeHoja): string {
  const dibujado = (donde: string) => indice.lados.has(donde) || indice.subtotales.has(donde)
  if (respuesta.hayFaltantesOcultos || respuesta.faltantes.some((f) => !dibujado(f.donde))) {
    return 'Falta un dato que esta hoja no muestra.'
  }
  return 'Revisa las celdas con aviso.'
}

export function totalDelResumen(c: ContextoDeHoja): TotalDelResumen {
  if (c.respuesta === null) {
    return { tipo: 'sin_calcular' }
  }
  const { monto } = primerResultado(c.respuesta.totales)
  return monto === null
    ? { tipo: 'faltante', motivo: motivoDeSinTotal(c.respuesta, c.indice) }
    : { tipo: 'valor', usd: monto }
}

export type SecundarioDelResumen = NodoDeTarjeta & { valor: number }

// Lo que la tarjeta suma aparte (la garantía), sólo si su nodo está activo y tiene valor: apagado, ni se nombra.
export function secundariosDelResumen(
  secundarios: readonly NodoDeTarjeta[],
  respuesta: RespuestaDeRecalculo | null,
): SecundarioDelResumen[] {
  return secundarios.flatMap((s) => {
    const valor = numeroDe(respuesta?.valores.get(s.nodo))
    return respuesta?.estados.get(s.nodo) === 'activo' && valor !== null ? [{ ...s, valor }] : []
  })
}

export const valorDeSubtotal = (nodo: string, respuesta: RespuestaDeRecalculo | null) =>
  numeroDe(respuesta?.valores.get(nodo))
