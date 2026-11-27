import { z } from 'zod'
import { leerHojaDeUnaGuardada, paraCompartirDeUnaGuardada } from '@/modules/cotizaciones'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { leerSubasta } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import {
  asesorQueMira,
  autorDe,
  oNulo,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../../datos-de-la-tarjeta'
import { datosParaCompartir } from './datos-para-compartir'
import { contextoParaCompartir, versionesParaCompartir } from './versiones'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../_live/guarda'

// Lo que el panel «Compartir la cotización» necesita para armar el texto: el título, el autor (quien la creó), el asesor (quien comparte), el vehículo con la zona
// de su patio y el cierre de su subasta, y las cifras de la tarjeta de **lo guardado** (sólo lo del nivel «todos»: `cotizacion_tarjeta`, K4). Con la sesión de quien
// pide (la RLS decide; nunca la secret key). Se pide una vez por apertura; también es el control de acceso del panel. Lo comparte quien ve la cotización, sin clave
// propia (como el PDF).
//
//   GET /cotizaciones/<id>/compartir
//   200 application/json (`DatosParaCompartir`) | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// Lo que no existe, está en la papelera o no se ve es el mismo 404 que el PDF, nunca 403.
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar el texto. Vuelve a intentarlo.'
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

const falla = (codigo: string) =>
  codigo === 'sin_permiso' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500)

// La subasta del vehículo; si su lectura falla, el texto sale sin la línea del cierre.
async function subastaDe(vehiculoId: string | null) {
  return vehiculoId === null ? null : datosO(await leerSubasta(vehiculoId))
}

export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/cotizaciones/[id]/compartir'>,
) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_DISPONIBLE, 404)
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_DISPONIBLE, 404)
  }
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return falla(lectura.error.codigo)
  }
  const { hoja } = lectura.data
  // Con el Modo Live y un origen que no muestra: como si no existiera.
  if (await origenOcultoEnElLive(hoja.cotizacion.origenId)) {
    return texto(NO_DISPONIBLE, 404)
  }
  const [vehiculo, subasta, autor, asesor, ajustes] = await Promise.all([
    oNulo(vehiculoDe(hoja.cotizacion.vehiculoId)),
    oNulo(subastaDe(hoja.cotizacion.vehiculoId)),
    autorDe(id),
    asesorQueMira(),
    leerAjustes(),
  ])
  // Sin los ajustes no se sabe en qué zona ni con qué formato decirlo: no se adivina con los de fábrica.
  if (!ajustes.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const { locale, zonaHoraria } = ajustes.data.ajustes
  // La cabecera de la tarjeta no se usa (el texto lleva sólo sus montos): el contexto va sin cliente ni logo.
  const comun = {
    vehiculo: vehiculoDeLaTarjeta(vehiculo),
    asesor,
    zona: zonaHoraria,
    locale,
  }
  const cifras = await paraCompartirDeUnaGuardada({
    lectura: lectura.data,
    contexto: contextoParaCompartir(hoja, comun),
    locale,
  })
  if (!cifras.ok) {
    return falla(cifras.error.codigo)
  }
  // La hermana disponible: los conceptos y el total de las dos opciones (glosario: «Cotizaciones hermanas»).
  const enPar = await versionesParaCompartir(lectura.data, cifras.data, comun)
  const datos = datosParaCompartir({
    cotizacion: enPar ? { ...hoja.cotizacion, titulo: enPar.tituloBase } : hoja.cotizacion,
    vehiculo,
    subasta: vehiculo === null ? null : subasta,
    autor,
    asesor,
    cifras: cifras.data,
    ajustes: { locale, zonaHoraria },
  })
  return Response.json(enPar ? { ...datos, versiones: enPar.versiones } : datos, {
    headers: SIN_GUARDAR,
  })
}
