import { connection } from 'next/server'
import { z } from 'zod'
import { archivoDeLaImagenDeArte, cabecerasDelMedio, SIN_MEDIO } from '@/modules/artes'
import { coincideLaEtiqueta } from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import { rutaOcultaEnElLive } from '../../../_live/guarda'

// Una imagen de la biblioteca para el lienzo del editor de artes, del mismo origen (el lienzo no queda «teñido» y exportar no falla): recibe
// sólo el id, nunca una URL. Con la sesión de quien pide: la fila y el objeto, por la RLS y la policy del bucket `artes`.
//
//   GET /artes/imagenes/<id>
//   200 image/* (inmutable: el objeto es por hash) | 304 | 307 al ingreso | 404 text/plain | 500 text/plain
const NO_ESTA = 'Esta imagen no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo leer la imagen.'

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_MEDIO },
  })

export async function GET(peticion: Request, { params }: RouteContext<'/artes/imagenes/[id]'>) {
  await connection()
  await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA, 404)
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_ESTA, 404)
  }
  const archivo = await archivoDeLaImagenDeArte(id)
  if (!archivo.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  if (archivo.data === null) {
    return texto(NO_ESTA, 404)
  }
  const { cuerpo, extension, etiqueta } = archivo.data
  const cabeceras = cabecerasDelMedio({ extension, etiqueta, inmutable: true })
  if (coincideLaEtiqueta(peticion.headers.get('if-none-match'), etiqueta)) {
    return new Response(null, { status: 304, headers: cabeceras })
  }
  return new Response(cuerpo, { status: 200, headers: cabeceras })
}
