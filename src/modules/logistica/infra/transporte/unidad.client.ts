// Lo que el hueco «Transporte» de la unidad lee desde el navegador, con la sesión de quien mira (6.08-2): su fila de `transportes` (la RLS de lectura sigue), el flujo activo de su origen,
// la oferta de ese flujo (`flujo_oferta`, `security invoker`) y los puertos y navieras que usa su origen (los compartidos y los propios de él) para nombrar lo ofrecido y lo ya guardado.
// Cuatro pedidos en paralelo y, tras ellos, la oferta (necesita el flujo) y lo guardado que no vino (otro origen, o más allá del tope), sin nada por fila. Índices:
// `transportes_vehiculo_id_key` (una fila por vehículo), `flujos` por origen y ámbito; puertos y navieras son tablas de decenas de filas (`.limit(201)`), ordenadas con los compartidos al
// final para que el tope corte un compartido antes que el propio que lo tapa; lo guardado, por su pkey.
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  alcanceDelCatalogo,
  type AlcanceDelCatalogo,
} from '../../entities/nucleo/alcance-del-catalogo'
import type { Unidad } from '../../entities/nucleo/unidad'
import {
  elementosDesde,
  ofertaDesde,
  type ElementoDelCatalogo,
  type OfertaDeTransporte,
} from '../../entities/transporte/oferta'
import { transporteDesde, type Transporte } from '../../entities/transporte/transporte'

export const NO_SE_CARGO_EL_TRANSPORTE = 'No se pudo cargar el transporte.'

const TOPE_DEL_CATALOGO = 200
const COLUMNAS_DE_TRANSPORTE =
  'id, naviera_id, puerto_origen_id, puerto_destino_id, contenedor, booking, zarpe_el, eta_el, arribo_el, notas, actualizado_en'

export type TransporteDeLaUnidad = {
  // Nulo = la unidad todavía no tiene transporte cargado.
  transporte: Transporte | null
  // Nula si el origen no tiene un flujo activo para esta unidad (no se ofrece nada: se ofrece todo lo activo).
  oferta: OfertaDeTransporte | null
  navieras: ElementoDelCatalogo[]
  puertos: ElementoDelCatalogo[]
  // Qué usa el origen de la unidad y qué de lo leído está tapado o es de otro origen (para rotular lo guardado).
  alcanceDeNavieras: AlcanceDelCatalogo
  alcanceDePuertos: AlcanceDelCatalogo
}

type UnidadLeida = Pick<Unidad, 'tipo' | 'id' | 'origenId'>
type Catalogo = 'puertos' | 'navieras'

const COLUMNAS_DEL_CATALOGO: Record<Catalogo, string> = {
  puertos: 'id, nombre, activo, origen_id, pais',
  navieras: 'id, nombre, activo, origen_id',
}

function leerCatalogo(catalogo: Catalogo, origenId: string) {
  return createClient()
    .from(catalogo)
    .select(COLUMNAS_DEL_CATALOGO[catalogo])
    .or(`origen_id.is.null,origen_id.eq.${origenId}`)
    .order('origen_id', { nullsFirst: false })
    .order('nombre')
    .limit(TOPE_DEL_CATALOGO + 1)
}

async function leerLoDeLaUnidad(unidad: UnidadLeida) {
  const supabase = createClient()
  return Promise.all([
    supabase
      .from('transportes')
      .select(COLUMNAS_DE_TRANSPORTE)
      .eq('vehiculo_id', unidad.id)
      .limit(1),
    supabase
      .from('flujos')
      .select('id')
      .eq('origen_id', unidad.origenId)
      .eq('ambito', unidad.tipo === 'vehiculo' ? 'vehiculos' : 'repuestos')
      .eq('activo', true)
      .limit(1),
    leerCatalogo('puertos', unidad.origenId),
    leerCatalogo('navieras', unidad.origenId),
  ])
}

