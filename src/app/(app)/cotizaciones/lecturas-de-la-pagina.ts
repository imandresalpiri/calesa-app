import 'server-only'
import {
  agruparLaPagina,
  entradasSinAgrupar,
  filasConNombres,
  idsDe,
  leerAprobadasDeCotizaciones,
  leerAutoresDeCotizaciones,
  leerListadoDeCotizaciones,
  leerListadoPorVehiculo,
  leerModosDeCotizaciones,
  leerUnaDelListado,
  type CotizacionDelListado,
  type EntradaDelListado,
  type FilaDelListado,
  type LecturaDelServidor,
  type PaginaAgrupada,
  type PedidoDelListado,
} from '@/modules/cotizaciones'
import {
  CLIENTE_EN_EL_LIVE,
  clienteDeLaCotizacion,
  origenVisibleEnElLive,
  type EstadoDelLive,
} from '@/modules/equipo'
import { leerNombresDeLeads } from '@/modules/leads'
import { leerTitulosDeVehiculos } from '@/modules/vehiculos'
import { datosO, ok, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'

// Quien mira la lista: sus permisos (los del Live, con el Live encendido) y su Modo Live.
type QuienMira = { permisos: Permisos; live: EstadoDelLive }

// Los clientes de unas filas: sus nombres con `leads.ver` (con «Sólo nombres» del Live, si los permisos reales lo tienen); con el Live y los clientes ocultos, «Cliente»
// para cada uno sin leer nada; si no, ninguno.
function clientesDe(quien: QuienMira, filas: readonly FilaDelListado[]) {
  const ids = idsDe(filas, 'leadId')
  const que = clienteDeLaCotizacion(quien.live, quien.permisos)
  if (que === 'leer') {
    return leerNombresDeLeads(ids)
  }
  const nombres = que === 'reemplazar' ? ids.map((id) => [id, CLIENTE_EN_EL_LIVE] as const) : []
  return Promise.resolve<Resultado<Map<string, string>>>(ok(new Map(nombres)))
}

// Los nombres de unas filas, una vez y por clave primaria: el cliente según `clientesDe()`; lo que quien mira no ve no llega y se dibuja «—». Con `modos`, también el
// nombre del modo de cada una (el «Total» de la tarjeta).
export async function nombresDe(
  quien: QuienMira,
  filas: readonly FilaDelListado[],
  { modos = false }: { modos?: boolean } = {},
) {
  const sinNombres = { ok: true as const, data: new Map<string, string>() }
  const [clientes, vehiculos, autores, aprobadas, deLosModos] = await Promise.all([
    clientesDe(quien, filas),
    leerTitulosDeVehiculos(idsDe(filas, 'vehiculoId')),
    leerAutoresDeCotizaciones(idsDe(filas, 'creadoPor')),
    // Cuáles son la aprobada de su vehículo: por el único de `cotizaciones_aprobadas`, con la RLS de quien mira.
    leerAprobadasDeCotizaciones(filas.map((fila) => fila.id)),
    modos ? leerModosDeCotizaciones(filas.map((fila) => fila.id)) : Promise.resolve(sinNombres),
  ])
  return {
    clientes: datosO(clientes),
    vehiculos: datosO(vehiculos),
    autores: datosO(autores),
    aprobadas: datosO(aprobadas),
    // Sin el modo la tarjeta igual se dibuja: el total, sin su modo.
    modos: deLosModos.ok ? deLosModos.data : new Map<string, string>(),
  }
}

// Con `?lead=`, de quién son estas cotizaciones: el nombre sólo con `leads.ver` y si la lectura lo devuelve (la RLS de leads); si no, nulo, sin distinguir un lead que no existe de uno que no
// se ve. Con el Live y los clientes ocultos, nulo sin leer («un cliente»). Sin `?lead=`, `undefined`.
export async function nombreDelLead(quien: QuienMira, id: string | undefined) {
  if (id === undefined) {
    return undefined
  }
  if (clienteDeLaCotizacion(quien.live, quien.permisos) !== 'leer') {
    return { nombre: null }
  }
  return { nombre: datosO(await leerNombresDeLeads([id])).get(id) ?? null }
}

// La cotización de `?cotizacion=` cuando no está en la página (recargar, un enlace compartido, «Siguiente» con el resumen abierto, una línea del modal de un grupo):
// la lee el servidor, con la RLS de quien mira y su «Vencida» de la función del listado (`leerUnaDelListado`), y sus nombres y su modo aparte. Si esa lectura falla, el listado
// no cae: `error`, y el resumen ofrece «Reintentar».
export async function leerLaDelResumen(quien: QuienMira, id: string): Promise<LecturaDelServidor> {
  try {
    const fila = datosO(await leerUnaDelListado(id))
    // Con el Modo Live, la de un origen que no muestra se dice como la que no existe.
    if (fila === null || !origenVisibleEnElLive(quien.live, fila.origenId)) {
      return { id, estado: 'no_disponible' }
    }
    const [cotizacion] = filasConNombres([fila], await nombresDe(quien, [fila], { modos: true }))
    return cotizacion === undefined ? { id, estado: 'error' } : { id, estado: 'listo', cotizacion }
  } catch {
    return { id, estado: 'error' }
  }
}

export type PaginaDeLaLista = {
  pagina: PaginaAgrupada<CotizacionDelListado>
  // Las cotizaciones que se dibujan (las cabezas y las solas, o toda la página de una búsqueda), con sus nombres: sobre ellas van el «⋯» y lo visto.
  cotizaciones: CotizacionDelListado[]
  acotada: boolean
}

// La página de la lista: agrupada por la base (`cotizaciones_listado_por_vehiculo()`) si se agrupa sin búsqueda; con búsqueda, la de siempre agrupada en la
// página (`agruparLaPagina()`); sin agrupar, la de siempre con cada cotización sola. Después, los nombres y el modo de lo que se dibuja, de una vez.
export async function leerLaPagina(
  quien: QuienMira,
  pedido: PedidoDelListado,
  agrupada: boolean,
): Promise<PaginaDeLaLista> {
  if (agrupada && pedido.texto === undefined) {
    const leida = datosO(await leerListadoPorVehiculo(pedido))
    const cabezas = leida.filas.map((e) => (e.tipo === 'grupo' ? e.cabeza : e.cotizacion))
    const conNombres = filasConNombres(cabezas, await nombresDe(quien, cabezas, { modos: true }))
    const porId = new Map(conNombres.map((fila) => [fila.id, fila]))
    const entradas = leida.filas.flatMap((e): EntradaDelListado<CotizacionDelListado>[] => {
      const una = porId.get(e.tipo === 'grupo' ? e.cabeza.id : e.cotizacion.id)
      if (una === undefined) {
        return []
      }
      return [e.tipo === 'grupo' ? { ...e, cabeza: una } : { ...e, cotizacion: una }]
    })
    return { pagina: { ...leida, filas: entradas }, cotizaciones: conNombres, acotada: false }
  }
  const leida = datosO(await leerListadoDeCotizaciones(pedido))
  const nombres = await nombresDe(quien, leida.filas, { modos: true })
  const conNombres = filasConNombres(leida.filas, nombres)
  const entradas = agrupada
    ? agruparLaPagina(conNombres, nombres.aprobadas)
    : entradasSinAgrupar(conNombres)
  return {
    pagina: {
      filas: entradas,
      siguiente: leida.siguiente,
      anterior: leida.anterior,
      cortada: null,
    },
    cotizaciones: conNombres,
    acotada: leida.acotada,
  }
}
