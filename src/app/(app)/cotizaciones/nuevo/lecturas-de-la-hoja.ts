import {
  aperturaDe,
  contarCotizacionesDelVehiculo,
  datosDelVehiculoDeLaHoja,
  eleccionesDeLaHoja,
  leerHojaParaCotizar,
  modoInicial,
  inicialDe,
  obligatoriosAlCotizar,
  recalcularAlAbrir,
  recalcularAlAbrirEnPar,
} from '@/modules/cotizaciones'
import { barraDelClienteEnElLive, type EstadoDelLive } from '@/modules/equipo'
import { leerClienteElegido, leerNombresDeLeads, type ClienteElegido } from '@/modules/leads'
import { PANEL_DEL_CLIENTE } from '@/modules/leads/pantallas/cotizar'
import { leerLayout, type OrigenResumen } from '@/modules/origenes'
import { datosParaElegirDe, type Vehiculo } from '@/modules/vehiculos'
import { PANEL_DEL_VEHICULO, type ParaElegir } from '@/modules/vehiculos/pantallas/cotizar'
import { datosO } from '@/shared/lib/errores'
import { SIN_NUMEROS } from '@/shared/lib/numeros-de-lead'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { altaDelPanelDe, elegidoDeLaUrl, type Quien } from '../vehiculo-de-la-hoja'

// Las lecturas de la hoja de cotizar (servidor): lo que la página junta en paralelo antes de dibujar. Un archivo aparte de `page.tsx` (una responsabilidad: la composición).

// La hoja y, con la hoja abierta que ella entrega, el primer cálculo (4-28: el total es el de la versión y las tarifas que se dibujan): llega dibujada con sus valores y el
// navegador no pide nada al abrir. Un pedido más en serie, que se ahorra cuando no hay hoja que calcular (sin permiso, sin publicar).
export async function abrirLaHoja(origenId: string, vehiculoId: string | null) {
  const hoja = await leerHojaParaCotizar(origenId)
  // Con la variante en par (glosario: «Variante en par»), un primer cálculo por opción: la hoja abre con las dos columnas calculadas.
  if (hoja.ok && hoja.data.estado === 'lista' && hoja.data.par) {
    const { par } = hoja.data
    const enPar = await recalcularAlAbrirEnPar({
      origenId,
      vehiculoId,
      abierta: hoja.data.abierta,
      modoTc: modoInicial(hoja.data.cabecera),
      opciones: [par.opciones[0].clave, par.opciones[1].clave],
    })
    const apertura = aperturaDe(hoja, enPar.resultados[0])
    return {
      apertura,
      vehiculoSoltado: enPar.vehiculoSoltado,
      inicialDeLaSegunda: inicialDe(hoja.data, enPar.resultados[1]),
    }
  }
  const alAbrir =
    hoja.ok && hoja.data.estado === 'lista'
      ? await recalcularAlAbrir({
          origenId,
          vehiculoId,
          abierta: hoja.data.abierta,
          modoTc: modoInicial(hoja.data.cabecera),
        })
      : null
  return {
    apertura: aperturaDe(hoja, alAbrir?.resultado ?? null),
    vehiculoSoltado: alAbrir?.vehiculoSoltado ?? false,
  }
}

// El lead de la URL para la barra del cliente (4.14-3b), con la sesión de quien mira: null si no vino, si quien mira no ve los leads o si la lectura no lo encontró (no
// existe, está en la papelera o no se ve: la hoja y las pestañas de origen lo sueltan, y guardar pide elegir otro). Un error de la lectura sube al `error.tsx`: no es «no se ve».
// Con el Modo Live que oculta los clientes, null sin leer; con «Sólo nombres», sólo su nombre (sin tipo ni números).
export async function clienteDeLaUrl(
  quien: { permisos: Permisos; live: EstadoDelLive },
  id: string | null,
): Promise<ClienteElegido | null> {
  const enElLive = barraDelClienteEnElLive(quien.live)
  if (id === null || enElLive === 'apagado') {
    return null
  }
  if (enElLive === 'nombres') {
    const nombre = datosO(await leerNombresDeLeads([id])).get(id)
    return nombre === undefined ? null : { id, nombre, tipoId: null, numeros: SIN_NUMEROS }
  }
  return puede(quien.permisos, 'leads.ver') ? datosO(await leerClienteElegido(id)) : null
}

