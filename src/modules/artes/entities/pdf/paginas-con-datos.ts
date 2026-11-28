// Las páginas de un arte con unos datos, para su PDF: lo que resuelve cada una (`capasConDatos()`, la misma regla del lienzo) y las imágenes
// que pide el PDF entero, sin repetir, para que quien lo arma las lea antes de dibujarlo. Puro.
import { capasConDatos, type CapasConDatos, type ParaResolver } from '../datos/capas-con-datos'
import type { ValoresDelArte } from '../datos/valores-del-arte'
import type { DocumentoDeArte, PaginaDeArte } from '../documento'
import { imagenesDeLaPagina } from './geometria-del-pdf'

export type PaginaConDatos = { pagina: PaginaDeArte; conDatos: CapasConDatos }

export function paginasConDatos(
  documento: DocumentoDeArte,
  valores: ValoresDelArte,
  para: ParaResolver,
): PaginaConDatos[] {
  return documento.paginas.map((pagina) => ({
    pagina,
    conDatos: capasConDatos(pagina, valores, para),
  }))
}

export function imagenesDelPdf(paginas: readonly PaginaConDatos[]): string[] {
  return [...new Set(paginas.flatMap((p) => imagenesDeLaPagina(p.pagina, p.conDatos)))]
}
