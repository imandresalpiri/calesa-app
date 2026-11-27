import { alcanceDelCatalogo } from '../nucleo/alcance-del-catalogo'
import { opcionesDeTransporte, type ElementoDelCatalogo, type OpcionDeTransporte } from './oferta'

// Lo que ofrecen los selectores de un embarque (naviera, puertos): lo activo que usa su origen (sus propios y los compartidos que no tapa) más lo ya guardado, rotulado si ya no se
// ofrece. Y cómo se nombra en la lista lo que el embarque tiene guardado.

export type CatalogosDelEmbarque = {
  navieras: readonly ElementoDelCatalogo[]
  puertos: readonly ElementoDelCatalogo[]
}

export type OpcionesDelEmbarque = {
  navieras: OpcionDeTransporte[]
  puertosOrigen: OpcionDeTransporte[]
  puertosDestino: OpcionDeTransporte[]
}

export function opcionesDelEmbarque(
  catalogos: CatalogosDelEmbarque,
  origenId: string,
  guardado: { naviera: string | null; puertoOrigen: string | null; puertoDestino: string | null },
): OpcionesDelEmbarque {
  const navieras = alcanceDelCatalogo(catalogos.navieras, [origenId])
  const puertos = alcanceDelCatalogo(catalogos.puertos, [origenId])
  const de = (
    catalogo: readonly ElementoDelCatalogo[],
    alcance: typeof navieras,
    id: string | null,
    femenino: boolean,
  ) => opcionesDeTransporte({ ofrecidos: [], catalogo, alcance, guardado: id, femenino })
  return {
    navieras: de(catalogos.navieras, navieras, guardado.naviera, true),
    puertosOrigen: de(catalogos.puertos, puertos, guardado.puertoOrigen, false),
    puertosDestino: de(catalogos.puertos, puertos, guardado.puertoDestino, false),
  }
}

/** El nombre de lo guardado; nulo sin elegir o si el id ya no está en el catálogo (nunca el uuid). */
export function nombreDeCatalogo(
  lista: readonly { id: string; nombre: string }[],
  id: string | null,
): string | null {
  return id === null ? null : (lista.find((e) => e.id === id)?.nombre ?? null)
}

/** «Miami → Iquique», «Miami → —»; nulo si no tiene ninguno. */
export function textoDeLaRuta(origen: string | null, destino: string | null): string | null {
  return origen === null && destino === null ? null : `${origen ?? '—'} → ${destino ?? '—'}`
}
