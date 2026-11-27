// Lo que el panel «Compartir la cotización» pide desde el navegador, con la sesión de quien mira: los datos del texto, la imagen de la tarjeta, la lista de fotos y cada foto. Un
// `fetch` que no sigue la redirección (sin sesión la ruta manda al ingreso) y da textos propios, nunca el cuerpo de la respuesta: un 404 es «No tienes acceso a esta
// cotización.», la redirección la sesión vencida y un pedido que no llegó, sin conexión.
import { MENSAJE_SIN_CONEXION, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  esquemaDeLasFotos,
  esquemaDeLosDatos,
  type DatosParaCompartir,
  type FotoParaCompartir,
} from '../../entities/tarjeta/compartir/datos-para-compartir'
import { rutaDeLaCotizacion, rutaDeLaImagen } from '../../entities/ruta-de-la-hoja'

export const MENSAJE_SIN_ACCESO = 'No tienes acceso a esta cotización.'
export const MENSAJE_SESION_QUE_NO_VALE = 'Tu sesión ya no vale: vuelve a entrar.'

type Pedido = { tipo: RegExp; cache: RequestCache; alFallar: string; senal?: AbortSignal }

async function pedir(ruta: string, pedido: Pedido): Promise<Resultado<Response>> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      redirect: 'manual',
      cache: pedido.cache,
      ...(pedido.senal === undefined ? {} : { signal: pedido.senal }),
    })
  } catch {
    return fallo('inesperado', MENSAJE_SIN_CONEXION)
  }
  if (respuesta.type === 'opaqueredirect' || (respuesta.status >= 300 && respuesta.status < 400)) {
    return fallo('no_autenticado', MENSAJE_SESION_QUE_NO_VALE)
  }
  if (respuesta.status === 404) {
    return fallo('no_encontrado', MENSAJE_SIN_ACCESO)
  }
  if (!respuesta.ok || !pedido.tipo.test(respuesta.headers.get('content-type') ?? '')) {
    return fallo('inesperado', pedido.alFallar)
  }
  return ok(respuesta)
}

async function leerJson<T>(
  respuesta: Resultado<Response>,
  esquema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
  alFallar: string,
): Promise<Resultado<T>> {
  if (!respuesta.ok) return respuesta
  try {
    const leido = esquema.safeParse(await respuesta.data.json())
    return leido.success ? ok(leido.data) : fallo('inesperado', alFallar)
  } catch {
    return fallo('inesperado', alFallar)
  }
}

async function leerBlob(
  respuesta: Resultado<Response>,
  alFallar: string,
): Promise<Resultado<Blob>> {
  if (!respuesta.ok) return respuesta
  try {
    return ok(await respuesta.data.blob())
  } catch {
    return fallo('inesperado', alFallar)
  }
}

const JSON_ = /^application\/json\b/
const IMAGEN = /^image\//
const NO_SE_ARMO_EL_TEXTO = 'No se pudo armar el texto.'
const NO_SE_LEYERON_LAS_FOTOS = 'No se pudieron leer las fotos.'
const NO_SE_ARMO_LA_IMAGEN = 'No se pudo armar la imagen.'

// Los datos del texto (`GET /cotizaciones/<id>/compartir`): una vez por apertura.
export async function pedirLosDatos(id: string, senal?: AbortSignal) {
  const pedido = { tipo: JSON_, cache: 'no-store', alFallar: NO_SE_ARMO_EL_TEXTO, senal } as const
  const respuesta = await pedir(`${rutaDeLaCotizacion(id)}/compartir`, pedido)
  return leerJson<DatosParaCompartir>(respuesta, esquemaDeLosDatos, NO_SE_ARMO_EL_TEXTO)
}

// La lista de fotos del vehículo (`…/compartir/fotos`): al elegir «Fotos».
export async function pedirLasFotos(
  id: string,
  senal?: AbortSignal,
): Promise<Resultado<FotoParaCompartir[]>> {
  const pedido = {
    tipo: JSON_,
    cache: 'no-store',
    alFallar: NO_SE_LEYERON_LAS_FOTOS,
    senal,
  } as const
  const respuesta = await pedir(`${rutaDeLaCotizacion(id)}/compartir/fotos`, pedido)
  const leidas = await leerJson(respuesta, esquemaDeLasFotos, NO_SE_LEYERON_LAS_FOTOS)
  return leidas.ok ? ok(leidas.data.fotos) : leidas
}

// La imagen de la tarjeta (WebP) para quien comparte: con la caché del navegador, que revalida con su ETag (un 304 barato si no cambió). `sinMoneda`: la variante
// sin moneda (`?sin-moneda=1`), la que el panel muestra con el Modo Live (nunca la que se comparte).
export async function pedirLaImagenParaCompartir(
  id: string,
  senal?: AbortSignal,
  { sinMoneda = false }: { sinMoneda?: boolean } = {},
) {
  const pedido = { tipo: IMAGEN, cache: 'default', alFallar: NO_SE_ARMO_LA_IMAGEN, senal } as const
  return leerBlob(await pedir(rutaDeLaImagen(id, { sinMoneda }), pedido), NO_SE_ARMO_LA_IMAGEN)
}

// Una foto a tamaño completo, del bucket público (otro origen): un `fetch` (nunca un `<img>`) para tener los bytes que se comparten.
export async function pedirLaFoto(url: string, senal?: AbortSignal): Promise<Resultado<Blob>> {
  const pedido = {
    tipo: IMAGEN,
    cache: 'default',
    alFallar: 'No se pudo bajar la foto.',
    senal,
  } as const
  return leerBlob(await pedir(url, pedido), 'No se pudo bajar la foto.')
}

// Las dos imágenes de la tarjeta de las cotizaciones hermanas apiladas en una sola imagen PNG (glosario: «Cotizaciones hermanas»), una bajo la otra y al ancho de la más ancha,
// sobre blanco. En el navegador, sin pedir nada nuevo al servidor.
export async function apilarImagenes(arriba: Blob, abajo: Blob): Promise<Blob> {
  const [a, b] = await Promise.all([createImageBitmap(arriba), createImageBitmap(abajo)])
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(a.width, b.width)
  lienzo.height = a.height + b.height
  const pintor = lienzo.getContext('2d')
  if (pintor === null) throw new Error('Sin lienzo para apilar las imágenes.')
  pintor.fillStyle = '#ffffff'
  pintor.fillRect(0, 0, lienzo.width, lienzo.height)
  pintor.drawImage(a, 0, 0)
  pintor.drawImage(b, 0, a.height)
  a.close()
  b.close()
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob((png) => {
      if (png === null) rechazar(new Error('No se pudo armar la imagen.'))
      else resolver(png)
    }, 'image/png')
  })
}
