'use client'

import { pngDesde } from '@/shared/lib/compartir'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  apilarImagenes,
  pedirLaImagenParaCompartir,
  pedirLasFotos,
  pedirLosDatos,
} from '../../../areas/tarjeta/composicion-compartir.client'
import type { DatosParaCompartir } from '../../../entities/tarjeta/compartir/datos-para-compartir'
import { useParteDeCompartir } from './use-parte-de-compartir'

// La imagen de la tarjeta lista para compartir: la URL del blob para mostrarla y el PNG que piden el portapapeles y el menú del sistema (armado antes del toque).
export type ImagenDeLaTarjetaParaCompartir = { url: string; png: Blob }

const NO_SE_ARMO = 'No se pudo armar la imagen.'

async function leerLaImagen(
  id: string,
  senal: AbortSignal,
): Promise<Resultado<ImagenDeLaTarjetaParaCompartir>> {
  const webp = await pedirLaImagenParaCompartir(id, senal)
  if (!webp.ok) {
    return webp
  }
  try {
    const png = await pngDesde(webp.data)
    return ok({ url: URL.createObjectURL(webp.data), png })
  } catch {
    return fallo('inesperado', NO_SE_ARMO)
  }
}

// La vista sin moneda que el panel muestra con el Modo Live (sólo se mira: no hace falta el PNG): la URL del blob, de una o de las dos hermanas apiladas.
export type VistaSinMoneda = { url: string }

async function leerLaVista(
  ids: readonly string[],
  senal: AbortSignal,
): Promise<Resultado<VistaSinMoneda>> {
  const webps = await Promise.all(
    ids.map((id) => pedirLaImagenParaCompartir(id, senal, { sinMoneda: true })),
  )
  const [a, b] = webps
  if (!a?.ok) return a ?? fallo('inesperado', NO_SE_ARMO)
  if (b !== undefined && !b.ok) return b
  try {
    const blob = b === undefined ? a.data : await apilarImagenes(a.data, b.data)
    return ok({ url: URL.createObjectURL(blob) })
  } catch {
    return fallo('inesperado', NO_SE_ARMO)
  }
}

// Las dos imágenes de las hermanas, apiladas en el orden de las opciones (glosario: «Cotizaciones hermanas»): si una no llega, ninguna (no se ofrece una sola a medias).
async function leerLasDosImagenes(
  versiones: NonNullable<DatosParaCompartir['versiones']>,
  senal: AbortSignal,
): Promise<Resultado<ImagenDeLaTarjetaParaCompartir>> {
  const [a, b] = await Promise.all(
    versiones.map((v) => pedirLaImagenParaCompartir(v.cotizacionId, senal)),
  )
  if (!a?.ok) return a ?? fallo('inesperado', NO_SE_ARMO)
  if (!b?.ok) return b ?? fallo('inesperado', NO_SE_ARMO)
  try {
    const png = await apilarImagenes(a.data, b.data)
    return ok({ url: URL.createObjectURL(png), png })
  } catch {
    return fallo('inesperado', NO_SE_ARMO)
  }
}

const soltarLaImagen = (imagen: { url: string }) => {
  URL.revokeObjectURL(imagen.url)
}

// La vista sin moneda, con el Modo Live: va a la par de los datos, como la propia; si resultan hermanas, se pide la de las dos (la clave cambia).
function useVistaSinMoneda(id: string, versiones: DatosParaCompartir['versiones'], pedir: boolean) {
  const ids = versiones ? versiones.map((v) => v.cotizacionId) : [id]
  return useParteDeCompartir(
    (senal) => leerLaVista(ids, senal),
    pedir ? `sin:${ids.join(':')}` : null,
    soltarLaImagen,
  )
}

// Lo que el panel «Compartir la cotización» pide, cada parte por su lado (si una falla, las otras siguen): los datos del texto y la imagen de la tarjeta, una vez por apertura
// mientras `activo` (un id válido), la lista de fotos sólo cuando se eligen («Fotos») y, con el Modo Live (`live`), la vista sin moneda: lo que se ve en el panel. La
// imagen con moneda se pide igual: es la que se copia y se comparte, armada antes del toque (Safari no copia tras un `await`).
export function useParaCompartirLaCotizacion(
  id: string,
  { activo, conFotos, live }: { activo: boolean; conFotos: boolean; live: boolean },
) {
  const datos = useParteDeCompartir((senal) => pedirLosDatos(id, senal), activo ? id : null)
  // La imagen va a la par de los datos (es lo que más tarda); las fotos, sólo con acceso y al elegirlas.
  const propia = useParteDeCompartir(
    (senal) => leerLaImagen(id, senal),
    activo ? id : null,
    soltarLaImagen,
  )
  const versiones = datos.parte.estado === 'listo' ? datos.parte.dato.versiones : undefined
  const apilada = useParteDeCompartir(
    (senal) =>
      versiones
        ? leerLasDosImagenes(versiones, senal)
        : Promise.resolve(fallo('inesperado', NO_SE_ARMO)),
    activo && versiones ? `${id}:par` : null,
    soltarLaImagen,
  )
  const imagen = versiones ? apilada : propia
  const vistaSinMoneda = useVistaSinMoneda(id, versiones, activo && live)
  const fotos = useParteDeCompartir(
    (senal) => pedirLasFotos(id, senal),
    activo && conFotos && datos.parte.estado === 'listo' ? id : null,
  )
  return { datos, imagen, vistaSinMoneda, fotos }
}
