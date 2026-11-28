// De dónde sale lo que dibuja una capa con imagen en el lienzo, siempre del mismo origen (el lienzo no queda «teñido» y exportar no falla): la
// biblioteca por `/artes/imagenes/<id>`, el logo por `/artes/logos/<variante>`, y las fotos del vehículo y la tarjeta de la cotización, los
// datos de ejemplo de `public/artes/ejemplo/`. Las medidas, si se saben: un SVG sin medidas no se dibuja en Firefox, y quien lo carga le pone
// éstas (o las de la capa). Puro.
import type { CapaConImagen } from '../documento'
import type { Medidas } from '../formatos'
import { rutaDeLaImagenDelLienzo, rutaDelLogoDelLienzo } from '../medios'
import type { LogoDelEditor } from '../tipos'
import { fotoDeEjemplo, TARJETA_DE_EJEMPLO } from './datos-de-ejemplo'

export type FuenteDeImagen = { src: string; medidas: Medidas | null }

const ID_DEL_LOGO_PRINCIPAL = 'principal'

function medidasDelLogo(logos: readonly LogoDelEditor[], id: string): Medidas | null {
  const logo = logos.find((l) => l.id === id)
  return logo?.ancho && logo.alto ? { ancho: logo.ancho, alto: logo.alto } : null
}

export function fuenteDeLaCapa(
  capa: CapaConImagen,
  logos: readonly LogoDelEditor[],
): FuenteDeImagen {
  switch (capa.tipo) {
    case 'imagen':
      return { src: rutaDeLaImagenDelLienzo(capa.imagenId), medidas: null }
    case 'logo':
      return {
        src: rutaDelLogoDelLienzo(capa.varianteId),
        medidas: medidasDelLogo(logos, capa.varianteId ?? ID_DEL_LOGO_PRINCIPAL),
      }
    case 'foto': {
      const foto = fotoDeEjemplo(capa.indice)
      return { src: foto.src, medidas: { ancho: foto.ancho, alto: foto.alto } }
    }
    case 'tarjeta':
      return {
        src: TARJETA_DE_EJEMPLO.src,
        medidas: { ancho: TARJETA_DE_EJEMPLO.ancho, alto: TARJETA_DE_EJEMPLO.alto },
      }
  }
}
