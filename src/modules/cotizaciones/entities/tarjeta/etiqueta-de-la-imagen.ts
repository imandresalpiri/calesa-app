// La ETag de la imagen de la tarjeta (`GET /cotizaciones/<id>/imagen`, `docs/COTIZADOR.md` › «La imagen de la tarjeta»): la huella de lo que dibuja para quien la
// pide (`cotizacion_imagen_huella()`), quien la pide, la versión del dibujo, el ancho y la variante sin moneda. Sin I/O.
import type { AnchoDeLaImagen } from '../ruta-de-la-hoja'

// La versión del dibujo: se sube cuando cambia cómo se dibuja la imagen (`infra/tarjeta/imagen/`, `geometriaDeLaTarjeta()`, `webp-de-la-tarjeta.ts`,
// `logo-de-la-tarjeta.ts`), y la imagen que el navegador guardó deja de valer.
export const VERSION_DEL_DIBUJO = 5

// Una ETag fuerte: los mismos bytes para la misma huella, persona, versión, ancho (`g`, la grande) y variante (`.s`, la del Modo Live, sin moneda: nunca un 304 de
// la otra). La huella ya es de quien pide; su id va igual, por si dos personas comparten navegador.
export const etiquetaDeLaImagen = ({
  huella,
  usuarioId,
  ancho,
  sinMoneda = false,
}: {
  huella: string
  usuarioId: string
  ancho: AnchoDeLaImagen | null
  sinMoneda?: boolean
}): string =>
  `"${huella}.${usuarioId}.v${String(VERSION_DEL_DIBUJO)}.${ancho === null ? 'g' : String(ancho)}${sinMoneda ? '.s' : ''}"`

// Si `If-None-Match` nombra esta etiqueta: acepta la forma débil (`W/"…"`), una lista separada por comas y `*`.
export function coincideLaEtiqueta(siNoneMatch: string | null, etiqueta: string): boolean {
  if (siNoneMatch === null || siNoneMatch.trim() === '') {
    return false
  }
  return siNoneMatch.split(',').some((parte) => {
    const limpia = parte.trim()
    return limpia === '*' || limpia.replace(/^W\//, '') === etiqueta
  })
}
