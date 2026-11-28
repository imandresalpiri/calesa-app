// De dónde sale lo que dibuja una capa con imagen en el lienzo, siempre del mismo origen (el lienzo no queda «teñido» y exportar no falla): la
// biblioteca por `/artes/imagenes/<id>`, el logo por `/artes/logos/<variante>`, la foto N del vehículo de ejemplo por
// `/artes/fotos/<vehiculo>/<foto>` y la tarjeta de su cotización por `/cotizaciones/<id>/imagen` (sin la moneda con el Modo Live); con los
// datos de ejemplo, las de `public/artes/ejemplo/`. `null` = no hay de dónde (la foto N que el vehículo no tiene, la tarjeta sin cotización,
// el logo sin esa variante, o una ruta que no es del mismo origen): la capa se esconde. Las medidas, si se saben: un SVG sin medidas no se
// dibuja en Firefox, y quien lo carga le pone éstas (o las de la capa). Puro.
import type { DatosDelArte } from '../datos/tipos'
import type { CapaConImagen } from '../documento'
import type { Medidas } from '../formatos'
import { rutaDeLaFotoDelLienzo, rutaDeLaImagenDelLienzo, rutaDelLogoDelLienzo } from '../medios'
import type { LogoDelEditor } from '../tipos'
import { fotoDeEjemplo, TARJETA_DE_EJEMPLO } from './datos-de-ejemplo'

export type FuenteDeImagen = { src: string; medidas: Medidas | null }

export type ConQueSeDibuja = {
  logos: readonly LogoDelEditor[]
  datos: Pick<DatosDelArte, 'deEjemplo' | 'vehiculo' | 'cotizacion'>
  sinMoneda: boolean
}

export const ID_DEL_LOGO_PRINCIPAL = 'principal'

// Lo único que el lienzo carga: rutas propias por id y los SVG de ejemplo. Nunca una URL de otro origen (Storage, apibara).
const DEL_MISMO_ORIGEN = [
  /^\/artes\/(imagenes|logos)\/[\w.%-]+$/,
  /^\/artes\/fotos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\?ancho=(480|1600)$/i,
  /^\/cotizaciones\/[0-9a-f-]{36}\/imagen(\?sin-moneda=1)?$/i,
  /^\/artes\/ejemplo\/[a-z0-9-]+\.svg$/,
]

export function esDelMismoOrigen(src: string): boolean {
  return DEL_MISMO_ORIGEN.some((patron) => patron.test(src))
}

function delLogo(logos: readonly LogoDelEditor[], id: string): FuenteDeImagen | null {
  const logo = logos.find((l) => l.id === id)
  if (!logo) {
    return null
  }
  return {
    src: rutaDelLogoDelLienzo(id),
    medidas: logo.ancho && logo.alto ? { ancho: logo.ancho, alto: logo.alto } : null,
  }
}

function deLaFoto(indice: number, datos: ConQueSeDibuja['datos']): FuenteDeImagen | null {
  if (datos.deEjemplo) {
    const foto = fotoDeEjemplo(indice)
    return { src: foto.src, medidas: { ancho: foto.ancho, alto: foto.alto } }
  }
  const foto = datos.vehiculo?.fotos[indice]
  if (!datos.vehiculo || !foto) {
    return null
  }
  return {
    src: rutaDeLaFotoDelLienzo(datos.vehiculo.id, foto.id, 1600),
    medidas: { ancho: foto.ancho, alto: foto.alto },
  }
}

function deLaTarjeta({ datos, sinMoneda }: ConQueSeDibuja): FuenteDeImagen | null {
  if (datos.deEjemplo) {
    return {
      src: TARJETA_DE_EJEMPLO.src,
      medidas: { ancho: TARJETA_DE_EJEMPLO.ancho, alto: TARJETA_DE_EJEMPLO.alto },
    }
  }
  const imagen = datos.cotizacion?.imagen
  return imagen ? { src: sinMoneda ? imagen.srcSinMoneda : imagen.src, medidas: null } : null
}

function sinGuardar(capa: CapaConImagen, con: ConQueSeDibuja): FuenteDeImagen | null {
  switch (capa.tipo) {
    case 'imagen':
      return { src: rutaDeLaImagenDelLienzo(capa.imagenId), medidas: null }
    case 'logo':
      return delLogo(con.logos, capa.varianteId ?? ID_DEL_LOGO_PRINCIPAL)
    case 'foto':
      return deLaFoto(capa.indice, con.datos)
    case 'tarjeta':
      return deLaTarjeta(con)
  }
}

export function fuenteDeLaCapa(capa: CapaConImagen, con: ConQueSeDibuja): FuenteDeImagen | null {
  const fuente = sinGuardar(capa, con)
  return fuente && esDelMismoOrigen(fuente.src) ? fuente : null
}
