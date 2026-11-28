// Las páginas de una plantilla de arte en el editor: agregar una en blanco, duplicar, mover y quitar, con sus topes y sus motivos, y lo que esas
// acciones hacen en el estado del editor (`reducirEditor` las llama). Un formato de imagen tiene una sola página; uno de PDF, de 1 a
// `MAXIMO_DE_PAGINAS`. Cada acción devuelve el mismo documento si no cambia nada (el reductor no anota un paso). Las capas de una página
// duplicada conservan sus ids: son únicos por página, no por documento. Puro.
import { MAXIMO_DE_PAGINAS, type DocumentoDeArte, type PaginaDeArte } from '../documento'
import type { Medidas, TipoDeArte } from '../formatos'
import { cambiarCapas } from './acciones-de-capas'
import type { EstadoDelEditor } from './estado'
import { anotar } from './historial'

export const MOTIVO_DEMASIADAS_PAGINAS = `Un PDF lleva hasta ${String(MAXIMO_DE_PAGINAS)} páginas.`
export const MOTIVO_UNA_PAGINA = 'Un PDF lleva al menos una página.'

// Hacia dónde se mueve una página: un lugar antes, uno después o a un índice (arrastrar).
export type HaciaDondeLaPagina = 'antes' | 'despues' | number

const FONDO_BLANCO = { tipo: 'color', color: '#ffffff' } as const

export function maximoDePaginas(tipo: TipoDeArte): number {
  return tipo === 'pdf' ? MAXIMO_DE_PAGINAS : 1
}

// «Página 2» para el índice 1.
export function nombreDeLaPagina(indice: number): string {
  return `Página ${String(indice + 1)}`
}

// El alto en px de la miniatura de una página en la tira; el ancho sale de la proporción del formato (Carta, 59; A4, 54): caja fija por formato.
export const ALTO_DE_LA_MINIATURA = 76

export function cajaDeLaMiniatura(medidas: Medidas): Medidas {
  const proporcion = medidas.alto > 0 ? medidas.ancho / medidas.alto : 1
  return { ancho: Math.round(ALTO_DE_LA_MINIATURA * proporcion), alto: ALTO_DE_LA_MINIATURA }
}

export function paginaEnBlanco(id: string): PaginaDeArte {
  return { id, fondo: FONDO_BLANCO, capas: [], grupos: [] }
}

function insertarDespues(
  documento: DocumentoDeArte,
  id: string,
  nueva: PaginaDeArte,
  maximo: number,
): DocumentoDeArte {
  const i = documento.paginas.findIndex((p) => p.id === id)
  const repetida = documento.paginas.some((p) => p.id === nueva.id)
  if (i < 0 || repetida || documento.paginas.length >= maximo) {
    return documento
  }
  const paginas = [...documento.paginas]
  paginas.splice(i + 1, 0, nueva)
  return { ...documento, paginas }
}

// Una página en blanco después de `id`.
export function agregarPagina(
  documento: DocumentoDeArte,
  id: string,
  nuevoId: string,
  maximo: number,
): DocumentoDeArte {
  return insertarDespues(documento, id, paginaEnBlanco(nuevoId), maximo)
}

// Una copia de `id` justo después, con el id nuevo.
export function duplicarPagina(
  documento: DocumentoDeArte,
  id: string,
  nuevoId: string,
  maximo: number,
): DocumentoDeArte {
  const original = documento.paginas.find((p) => p.id === id)
  return original ? insertarDespues(documento, id, { ...original, id: nuevoId }, maximo) : documento
}

export function moverPagina(
  documento: DocumentoDeArte,
  id: string,
  hacia: HaciaDondeLaPagina,
): DocumentoDeArte {
  const desde = documento.paginas.findIndex((p) => p.id === id)
  const pagina = documento.paginas[desde]
  if (!pagina) {
    return documento
  }
  const destino = hacia === 'antes' ? desde - 1 : hacia === 'despues' ? desde + 1 : hacia
  const hasta = Math.min(Math.max(destino, 0), documento.paginas.length - 1)
  if (hasta === desde) {
    return documento
  }
  const paginas = documento.paginas.filter((p) => p.id !== id)
  paginas.splice(hasta, 0, pagina)
  return { ...documento, paginas }
}

// Quita `id`; la única página no se quita.
export function quitarPagina(documento: DocumentoDeArte, id: string): DocumentoDeArte {
  if (documento.paginas.length <= 1 || !documento.paginas.some((p) => p.id === id)) {
    return documento
  }
  return { ...documento, paginas: documento.paginas.filter((p) => p.id !== id) }
}

