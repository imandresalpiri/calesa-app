import { connection } from 'next/server'
import { z } from 'zod'
import type { CotizacionDeEjemplo } from '@/modules/artes'
import { leerHojaDeUnaGuardada, paraCompartirDeUnaGuardada } from '@/modules/cotizaciones'
import { leerAjustes } from '@/modules/empresa'
import { clienteDeLaCotizacion, requerirSesion } from '@/modules/equipo'
import { leerNombresDeLeads } from '@/modules/leads'
import { cotizacionParaElArte } from '../../../../_arte/datos-del-arte'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../../_live/guarda'
import {
  asesorQueMira,
  oNulo,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../../../../cotizaciones/datos-de-la-tarjeta'
import { contextoParaCompartir } from '../../../../cotizaciones/[id]/compartir/versiones'
import { json, NO_ESTA_LA_COTIZACION, NO_SE_PUDO, texto } from '../../_respuestas'

// La cotización elegida para el arte (`DatosDeLaCotizacion`): las cifras de la tarjeta de **lo guardado** (sólo lo del nivel «todos», como
// «Compartir»: `paraCompartirDeUnaGuardada()`), con su moneda y sin ella, su vigencia y la imagen de su tarjeta por la ruta del mismo origen; y su
// lead, para elegirlo de entrada, sólo si quien pide lo ve (y el Modo Live deja leerlo). Con la sesión de quien pide (la RLS decide; nunca la
// secret key). Una cotización hermana va sola: el arte nombra una.
//
//   GET /artes/ejemplo/cotizaciones/<id>
//   200 application/json (`CotizacionDeEjemplo`) | 307 al ingreso | 404 text/plain | 500 text/plain
//
// Lo que no existe, está en la papelera, no se ve o el Modo Live esconde es el mismo 404 que el PDF, nunca 403.
type Sesion = Awaited<ReturnType<typeof requerirSesion>>

const falla = (codigo: string) =>
  codigo === 'sin_permiso' ? texto(NO_ESTA_LA_COTIZACION, 404) : texto(NO_SE_PUDO, 500)

// El lead de la cotización si quien pide lo ve: con el Modo Live, sólo si deja leer los clientes; un error de la lectura es «sin lead».
async function leadVisible(sesion: Sesion, leadId: string | null): Promise<string | null> {
  if (leadId === null || clienteDeLaCotizacion(sesion.live, sesion.permisos) !== 'leer') {
    return null
  }
  const nombres = await leerNombresDeLeads([leadId])
  return nombres.ok && nombres.data.has(leadId) ? leadId : null
}

export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/artes/ejemplo/cotizaciones/[id]'>,
) {
  await connection()
  const sesion = await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA_LA_COTIZACION, 404)
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_ESTA_LA_COTIZACION, 404)
  }
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return falla(lectura.error.codigo)
  }
  const { hoja } = lectura.data
  if (await origenOcultoEnElLive(hoja.cotizacion.origenId)) {
    return texto(NO_ESTA_LA_COTIZACION, 404)
  }
  const [vehiculo, asesor, ajustes, leadId] = await Promise.all([
    oNulo(vehiculoDe(hoja.cotizacion.vehiculoId)),
    asesorQueMira(),
    leerAjustes(),
    oNulo(leadVisible(sesion, hoja.cotizacion.leadId)),
  ])
  // Sin los ajustes no se sabe con qué formato escribir los montos: no se adivina con los de fábrica.
  if (!ajustes.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const { locale, zonaHoraria } = ajustes.data.ajustes
  const cifras = await paraCompartirDeUnaGuardada({
    lectura: lectura.data,
    contexto: contextoParaCompartir(hoja, {
      vehiculo: vehiculoDeLaTarjeta(vehiculo),
      asesor,
      zona: zonaHoraria,
      locale,
    }),
    locale,
  })
  if (!cifras.ok) {
    return falla(cifras.error.codigo)
  }
  const respuesta: CotizacionDeEjemplo = {
    cotizacion: cotizacionParaElArte({
      cotizacion: hoja.cotizacion,
      venceEl: hoja.venceEl,
      cifras: cifras.data,
    }),
    leadId: leadId ?? null,
  }
  return json(respuesta)
}
