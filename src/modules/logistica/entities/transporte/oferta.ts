import { z } from 'zod'
import { claveDeCatalogo } from '@/shared/lib/catalogos/propios'
import {
  claveDePuerto,
  nombreConOrigen,
  rotuloPorOrigen,
  type AlcanceDelCatalogo,
} from '../nucleo/alcance-del-catalogo'

// Lo que ofrece el transporte de un flujo y cómo se vuelve el contenido de un selector (6.08-2). La oferta la lee `flujo_oferta(p_flujo)`; es una **copia** de lo que entiende `flujos` (un
// área no importa otra). Lista vacía = se ofrece todo lo activo del catálogo.
export type ElementoDeOferta = { id: string; nombre: string; activo: boolean }

export type OfertaDeTransporte = {
  transporte: boolean
  puertosOrigen: ElementoDeOferta[]
  puertosDestino: ElementoDeOferta[]
  navieras: ElementoDeOferta[]
}

const elemento = z.object({ id: z.guid(), nombre: z.string(), activo: z.boolean() })
const cruda = z.object({
  transporte: z.boolean(),
  puertos_origen: z.array(elemento),
  puertos_destino: z.array(elemento),
  navieras: z.array(elemento),
})

/** Lo que devuelve `flujo_oferta()`; nulo si no tiene la forma esperada. */
export function ofertaDesde(crudo: unknown): OfertaDeTransporte | null {
  const r = cruda.safeParse(crudo)
  return r.success
    ? {
        transporte: r.data.transporte,
        puertosOrigen: r.data.puertos_origen,
        puertosDestino: r.data.puertos_destino,
        navieras: r.data.navieras,
      }
    : null
}

// Un puerto o una naviera leídos para un selector: con su origen (nulo = compartido) y su clave (`claveDePuerto` o `claveDeCatalogo`), para saber
// quién lo usa (`alcanceDelCatalogo`).
export type ElementoDelCatalogo = ElementoDeOferta & { origenId: string | null; clave: string }

const delCatalogo = elemento.extend({
  origen_id: z.guid().nullable(),
  pais: z.string().nullable().optional(),
  origen: z.object({ nombre: z.string() }).nullable().optional(),
})

/**
 * Las filas de `puertos` (`id, nombre, activo, origen_id, pais`) o `navieras` (sin `pais`); nulo si alguna no tiene la forma esperada. Leídas también con `origen:origenes(nombre)`
 * (donde se mezclan orígenes: embarques), un propio se nombra «<nombre> · <origen>»; la clave sale siempre del nombre solo.
 */
export function elementosDesde(datos: unknown): ElementoDelCatalogo[] | null {
  const r = z.array(delCatalogo).safeParse(datos)
  return r.success
    ? r.data.map((e) => ({
        id: e.id,
        nombre: nombreConOrigen({ nombre: e.nombre, origenNombre: e.origen?.nombre ?? null }),
        activo: e.activo,
        origenId: e.origen_id,
        clave: e.pais === undefined ? claveDeCatalogo(e.nombre) : claveDePuerto(e.nombre, e.pais),
      }))
    : null
}

export type OpcionDeTransporte = { valor: string; etiqueta: string }

/**
 * Las opciones de un selector (sin la de «Sin elegir», que pone quien dibuja): lo que ofrece el flujo y usa el origen —o, con la oferta vacía, todo lo activo que usa el origen
 * (`alcance.usables`)— y **siempre** lo ya guardado, rotulado si ya no se ofrece: «(de otro origen)», «(tapado)», «(inactivo)» o «(fuera de la oferta)». Así una desactivación o un
 * propio nuevo no esconden un dato guardado (la base sólo frena lo nuevo). `femenino` es la concordancia del rótulo («naviera inactiva», «puerto inactivo»).
 */
export function opcionesDeTransporte(args: {
  ofrecidos: readonly ElementoDeOferta[]
  catalogo: readonly ElementoDeOferta[]
  alcance: AlcanceDelCatalogo
  guardado: string | null
  femenino: boolean
}): OpcionDeTransporte[] {
  const { ofrecidos, catalogo, alcance, guardado, femenino } = args
  const base = (ofrecidos.length > 0 ? ofrecidos : catalogo).filter(
    (e) => e.activo && alcance.usables.has(e.id),
  )
  const vistos = new Set<string>()
  const opciones: OpcionDeTransporte[] = []
  for (const e of [...base].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    if (!vistos.has(e.id)) {
      vistos.add(e.id)
      opciones.push({ valor: e.id, etiqueta: e.nombre })
    }
  }
  if (guardado !== null && !vistos.has(guardado)) {
    const conocido =
      catalogo.find((e) => e.id === guardado) ?? ofrecidos.find((e) => e.id === guardado)
    opciones.push({
      valor: guardado,
      etiqueta: `${conocido?.nombre ?? 'Elegido antes'} ${rotuloDeLoGuardado(conocido, alcance, femenino)}`,
    })
  }
  return opciones
}

// Por qué no se ofrece lo guardado: primero el origen (de otro, o tapado), luego que esté inactivo o fuera de la oferta; sin conocerlo, «(no disponible)».
function rotuloDeLoGuardado(
  conocido: ElementoDeOferta | undefined,
  alcance: AlcanceDelCatalogo,
  femenino: boolean,
): string {
  if (!conocido) {
    return '(no disponible)'
  }
  const inactivo = femenino ? '(inactiva)' : '(inactivo)'
  return (
    rotuloPorOrigen(alcance, conocido.id, femenino) ??
    (conocido.activo ? '(fuera de la oferta)' : inactivo)
  )
}
