// La ETag de la imagen de la tarjeta (`GET /cotizaciones/<id>/imagen`, `docs/COTIZADOR.md` › «La imagen de la tarjeta»): la huella de lo que dibuja para quien la
// pide (`cotizacion_imagen_huella()`), quien la pide, la versión del dibujo y el ancho. Sin I/O.
import type { AnchoDeLaImagen } from '../ruta-de-la-hoja'

// La versión del dibujo: se sube cuando cambia cómo se dibuja la imagen (`infra/tarjeta/imagen/`, `geometriaDeLaTarjeta()`, `webp-de-la-tarjeta.ts`,
// `logo-de-la-tarjeta.ts`), y la imagen que el navegador guardó deja de valer.
export const VERSION_DEL_DIBUJO = 5

// Una ETag fuerte: los mismos bytes para la misma huella, persona, versión y ancho (`g`, la grande). La huella ya es de quien pide; su id va igual, por si dos
// personas comparten navegador.
export const etiquetaDeLaImagen = ({
  huella,
  usuarioId,
  ancho,
}: {
  huella: string
  usuarioId: string
  ancho: AnchoDeLaImagen | null
}): string =>
  `"${huella}.${usuarioId}.v${String(VERSION_DEL_DIBUJO)}.${ancho === null ? 'g' : String(ancho)}"`

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