// La página que queda en el lugar de `id` al quitarla: la siguiente, o la anterior si era la última.
export function paginaQueQuedaAlQuitar(documento: DocumentoDeArte, id: string): string | null {
  const i = documento.paginas.findIndex((p) => p.id === id)
  if (i < 0 || documento.paginas.length <= 1) {
    return null
  }
  const otra = documento.paginas[i + 1] ?? documento.paginas[i - 1]
  return otra?.id ?? null
}

// La página que se muestra tras pasar de `antes` a `despues` (deshacer o rehacer): la primera que cambió o apareció; si ninguna (se quitó o se
// movió una), la que se veía si sigue, y si no, la de antes que ella (deshacer «Agregar página» vuelve a donde se agregó).
export function paginaQueCambio(
  antes: DocumentoDeArte,
  despues: DocumentoDeArte,
  vista: string,
): string {
  const previas = new Map(antes.paginas.map((p) => [p.id, p]))
  const cambiada = despues.paginas.find((p) => previas.get(p.id) !== p)
  if (cambiada) {
    return cambiada.id
  }
  if (despues.paginas.some((p) => p.id === vista)) {
    return vista
  }
  const i = antes.paginas.findIndex((p) => p.id === vista)
  const vecina = despues.paginas[Math.min(Math.max(i - 1, 0), despues.paginas.length - 1)]
  return vecina?.id ?? vista
}

export type MotivosDeLaPagina = {
  agregar: string | null
  duplicar: string | null
  moverAntes: string | null
  moverDespues: string | null
  quitar: string | null
}

// Por qué no se puede cada acción sobre la página `indice` (nulo: se puede). En sólo lectura, todas con su motivo.
export function motivosDeLaPagina(
  total: number,
  indice: number,
  maximo: number,
  soloLectura: string | null,
): MotivosDeLaPagina {
  const lleno = total >= maximo ? MOTIVO_DEMASIADAS_PAGINAS : null
  return {
    agregar: soloLectura ?? lleno,
    duplicar: soloLectura ?? lleno,
    moverAntes: soloLectura ?? (indice <= 0 ? 'Ya es la primera página.' : null),
    moverDespues: soloLectura ?? (indice >= total - 1 ? 'Ya es la última página.' : null),
    quitar: soloLectura ?? (total <= 1 ? MOTIVO_UNA_PAGINA : null),
  }
}

// El documento con `pagina` en el índice `indice`.
export function conLaPagina(
  documento: DocumentoDeArte,
  indice: number,
  pagina: PaginaDeArte,
): DocumentoDeArte {
  return { ...documento, paginas: documento.paginas.with(indice, pagina) }
}

// En el estado: un cambio en las páginas (agregar, duplicar, mover, quitar) es un paso y deja elegida `paginaId`. En otra página no queda nada
// elegido; en la misma, lo elegido sigue (sus capas no cambiaron).
export function conPaginas(
  estado: EstadoDelEditor,
  documento: DocumentoDeArte,
  paginaId: string = estado.paginaId,
): EstadoDelEditor {
  if (documento === estado.documento) {
    return estado
  }
  const historial = anotar(estado.historial, estado.documento, null)
  const seleccion = paginaId === estado.paginaId ? estado.seleccion : []
  return { ...estado, documento, historial, paginaId, seleccion }
}

// Ir a otra página no es un paso: no cambia el documento. Corta la fusión (un campo tipeado en dos páginas son dos pasos) y suelta lo elegido.
export function irAPagina(estado: EstadoDelEditor, id: string): EstadoDelEditor {
  if (id === estado.paginaId || !estado.documento.paginas.some((p) => p.id === id)) {
    return estado
  }
  return {
    ...estado,
    paginaId: id,
    seleccion: [],
    historial: { ...estado.historial, fusion: null },
  }
}

// Quita la página; si era la elegida, queda elegida la de su lugar.
export function quitarLaPagina(estado: EstadoDelEditor, id: string): EstadoDelEditor {
  const queda = id === estado.paginaId ? paginaQueQuedaAlQuitar(estado.documento, id) : null
  return conPaginas(estado, quitarPagina(estado.documento, id), queda ?? estado.paginaId)
}

// El alto que el lienzo (o la miniatura de otra página) midió de un texto: no es un paso del historial.
export function medirTexto(
  estado: EstadoDelEditor,
  { paginaId, id, alto }: { paginaId: string; id: string; alto: number },
): EstadoDelEditor {
  const indice = estado.documento.paginas.findIndex((p) => p.id === paginaId)
  const antes = estado.documento.paginas[indice]
  if (!antes) {
    return estado
  }
  const pagina = cambiarCapas(antes, [id], (c) =>
    c.tipo === 'texto' && c.alto !== alto ? { ...c, alto } : c,
  )
  return pagina === antes
    ? estado
    : { ...estado, documento: conLaPagina(estado.documento, indice, pagina) }
}