// El layout del origen sólo hace falta con un vehículo: dice qué datos del vehículo se eligen en el panel.
export const layoutSiHayVehiculo = (origenId: string, vehiculo: string | null) =>
  vehiculo === null ? null : leerLayout(origenId, { conUso: false })

// Lo que el panel ofrece elegir del vehículo entre las filas de una tabla de la hoja (4.14-2c3, el tipo de vehículo del transporte): sólo con un elegido y su layout.
export function paraElegirDe(
  hoja: Parameters<typeof datosDelVehiculoDeLaHoja>[0],
  elegido: { vehiculo: Vehiculo; editable: boolean } | null,
  layout: Awaited<ReturnType<typeof leerLayout>> | null,
): ParaElegir | null {
  if (elegido === null || layout === null || !layout.ok) {
    return null
  }
  const datos = datosDelVehiculoDeLaHoja(hoja)
  return datos.length === 0
    ? null
    : datosParaElegirDe(elegido.vehiculo, datos, layout.data.campos, elegido.editable)
}

// Los campos que quien mira elige en el panel: la celda sin valor por uno de ellos dice dónde se elige.
export const camposQueSeEligen = (paraElegir: ParaElegir | null): string[] =>
  paraElegir?.editable ? paraElegir.datos.map((dato) => dato.campo) : []

// Lo que la página junta en paralelo antes de dibujar. El vehículo de la barra y su «Cotizado (n)» se leen a la vez que la hoja; si la hoja lo suelta, la barra queda sin él. Con un
// vehículo, el layout del origen (qué datos del vehículo se eligen en el panel) también va en paralelo.
export async function leerLoDeLaHoja(
  sesion: Quien & { live: EstadoDelLive },
  origen: OrigenResumen,
  de: { lead: string | null; vehiculo: string | null },
) {
  const [abierta, leido, conteo, alta, layout, cliente] = await Promise.all([
    abrirLaHoja(origen.id, de.vehiculo),
    elegidoDeLaUrl(sesion, de.vehiculo),
    de.vehiculo === null ? null : contarCotizacionesDelVehiculo(de.vehiculo),
    altaDelPanelDe(sesion.permisos, origen),
    layoutSiHayVehiculo(origen.id, de.vehiculo),
    clienteDeLaUrl(sesion, de.lead),
  ])
  return { ...abierta, leido, conteo, alta, layout, cliente }
}

// Qué pide el rol de quien mira en este origen y cómo se elige. Con «Ver como» son los permisos del rol elegido (`sesion.permisos`); la base decide con los reales, así que la hoja
// nunca afloja lo que ella exige. Al navegador viajan booleanos y textos. Con el Modo Live, el cliente se elige como dice su ajuste: con los clientes ocultos, al salir
// del Live (sin botón); con «Sólo nombres», en su panel.
export function reglasDeLaHoja(permisos: Permisos, origenId: string, live: EstadoDelLive) {
  const obligatorios = obligatoriosAlCotizar(permisos, origenId)
  const elecciones = eleccionesDeLaHoja(permisos, origenId, {
    cliente: PANEL_DEL_CLIENTE,
    vehiculo: PANEL_DEL_VEHICULO,
  })
  const enElLive = barraDelClienteEnElLive(live)
  if (enElLive === 'apagado') {
    return {
      obligatorios,
      elecciones: { ...elecciones, lead: { pedido: ELIGE_AL_SALIR_DEL_LIVE } },
    }
  }
  if (enElLive === 'nombres') {
    return { obligatorios, elecciones: { ...elecciones, lead: { panel: PANEL_DEL_CLIENTE } } }
  }
  return { obligatorios, elecciones }
}

// Cómo se elige el cliente con el Modo Live que lo oculta: el mismo texto que la barra del cliente apagada.
const ELIGE_AL_SALIR_DEL_LIVE = 'Se elige al salir del Modo Live.'
