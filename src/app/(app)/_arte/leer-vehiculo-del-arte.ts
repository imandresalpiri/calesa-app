// El vehículo de ejemplo de un arte leído con la sesión de quien pide (la RLS decide; nunca la secret key) y su Modo Live: sus datos para el arte
// (`DatosDelVehiculo`: la ficha del origen ya escrita, el cierre de su subasta y sus fotos en orden) y sus leads de «Relacionados», sólo con el
// nombre (con los clientes apagados en el Live, el motivo). Lo usan la ruta del ejemplo (`/artes/ejemplo/vehiculos/<id>`) y el PDF de un arte,
// que vuelve a leer el elegido en vez de creerle al navegador; el PDF usa además la ruta de cada foto en el bucket.
//
// `null` si no existe, está en la papelera, no se ve, es de otro origen que el de la plantilla o el Modo Live lo esconde (no se distingue por
// qué). Sin el layout, la ficha sale vacía; sin la subasta, sin cierre; sin los relacionados, el motivo. Sin las fotos o los ajustes de la
// empresa (la zona y el formato de la ficha: no se adivinan), el fallo.
import 'server-only'
import type { LeadsDeEjemplo, VehiculoDeEjemplo } from '@/modules/artes'
import { leerAjustes } from '@/modules/empresa'
import type { requerirSesion } from '@/modules/equipo'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import {
  leerGaleria,
  leerRelacionadosDelVehiculo,
  leerSubasta,
  leerVehiculo,
  type Galeria,
  type RelacionadosDelVehiculo,
  type Vehiculo,
} from '@/modules/vehiculos'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { origenOcultoEnElLive } from '../_live/guarda'
import { vehiculoParaElArte } from './datos-del-arte'
import {
  clientesEnElLive,
  leadsDeEjemplo,
  leeLosLeads,
  MOTIVO_SIN_LEER_LOS_LEADS,
  type ClientesEnElLive,
} from './lead-de-ejemplo'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

export type VehiculoDelArte = {
  respuesta: VehiculoDeEjemplo
  // Las fotos de la galería con sus rutas en el bucket, en su orden.
  fotos: Galeria['fotos']
}

const NO_SE_LEYO = 'No se pudieron leer los datos del vehículo.'

async function vehiculoVisible(
  sesion: Sesion,
  { id, origen }: { id: string; origen: string },
): Promise<Resultado<Vehiculo | null>> {
  if (!puede(sesion.permisos, 'vehiculos.ver', origen)) {
    return ok(null)
  }
  const leido = await leerVehiculo(id)
  if (!leido.ok) {
    return leido
  }
  const vehiculo = leido.data
  if (vehiculo === null || vehiculo.origenId !== origen) {
    return ok(null)
  }
  return ok((await origenOcultoEnElLive(vehiculo.origenId)) ? null : vehiculo)
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

export async function leerVehiculoDelArte(
  sesion: Sesion,
  { id, origen }: { id: string; origen: string },
): Promise<Resultado<VehiculoDelArte | null>> {
  const vehiculo = await vehiculoVisible(sesion, { id, origen })
  if (!vehiculo.ok || vehiculo.data === null) {
    return vehiculo.ok ? ok(null) : vehiculo
  }
  const [galeria, layout, subasta, origenes, ajustes, relacionados] = await Promise.all([
    leerGaleria(id),
    leerLayout(origen, { conUso: false }),
    leerSubasta(id),
    getOrigenes(true),
    leerAjustes(),
    leeLosLeads(sesion) ? leerRelacionadosDelVehiculo(id) : Promise.resolve(null),
  ])
  if (!galeria.ok || !ajustes.ok) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const { locale, zonaHoraria } = ajustes.data.ajustes
  return ok({
    respuesta: {
      vehiculo: vehiculoParaElArte({
        vehiculo: vehiculo.data,
        origen: nombreDelOrigen(origenes, origen),
        subasta: subasta.ok ? subasta.data : null,
        campos: layout.ok ? layout.data.campos : [],
        fotos: galeria.data.fotos,
        formato: { locale, zona: zonaHoraria },
      }),
      leads: leadsDe(relacionados, clientesEnElLive(sesion.live)),
    },
    fotos: galeria.data.fotos,
  })
}
