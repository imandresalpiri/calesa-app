import { connection } from 'next/server'
import { z } from 'zod'
import { cabecerasDelMedio, etiquetaDeLaRuta, LADOS_DE_LA_FOTO, SIN_MEDIO } from '@/modules/artes'
import { coincideLaEtiqueta } from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import { leerGaleria, leerVehiculo } from '@/modules/vehiculos'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../../_live/guarda'
import { bajarLaFoto, extensionDeLaFoto } from '../../../_medios'

// Una foto del vehículo de ejemplo para el lienzo del editor de artes, del mismo origen (el lienzo no queda «teñido» y exportar no falla): recibe
// sólo los ids, nunca una URL. Quién la ve lo decide la sesión de quien pide (el vehículo y su galería, por la RLS) y su Modo Live, antes de bajar
// nada; el archivo se baja del bucket público `vehiculos`.
//
//   GET /artes/fotos/<vehiculo>/<foto>?ancho=480|1600
//   200 image/* (inmutable: el objeto es por hash) | 304 | 307 al ingreso | 404 text/plain | 500 text/plain
//
// `?ancho=480` es la miniatura (las listas); sin él u otro valor, la de 1.600 px (el lienzo).
const NO_ESTA = 'Esta foto no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo leer la foto.'
const [LADO_DE_LA_MINIATURA] = LADOS_DE_LA_FOTO
const MINIATURA = String(LADO_DE_LA_MINIATURA)

const esquema = z.object({ vehiculo: z.guid(), foto: z.guid() })

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_MEDIO },
  })

// La ruta de la foto en el bucket si quien pide la ve: `null` es el 404 (no se distingue por qué), `fallo` el 500.
async function rutaDeLaFoto(
  { vehiculo: vehiculoId, foto: fotoId }: z.infer<typeof esquema>,
  miniatura: boolean,
): Promise<string | null | 'fallo'> {
  const [vehiculo, galeria] = await Promise.all([leerVehiculo(vehiculoId), leerGaleria(vehiculoId)])
  if (!vehiculo.ok || !galeria.ok) {
    return 'fallo'
  }
  if (vehiculo.data === null || (await origenOcultoEnElLive(vehiculo.data.origenId))) {
    return null
  }
  const foto = galeria.data.fotos.find((f) => f.id === fotoId)
  if (foto === undefined) {
    return null
  }
  return miniatura ? foto.rutaMiniatura : foto.ruta
}

export async function GET(
  peticion: Request,
  { params }: RouteContext<'/artes/fotos/[vehiculo]/[foto]'>,
) {
  await connection()
  await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA, 404)
  }
  const pedido = esquema.safeParse(await params)
  if (!pedido.success) {
    return texto(NO_ESTA, 404)
  }
  const miniatura = new URL(peticion.url).searchParams.get('ancho') === MINIATURA
  const ruta = await rutaDeLaFoto(pedido.data, miniatura)
  if (ruta === 'fallo') {
    return texto(NO_SE_PUDO, 500)
  }
  const extension = ruta === null ? null : extensionDeLaFoto(ruta)
  if (ruta === null || extension === null) {
    return texto(NO_ESTA, 404)
  }
  const etiqueta = etiquetaDeLaRuta(ruta)
  const cabeceras = cabecerasDelMedio({ extension, etiqueta, inmutable: true })
  if (coincideLaEtiqueta(peticion.headers.get('if-none-match'), etiqueta)) {
    return new Response(null, { status: 304, headers: cabeceras })
  }
  const bajada = await bajarLaFoto(ruta)
  if (!bajada.ok) {
    return bajada.motivo === 'no_esta' ? texto(NO_ESTA, 404) : texto(NO_SE_PUDO, 500)
  }
  return new Response(bajada.cuerpo, { status: 200, headers: cabeceras })
}
