// La oferta de transporte de un flujo: qué puertos de origen, de destino y qué navieras se ofrecen al cargar el transporte. Lista vacía = se ofrecen todos.
import { z } from 'zod'
import { loQueUsaElOrigen, type FilaPropiaOCompartida } from '@/shared/lib/catalogos/propios'
import { cortarAlTope } from '@/shared/lib/conteo'

export const TOPE_DE_LA_OFERTA = 200

export const TEXTO_DE_OFERTA_VACIA = 'Vacío: se ofrecen todos.'
// Lo que dice la oferta sin puertos o navieras que ofrecer: se cargan en su drawer, arriba del diagrama de las fases de un origen (el flujo de repuestos
// no tiene esos drawers: ofrece los compartidos, que se cargan desde cualquier origen).
export function textoSinCatalogo(catalogo: 'puertos' | 'navieras', deRepuestos: boolean): string {
  const titulo = catalogo === 'puertos' ? 'Puertos' : 'Navieras'
  const cargados = catalogo === 'puertos' ? 'puertos cargados' : 'navieras cargadas'
  const donde = deRepuestos ? 'en las fases de un origen' : 'arriba del diagrama'
  return `Todavía no hay ${cargados}. Se cargan en «${titulo}», ${donde}.`
}

export type ElementoDeOferta = { id: string; nombre: string; activo: boolean }

export type OfertaDeTransporte = {
  transporte: boolean
  puertosOrigen: ElementoDeOferta[]
  puertosDestino: ElementoDeOferta[]
  navieras: ElementoDeOferta[]
}

// Los puertos y navieras activos que usa el origen del flujo y se pueden marcar (se lee uno de más para saber si hay más).
export type CatalogoDeTransporte = {
  puertos: ElementoDeOferta[]
  navieras: ElementoDeOferta[]
  hayMasPuertos: boolean
  hayMasNavieras: boolean
}

const elemento = z.object({ id: z.guid(), nombre: z.string(), activo: z.boolean() })
const cruda = z.object({
  transporte: z.boolean(),
  puertos_origen: z.array(elemento),
  puertos_destino: z.array(elemento),
  navieras: z.array(elemento),
})

// `flujo_oferta()`, o nulo si no se entiende.
export function ofertaDesde(crudo: unknown): OfertaDeTransporte | null {
  const r = cruda.safeParse(crudo)
  if (!r.success) {
    return null
  }
  return {
    transporte: r.data.transporte,
    puertosOrigen: r.data.puertos_origen,
    puertosDestino: r.data.puertos_destino,
    navieras: r.data.navieras,
  }
}

// Un puerto o una naviera leídos con su origen (nulo = compartido) y su clave (`claveDePuerto` o `claveDeCatalogo`); las navieras no tienen orden (0).
export type FilaDelCatalogo = FilaPropiaOCompartida & { nombre: string; orden: number }

// Lo que usa el origen, en el orden en que se ve: sus propios y los compartidos que no tapa (sin origen, el flujo de repuestos, sólo los compartidos).
function loQueUsa(filas: readonly FilaDelCatalogo[], origenId: string | null): ElementoDeOferta[] {
  return loQueUsaElOrigen(filas, origenId)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
}

// El catálogo del origen del flujo desde lo que devolvieron las dos consultas (con `tope + 1` filas cada una y los compartidos al final): se corta
// antes de tapar, así el tope deja fuera un compartido antes que el propio que lo tapa.
export function catalogoDelOrigen(
  puertos: readonly FilaDelCatalogo[],
  navieras: readonly FilaDelCatalogo[],
  origenId: string | null,
): CatalogoDeTransporte {
  const p = cortarAlTope(puertos, TOPE_DE_LA_OFERTA)
  const n = cortarAlTope(navieras, TOPE_DE_LA_OFERTA)
  return {
    puertos: loQueUsa(p.filas, origenId),
    navieras: loQueUsa(n.filas, origenId),
    hayMasPuertos: p.hayMas,
    hayMasNavieras: n.hayMas,
  }
}

// Lo que se puede marcar en un grupo: los activos del catálogo y, aparte, los ya guardados que dejaron de estar activos o que el tope dejó fuera:
// se ven rotulados para poder quitarlos (la base los acepta).
export function elegibles(
  catalogo: readonly ElementoDeOferta[],
  guardados: readonly ElementoDeOferta[],
): ElementoDeOferta[] {
  const ids = new Set(catalogo.map((e) => e.id))
  const extra = guardados.filter((g) => !ids.has(g.id))
  return [...catalogo, ...extra]
}

export function vacioDe(lista: readonly unknown[]): boolean {
  return lista.length === 0
}

export type BorradorDeOferta = {
  puertosOrigen: readonly string[]
  puertosDestino: readonly string[]
  navieras: readonly string[]
}

function ordenados(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort()
}

// Lo guardado como ids, para compararlo con el borrador.
export function borradorDe(oferta: OfertaDeTransporte): BorradorDeOferta {
  return {
    puertosOrigen: oferta.puertosOrigen.map((e) => e.id),
    puertosDestino: oferta.puertosDestino.map((e) => e.id),
    navieras: oferta.navieras.map((e) => e.id),
  }
}

// Una firma que no depende del orden: la pantalla reinicia el borrador cuando lo guardado cambia de verdad, no cuando sólo cambia la versión del flujo.
export function firmaDeOferta(oferta: OfertaDeTransporte | BorradorDeOferta): string {
  const b = 'transporte' in oferta ? borradorDe(oferta) : oferta
  return JSON.stringify([
    ordenados(b.puertosOrigen),
    ordenados(b.puertosDestino),
    ordenados(b.navieras),
  ])
}

// Si el borrador pide algo distinto de lo guardado.
export function cambioDeOferta(guardada: OfertaDeTransporte, borrador: BorradorDeOferta): boolean {
  return firmaDeOferta(guardada) !== firmaDeOferta(borrador)
}
