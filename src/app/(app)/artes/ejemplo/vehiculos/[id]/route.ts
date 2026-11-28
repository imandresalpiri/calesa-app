import { connection } from 'next/server'
import { z } from 'zod'
import type { LeadsDeEjemplo, VehiculoDeEjemplo } from '@/modules/artes'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import {
  leerGaleria,
  leerRelacionadosDelVehiculo,
  leerSubasta,
  leerVehiculo,
  type RelacionadosDelVehiculo,
  type Vehiculo,
} from '@/modules/vehiculos'
import type { Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { vehiculoParaElArte } from '../../../../_arte/datos-del-arte'
import {
  clientesEnElLive,
  leadsDeEjemplo,
  leeLosLeads,
  MOTIVO_SIN_LEER_LOS_LEADS,
  type ClientesEnElLive,
} from '../../../../_arte/lead-de-ejemplo'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../../_live/guarda'
import { json, NO_ESTA_EL_VEHICULO, NO_SE_PUDO, texto } from '../../_respuestas'

// El vehículo de ejemplo elegido en el editor de artes: sus datos para el arte (`DatosDelVehiculo`: la ficha del origen ya escrita, el cierre de
// su subasta y sus fotos en orden) y sus leads de «Relacionados», sólo con el nombre. Con la sesión de quien pide (la RLS decide; nunca la
// secret key) y su Modo Live: con los clientes apagados, el motivo en vez de los leads.
//
//   GET /artes/ejemplo/vehiculos/<id>?origen=<id>
//   200 application/json (`VehiculoDeEjemplo`) | 307 al ingreso | 404 text/plain | 500 text/plain
//
// 404 si no existe, está en la papelera, no se ve, es de otro origen que el de la plantilla o el Modo Live lo esconde. Sin el layout, la ficha
// sale vacía; sin la subasta, sin cierre; sin los relacionados, el motivo. Sin las fotos o los ajustes de la empresa (la zona y el formato de la
// ficha: no se adivinan), 500.
const esquema = z.object({ id: z.guid(), origen: z.guid() })

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

// El vehículo si quien pide lo ve y es del origen de la plantilla: `null` es el 404 (no se distingue por qué), `fallo` el 500.
async function vehiculoVisible(
  sesion: Sesion,
  { id, origen }: z.infer<typeof esquema>,
): Promise<Vehiculo | null | 'fallo'> {
  if (!puede(sesion.permisos, 'vehiculos.ver', origen)) {
    return null
  }
  const leido = await leerVehiculo(id)
  if (!leido.ok) {
    return 'fallo'
  }
  const vehiculo = leido.data
  if (vehiculo === null || vehiculo.origenId !== origen) {
    return null
  }
  return (await origenOcultoEnElLive(vehiculo.origenId)) ? null : vehiculo
}

// Los leads: sin leerlos (`null`), el motivo de `leadsDeEjemplo()`; si la lectura falló, el suyo.
function leadsDe(
  relacionados: Resultado<RelacionadosDelVehiculo> | null,
  clientes: ClientesEnElLive,
): LeadsDeEjemplo {
  if (relacionados !== null && !relacionados.ok) {
    return { motivo: MOTIVO_SIN_LEER_LOS_LEADS }
  }
  return leadsDeEjemplo(relacionados?.data ?? null, clientes)
}

const nombreDelOrigen = (origenes: Awaited<ReturnType<typeof getOrigenes>>, id: string) =>
  (origenes.ok ? origenes.data.find((origen) => origen.id === id)?.nombre : null) ?? ''

export async function GET(
  peticion: Request,
  { params }: RouteContext<'/artes/ejemplo/vehiculos/[id]'>,
) {
  await connection()
  const sesion = await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const pedido = esquema.safeParse({
    id: (await params).id,
    origen: new URL(peticion.url).searchParams.get('origen'),
  })
  if (!pedido.success) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const vehiculo = await vehiculoVisible(sesion, pedido.data)
  if (vehiculo === 'fallo') {
    return texto(NO_SE_PUDO, 500)
  }
  if (vehiculo === null) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const { id, origen } = pedido.data
  const [galeria, layout, subasta, origenes, ajustes, relacionados] = await Promise.all([
    leerGaleria(id),
    leerLayout(origen, { conUso: false }),
    leerSubasta(id),
    getOrigenes(true),
    leerAjustes(),
    leeLosLeads(sesion) ? leerRelacionadosDelVehiculo(id) : Promise.resolve(null),
  ])
  if (!galeria.ok || !ajustes.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const { locale, zonaHoraria } = ajustes.data.ajustes
  const respuesta: VehiculoDeEjemplo = {
    vehiculo: vehiculoParaElArte({
      vehiculo,
      origen: nombreDelOrigen(origenes, origen),
      subasta: subasta.ok ? subasta.data : null,
      campos: layout.ok ? layout.data.campos : [],
      fotos: galeria.data.fotos,
      formato: { locale, zona: zonaHoraria },
    }),
    leads: leadsDe(relacionados, clientesEnElLive(sesion.live)),
  }
  return json(respuesta)
}
