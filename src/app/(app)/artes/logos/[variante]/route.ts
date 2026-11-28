import { connection } from 'next/server'
import {
  archivoDelLogoDeArte,
  cabecerasDelMedio,
  esquemaDeLaVarianteDelLogo,
  etiquetaDeLaRuta,
  SIN_MEDIO,
} from '@/modules/artes'
import { coincideLaEtiqueta } from '@/modules/cotizaciones'
import { conArchivo, leerLogos } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { rutaOcultaEnElLive } from '../../../_live/guarda'

// El logo de la empresa (una de sus variantes) para el lienzo del editor de artes, del mismo origen. Recibe la variante (`principal`,
// `oscuro` o su guid), nunca una ruta ni una URL: la ruta sale de la lista de logos de la empresa. Una variante puede cambiar de archivo:
// `no-cache` con la ruta como ETag (sin cambio, 304 sin bajar nada).
//
//   GET /artes/logos/<variante>
//   200 image/* | 304 | 307 al ingreso | 404 text/plain | 500 text/plain
const NO_ESTA = 'Este logo no existe.'
const NO_SE_PUDO = 'No se pudo leer el logo.'

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_MEDIO },
  })

export async function GET(peticion: Request, { params }: RouteContext<'/artes/logos/[variante]'>) {
  await connection()
  await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA, 404)
  }
  const variante = esquemaDeLaVarianteDelLogo.safeParse((await params).variante)
  if (!variante.success) {
    return texto(NO_ESTA, 404)
  }
  const logos = await leerLogos()
  if (!logos.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const elegida = conArchivo(logos.data).find((v) => v.id === variante.data)
  if (!elegida?.tipo) {
    return texto(NO_ESTA, 404)
  }
  const etiqueta = etiquetaDeLaRuta(elegida.ruta)
  const cabeceras = cabecerasDelMedio({ extension: elegida.tipo, etiqueta, inmutable: false })
  if (coincideLaEtiqueta(peticion.headers.get('if-none-match'), etiqueta)) {
    return new Response(null, { status: 304, headers: cabeceras })
  }
  const archivo = await archivoDelLogoDeArte(elegida.ruta, elegida.tipo)
  if (!archivo.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  return archivo.data === null
    ? texto(NO_ESTA, 404)
    : new Response(archivo.data.cuerpo, { status: 200, headers: cabeceras })
}
