// Cuánto texto lleva una página del PDF de un arte. Cada línea es un `<Text>` de react-pdf y una caja más angosta que una letra va de a un
// grafema por línea (`disposicionDelTexto()`): sin tope, un documento válido sería cientos de miles de líneas que el servidor no termina de
// dibujar. Ninguna página que se lee llega: un A4 con letra de 6 pt en tres columnas son unas 350. Puro.
import type { PaginaDelPdf } from './primitivas-del-pdf'

export const MAXIMO_DE_LINEAS_POR_PAGINA = 500

export const MENSAJE_DEMASIADAS_LINEAS = `Una página de un PDF lleva hasta ${String(MAXIMO_DE_LINEAS_POR_PAGINA)} líneas de texto. Ensancha las cajas de texto o reparte el texto en más páginas.`

export function lineasDeLaPagina(pagina: PaginaDelPdf): number {
  return pagina.primitivas.reduce(
    (suma, primitiva) => suma + (primitiva.tipo === 'texto' ? primitiva.lineas.length : 0),
    0,
  )
}

export const pasaDelTope = (pagina: PaginaDelPdf): boolean =>
  lineasDeLaPagina(pagina) > MAXIMO_DE_LINEAS_POR_PAGINA
