// Los bytes de cada imagen de un arte para su PDF, leídos con la sesión de quien pide y su lector, nunca pidiéndose la app a sí misma por HTTP ni
// con una URL del documento: cada `src` (el que pone `fuenteDeLaCapa()` con los datos que la ruta volvió a leer) dice qué es
// (`deDondeSaleLaImagen()`). La biblioteca y el logo, por su lector de `artes`; una foto, sólo del vehículo elegido y por su ruta en la galería;
// la tarjeta, sólo de la cotización elegida, armada como la que ve el lienzo; las de ejemplo, de `public/artes/ejemplo/`. Cada `src` se lee una
// vez, 4 a la vez, con 4 s y 10 MB por imagen (la tarjeta no se baja, se arma: espera lo que el lienzo a sus imágenes). Lo que no llega no está
// en el mapa: el PDF sale sin ella y la cuenta.
import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  archivoDeLaImagenDeArte,
  archivoDelLogoDeArte,
  deDondeSaleLaImagen,
  type ImagenDelPdf,
} from '@/modules/artes'
import { armarLaImagen } from '@/modules/cotizaciones'
import { bajarLaFoto } from '../../artes/_medios'
import { contextoDeQuienMira } from '../../cotizaciones/contexto-de-quien-mira'
import type { QuienNombraAlCliente } from '../../cotizaciones/datos-de-la-tarjeta'
import { bytesConTope, conEspera, deAPocas } from './bajar-con-tope'

const A_LA_VEZ = 4
const ESPERA_MS = 4000
const ESPERA_DE_LA_TARJETA_MS = 10_000
const PESO_MAXIMO = 10 * 1024 * 1024
const CARPETA_DEL_EJEMPLO = path.join(process.cwd(), 'public', 'artes', 'ejemplo')

type FotoDeLaGaleria = { id: string; ruta: string; rutaMiniatura: string }
type LogoConArchivo = { id: string; ruta: string; tipo: 'svg' | 'png' | 'webp' | 'jpg' | null }

// De dónde puede salir cada imagen: el vehículo y la cotización que la ruta volvió a leer (nulos, ninguno) y los logos de la empresa con archivo.
export type DeDondeSalen = {
  quien: QuienNombraAlCliente
  vehiculoId: string | null
  fotos: readonly FotoDeLaGaleria[]
  cotizacionId: string | null
  logos: readonly LogoConArchivo[]
}

const deUnBlob = async (blob: Blob) =>
  blob.size > PESO_MAXIMO ? null : new Uint8Array(await blob.arrayBuffer())

async function deLaBiblioteca(id: string) {
  const archivo = await archivoDeLaImagenDeArte(id)
  return archivo.ok && archivo.data ? deUnBlob(archivo.data.cuerpo) : null
}

async function delLogo(variante: string, de: DeDondeSalen) {
  const logo = de.logos.find((l) => l.id === variante)
  if (!logo?.tipo) {
    return null
  }
  const archivo = await archivoDelLogoDeArte(logo.ruta, logo.tipo)
  return archivo.ok && archivo.data ? deUnBlob(archivo.data.cuerpo) : null
}

async function deLaFoto(imagen: Extract<ImagenDelPdf, { tipo: 'foto' }>, de: DeDondeSalen) {
  const foto =
    imagen.vehiculoId === de.vehiculoId ? de.fotos.find((f) => f.id === imagen.fotoId) : undefined
  if (!foto) {
    return null
  }
  const bajada = await bajarLaFoto(imagen.lado === 1600 ? foto.ruta : foto.rutaMiniatura)
  return bajada.ok ? bytesConTope(bajada.cuerpo, PESO_MAXIMO) : null
}

async function deLaTarjeta(imagen: Extract<ImagenDelPdf, { tipo: 'tarjeta' }>, de: DeDondeSalen) {
  if (imagen.cotizacionId !== de.cotizacionId) {
    return null
  }
  const armada = await armarLaImagen(imagen.cotizacionId, {
    contextoDe: (hoja) => contextoDeQuienMira(de.quien, hoja.cotizacion),
    ancho: null,
    sinMoneda: imagen.sinMoneda,
  })
  return armada.ok ? armada.data.bytes : null
}

const delEjemplo = async (archivo: string) =>
  new Uint8Array(await readFile(path.join(CARPETA_DEL_EJEMPLO, path.basename(archivo))))

function leer(imagen: ImagenDelPdf, de: DeDondeSalen): Promise<Uint8Array | null> {
  switch (imagen.tipo) {
    case 'biblioteca':
      return conEspera(deLaBiblioteca(imagen.id), ESPERA_MS)
    case 'logo':
      return conEspera(delLogo(imagen.variante, de), ESPERA_MS)
    case 'foto':
      return conEspera(deLaFoto(imagen, de), ESPERA_MS)
    case 'tarjeta':
      return conEspera(deLaTarjeta(imagen, de), ESPERA_DE_LA_TARJETA_MS)
    case 'ejemplo':
      return conEspera(delEjemplo(imagen.archivo), ESPERA_MS)
  }
}

export async function imagenesParaElPdf(
  srcs: readonly string[],
  de: DeDondeSalen,
): Promise<Map<string, Uint8Array>> {
  const leidas = await deAPocas([...new Set(srcs)], A_LA_VEZ, async (src) => {
    const imagen = deDondeSaleLaImagen(src)
    return [src, imagen ? await leer(imagen, de) : null] as const
  })
  return new Map(leidas.flatMap(([src, bytes]) => (bytes ? [[src, bytes] as const] : [])))
}
