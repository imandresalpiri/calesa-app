// Los datos con que se llena el PDF de una cotización con su plantilla de arte: todos reales, leídos con la sesión de quien pide sobre la
// guardada que la ruta del PDF ya leyó y comprobó (la RLS y el Modo Live). La cotización con las cifras de lo guardado
// (`cotizacionDelArteDeUnaLeida`), su vehículo sólo si quien pide tiene `vehiculos.ver` en el origen (si no, el arte sale sin él, como el
// de un vehículo que falta), su cliente como lo nombra la tarjeta (`clienteDe`: con el Live en «Reemplazar», «Cliente»; un error lo deja
// sin cliente, como el PDF de hoy) y el asesor, que es quien pide. Sin hermana: el arte nombra una.
//
// `null` si la cotización ya no se ve (la ruta da su 404); sin el vehículo o el origen por un error de lectura, el fallo.
import 'server-only'
import type { requerirSesion } from '@/modules/equipo'
import { ok, type Resultado } from '@/shared/lib/errores'
import { clienteDe, oNulo } from '../../cotizaciones/datos-de-la-tarjeta'
import { cotizacionDelArteDeUnaLeida } from '../leer-cotizacion-del-arte'
import { leerVehiculoDelArte, type VehiculoDelArte } from '../leer-vehiculo-del-arte'
import { datosParaElPdf, leerLoComunDelPdf, type DatosParaElPdf } from './datos-para-el-pdf'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

type LaGuardada = Parameters<typeof cotizacionDelArteDeUnaLeida>[1]

const sinVehiculo: Resultado<VehiculoDelArte | null> = ok(null)

export async function leerDatosDeLaCotizacionParaElPdf(
  sesion: Sesion,
  lectura: LaGuardada,
): Promise<Resultado<DatosParaElPdf | null>> {
  const { origenId, vehiculoId, leadId } = lectura.hoja.cotizacion
  const [comun, vehiculo, cotizacion, cliente] = await Promise.all([
    leerLoComunDelPdf(origenId),
    vehiculoId === null
      ? sinVehiculo
      : leerVehiculoDelArte(sesion, { id: vehiculoId, origen: origenId, conLeads: false }),
    cotizacionDelArteDeUnaLeida(sesion, lectura),
    oNulo(clienteDe(sesion, leadId)),
  ])
  if (!comun.ok) {
    return comun
  }
  if (!vehiculo.ok) {
    return vehiculo
  }
  if (!cotizacion.ok || cotizacion.data === null) {
    return cotizacion.ok ? ok(null) : cotizacion
  }
  const { asesor, empresa } = comun.data.fijos
  return ok(
    datosParaElPdf(comun.data, {
      datos: {
        deEjemplo: false,
        vehiculo: vehiculo.data?.respuesta.vehiculo ?? null,
        cotizacion: cotizacion.data.respuesta.cotizacion,
        lead: cliente,
        asesor,
        empresa,
      },
      fotos: vehiculo.data?.fotos ?? [],
    }),
  )
}
