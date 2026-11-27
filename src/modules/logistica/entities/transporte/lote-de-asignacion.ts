// Sumar vehículos a un embarque o a un contenedor: el lote que va a `transporte_asignar` (cada uno con la versión de su transporte que se leyó) y cuáles ya van en
// otro destino, para preguntar antes de mudarlos. Espejo de la regla de la base (`23514 hint mover` queda de respaldo): en el contenedor elegido, o con destino un
// embarque en ése o en uno de sus contenedores, ya está; en otro contenedor, o directo en otro embarque, se muda sólo con `p_mover`.
import type { UnidadBuscada } from '../nucleo/unidad-buscada'
import type { TipoDeDestino, UnidadDelLote } from './repositorio-de-embarques'

export type DestinoDelLote =
  | { tipo: 'embarque'; id: string }
  // `embarqueId`: el embarque en que va el contenedor (nulo si no va en uno).
  | { tipo: 'contenedor'; id: string; embarqueId: string | null }

/** El lote para la base, en el orden elegido. */
export function unidadesParaAsignar(buscadas: readonly UnidadBuscada[]): UnidadDelLote[] {
  return buscadas.map((u) => ({ vehiculoId: u.id, actualizadoEn: u.transporteActualizadoEn }))
}

/** Si la unidad ya va en el destino: no cambia. */
export function yaEstaEn(u: UnidadBuscada, destino: DestinoDelLote): boolean {
  return destino.tipo === 'contenedor' ? u.contenedorId === destino.id : u.embarqueId === destino.id
}

// Dónde va hoy, dicho para la persona: el contenedor si va en uno; si no, el embarque.
export type OtroDestino = { tipo: TipoDeDestino; nombre: string }

/** Dónde va hoy una unidad que habría que mudar para ponerla en `destino`; nulo si ya está en él o no va en ninguno. */
export function otroDestinoDe(u: UnidadBuscada, destino: DestinoDelLote): OtroDestino | null {
  if (yaEstaEn(u, destino)) {
    return null
  }
  if (u.contenedorId !== null) {
    return { tipo: 'contenedor', nombre: u.contenedor ?? '—' }
  }
  const enOtroEmbarque =
    u.embarqueId !== null && (destino.tipo === 'embarque' || u.embarqueId !== destino.embarqueId)
  return enOtroEmbarque ? { tipo: 'embarque', nombre: u.booking ?? '—' } : null
}

/** Las que obligan a confirmar, con dónde van hoy. */
export function enOtroDestino(
  buscadas: readonly UnidadBuscada[],
  destino: DestinoDelLote,
): { unidad: UnidadBuscada; en: OtroDestino }[] {
  return buscadas.flatMap((unidad) => {
    const en = otroDestinoDe(unidad, destino)
    return en ? [{ unidad, en }] : []
  })
}

/** La marca del buscador: «Está en el contenedor «X»» o «Está en el embarque «B»». */
export function marcaDeOtroDestino(en: OtroDestino): string {
  return `Está en el ${en.tipo} «${en.nombre}»`
}

// Con muchos destinos, la pregunta nombra los primeros y dice cuántos más.
const NOMBRES_EN_LA_PREGUNTA = 3

const enPlural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

/** La pregunta antes de mudar: «2 vehículos ya van en otro contenedor (MSCU1234, TGHU5678). ¿Moverlos a éste?». */
export function mensajeDeMover(otros: readonly { en: OtroDestino }[]): string {
  const n = otros.length
  const distintos = [...new Set(otros.map((o) => o.en.nombre))]
  const resto = distintos.length - NOMBRES_EN_LA_PREGUNTA
  const nombres =
    distintos.slice(0, NOMBRES_EN_LA_PREGUNTA).join(', ') + (resto > 0 ? ` y ${resto} más` : '')
  const todosContenedor = otros.every((o) => o.en.tipo === 'contenedor')
  const todosEmbarque = otros.every((o) => o.en.tipo === 'embarque')
  const donde = todosContenedor
    ? 'otro contenedor'
    : todosEmbarque
      ? 'otro embarque'
      : 'otro contenedor o embarque'
  const quien = n === 1 ? '1 vehículo ya va' : `${n} vehículos ya van`
  return `${quien} en ${donde} (${nombres}). ¿${enPlural(n, 'Moverlo', 'Moverlos')} a éste?`
}
