// La cotización elegida para un arte (`DatosDeLaCotizacion`) leída con la sesión de quien pide (la RLS decide; nunca la secret key): las cifras
// de la tarjeta de **lo guardado** (sólo lo del nivel «todos», como «Compartir»: `paraCompartirDeUnaGuardada()`), con su moneda y sin ella, su
// vigencia y la imagen de su tarjeta por la ruta del mismo origen; y su lead, sólo si quien pide lo ve (y el Modo Live deja leerlo). Una
// cotización hermana va sola: el arte nombra una. Lo usan la ruta del ejemplo (`/artes/ejemplo/cotizaciones/<id>`) y el PDF de un arte, que
// vuelve a leer la elegida y comprueba que sea de su vehículo; el PDF de una cotización con su plantilla de arte, sobre la guardada que ya leyó
// (`cotizacionDelArteDeUnaLeida`).
//
// `null` si no existe, está en la papelera, no se ve o el Modo Live esconde su origen (el mismo 404 que el PDF, nunca 403); lo demás, el fallo.
import 'server-only'
import type { CotizacionDeEjemplo } from '@/modules/artes'
import { leerHojaDeUnaGuardada, paraCompartirDeUnaGuardada } from '@/modules/cotizaciones'
import { leerAjustes } from '@/modules/empresa'
import { clienteDeLaCotizacion, type requerirSesion } from '@/modules/equipo'
import { leerNombresDeLeads } from '@/modules/leads'
import { fallo, ok, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { origenOcultoEnElLive } from '../_live/guarda'
import {
  asesorQueMira,
  oNulo,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../cotizaciones/datos-de-la-tarjeta'
import { contextoParaCompartir } from '../cotizaciones/[id]/compartir/versiones'
import { cotizacionParaElArte } from './datos-del-arte'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

export type CotizacionDelArte = { respuesta: CotizacionDeEjemplo; vehiculoId: string | null }

const NO_SE_LEYO = 'No se pudieron leer los datos de la cotización.'

// Lo que no se ve es «no está»; lo demás, el fallo.
const noEstaOFallo = (error: ErrorApp): Resultado<null> =>
  error.codigo === 'sin_permiso' ? ok(null) : { ok: false, error }

// El lead de la cotización si quien pide lo ve: con el Modo Live, sólo si deja leer los clientes; un error de la lectura es «sin lead».
async function leadVisible(sesion: Sesion, leadId: string | null): Promise<string | null> {
  if (leadId === null || clienteDeLaCotizacion(sesion.live, sesion.permisos) !== 'leer') {
    return null
  }
  const nombres = await leerNombresDeLeads([leadId])
  return nombres.ok && nombres.data.has(leadId) ? leadId : null
}

type LaGuardada = Extract<Awaited<ReturnType<typeof leerHojaDeUnaGuardada>>, { ok: true }>['data']

export async function leerCotizacionDelArte(
  sesion: Sesion,
  id: string,
): Promise<Resultado<CotizacionDelArte | null>> {
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return noEstaOFallo(lectura.error)
  }
  if (await origenOcultoEnElLive(lectura.data.hoja.cotizacion.origenId)) {
    return ok(null)
  }
  return cotizacionDelArteDeUnaLeida(sesion, lectura.data)
}

// Lo mismo sobre una guardada ya leída (y que quien pide ve, con el Modo Live incluido).
export async function cotizacionDelArteDeUnaLeida(
  sesion: Sesion,
  lectura: LaGuardada,
): Promise<Resultado<CotizacionDelArte | null>> {
  const { hoja } = lectura
  const [vehiculo, asesor, ajustes, leadId] = await Promise.all([
    oNulo(vehiculoDe(hoja.cotizacion.vehiculoId)),
    asesorQueMira(),
    leerAjustes(),
    oNulo(leadVisible(sesion, hoja.cotizacion.leadId)),
  ])
  // Sin los ajustes no se sabe con qué formato escribir los montos: no se adivina con los de fábrica.
  if (!ajustes.ok) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const { locale, zonaHoraria } = ajustes.data.ajustes
  const cifras = await paraCompartirDeUnaGuardada({
    lectura,
    contexto: contextoParaCompartir(hoja, {
      vehiculo: vehiculoDeLaTarjeta(vehiculo),
      asesor,
      zona: zonaHoraria,
      locale,
    }),
    locale,
  })
  if (!cifras.ok) {
    return noEstaOFallo(cifras.error)
  }
  return ok({
    respuesta: {
      cotizacion: cotizacionParaElArte({
        cotizacion: hoja.cotizacion,
        venceEl: hoja.venceEl,
        cifras: cifras.data,
      }),
      leadId: leadId ?? null,
    },
    vehiculoId: hoja.cotizacion.vehiculoId,
  })
}