// Lo guardado que no vino en la lectura del origen (de otro origen, o cortado por el tope) se pide aparte: sin él, el selector quedaría vacío y
// guardar sin cambios lo borraría. Sólo si falta algo.
async function leerLoQueFalta(
  catalogo: Catalogo,
  leidos: readonly ElementoDelCatalogo[],
  guardados: readonly (string | null)[],
): Promise<Resultado<ElementoDelCatalogo[]>> {
  const faltan = [
    ...new Set(
      guardados.filter((id): id is string => id !== null && !leidos.some((e) => e.id === id)),
    ),
  ]
  if (faltan.length === 0) {
    return ok([])
  }
  const leida = await createClient()
    .from(catalogo)
    .select(COLUMNAS_DEL_CATALOGO[catalogo])
    .in('id', faltan)
    .limit(faltan.length)
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const filas = elementosDesde(leida.data)
  return filas ? ok(filas) : fallo('inesperado', NO_SE_CARGO_EL_TRANSPORTE)
}

// Sin flujo activo no hay oferta (se ofrece todo lo activo); con él, `flujo_oferta` (`security invoker`: la lee cualquier cuenta con sesión).
async function leerLaOferta(
  flujoId: string | undefined,
): Promise<Resultado<OfertaDeTransporte | null>> {
  if (!flujoId) {
    return ok(null)
  }
  const leida = await createClient().rpc('flujo_oferta', { p_flujo: flujoId })
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const oferta = ofertaDesde(leida.data)
  return oferta ? ok(oferta) : fallo('inesperado', NO_SE_CARGO_EL_TRANSPORTE)
}

type Catalogos = { puertos: ElementoDelCatalogo[]; navieras: ElementoDelCatalogo[] }

// Lo leído del origen más lo guardado que no vino.
async function completarLosCatalogos(
  transporte: Transporte | null,
  leidos: Catalogos,
): Promise<Resultado<Catalogos>> {
  const [puertos, navieras] = await Promise.all([
    leerLoQueFalta('puertos', leidos.puertos, [
      transporte?.puertoOrigenId ?? null,
      transporte?.puertoDestinoId ?? null,
    ]),
    leerLoQueFalta('navieras', leidos.navieras, [transporte?.navieraId ?? null]),
  ])
  if (!puertos.ok) {
    return puertos
  }
  if (!navieras.ok) {
    return navieras
  }
  return ok({
    puertos: [...leidos.puertos, ...puertos.data],
    navieras: [...leidos.navieras, ...navieras.data],
  })
}

// Lo leído en paralelo, validado y con los catálogos cortados al tope; nulo si algo no tiene la forma esperada.
function loLeidoDesde(
  filas: readonly unknown[] | null,
  puertos: unknown,
  navieras: unknown,
): ({ transporte: Transporte | null } & Catalogos) | null {
  const fila0 = filas?.[0]
  const transporte = fila0 === undefined ? null : transporteDesde(fila0)
  const listaDePuertos = elementosDesde(puertos)
  const listaDeNavieras = elementosDesde(navieras)
  if ((fila0 !== undefined && transporte === null) || !listaDePuertos || !listaDeNavieras) {
    return null
  }
  return {
    transporte,
    puertos: cortarAlTope(listaDePuertos, TOPE_DEL_CATALOGO).filas,
    navieras: cortarAlTope(listaDeNavieras, TOPE_DEL_CATALOGO).filas,
  }
}

export async function leerTransporteDeLaUnidad(
  unidad: UnidadLeida,
): Promise<Resultado<TransporteDeLaUnidad>> {
  const [fila, flujos, puertos, navieras] = await leerLoDeLaUnidad(unidad)
  const conError = [fila, flujos, puertos, navieras].find((lectura) => lectura.error)
  if (conError?.error) {
    return { ok: false, error: errorDePostgrest(conError.error) }
  }
  const leido = loLeidoDesde(fila.data, puertos.data, navieras.data)
  if (!leido) {
    return fallo('inesperado', NO_SE_CARGO_EL_TRANSPORTE)
  }
  const [oferta, catalogos] = await Promise.all([
    leerLaOferta(flujos.data?.[0]?.id),
    completarLosCatalogos(leido.transporte, leido),
  ])
  if (!oferta.ok) {
    return oferta
  }
  if (!catalogos.ok) {
    return catalogos
  }
  const { puertos: todosLosPuertos, navieras: todasLasNavieras } = catalogos.data
  return ok({
    transporte: leido.transporte,
    oferta: oferta.data,
    puertos: todosLosPuertos,
    navieras: todasLasNavieras,
    alcanceDePuertos: alcanceDelCatalogo(todosLosPuertos, [unidad.origenId]),
    alcanceDeNavieras: alcanceDelCatalogo(todasLasNavieras, [unidad.origenId]),
  })
}
