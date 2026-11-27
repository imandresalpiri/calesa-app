import type { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import type { Node as NodoDePm } from '@tiptap/pm/model'
import { MAXIMO_DE_IMAGENES_DE_LA_GALERIA } from '../../../../entities/contenido/doc'
import type { ClaveDeBloque } from '../../../../entities/contenido/bloques-de-la-guia'
import { destinoAlMover } from '../../../../entities/contenido/bloques-de-la-guia'

// Lo que se le hace a los bloques del primer nivel de la guía. Un bloque se nombra por su posición en el documento (`posDelBloque`).

export function posDelBloque(doc: NodoDePm, indice: number): number {
  let pos = 0
  for (let n = 0; n < indice && n < doc.childCount; n += 1) {
    pos += doc.child(n).nodeSize
  }
  return pos
}

export function indiceDelBloque(editor: Editor): number {
  return editor.state.selection.$from.index(0)
}

export function moverBloque(editor: Editor, indice: number, direccion: 'subir' | 'bajar'): boolean {
  const { doc, tr } = editor.state
  const destino = destinoAlMover(doc.childCount, indice, direccion)
  if (destino === null) {
    return false
  }
  const nodo = doc.child(indice)
  const inicio = posDelBloque(doc, indice)
  tr.delete(inicio, inicio + nodo.nodeSize)
  const nuevo = posDelBloque(tr.doc, destino)
  tr.insert(nuevo, nodo)
  tr.setSelection(TextSelection.near(tr.doc.resolve(nuevo + 1)))
  editor.view.dispatch(tr.scrollIntoView())
  editor.view.focus()
  return true
}

export function quitarBloque(editor: Editor, indice: number): void {
  const { doc, tr, schema } = editor.state
  if (indice < 0 || indice >= doc.childCount) {
    return
  }
  const inicio = posDelBloque(doc, indice)
  const fin = inicio + doc.child(indice).nodeSize
  if (doc.childCount === 1) {
    tr.replaceWith(inicio, fin, schema.nodes['paragraph']?.create() ?? doc.child(0))
  } else {
    tr.delete(inicio, fin)
  }
  const cerca = Math.min(inicio, tr.doc.content.size)
  tr.setSelection(TextSelection.near(tr.doc.resolve(cerca), -1))
  editor.view.dispatch(tr.scrollIntoView())
  editor.view.focus()
}

export function cambiarAtributos(
  editor: Editor,
  indice: number,
  atributos: Record<string, unknown>,
): void {
  const { doc, tr } = editor.state
  const nodo = indice >= 0 && indice < doc.childCount ? doc.child(indice) : null
  if (nodo === null) {
    return
  }
  tr.setNodeMarkup(posDelBloque(doc, indice), undefined, { ...nodo.attrs, ...atributos })
  editor.view.dispatch(tr)
}

// Busca el bloque cuya subida en curso es `grupo`; `null` si ya no está (se quitó mientras subía).
function bloqueDeLaSubida(
  editor: Editor,
  grupo: string,
): { indice: number; nodo: NodoDePm } | null {
  const { doc } = editor.state
  for (let n = 0; n < doc.childCount; n += 1) {
    const nodo = doc.child(n)
    if (nodo.attrs['subida'] === grupo) {
      return { indice: n, nodo }
    }
  }
  return null
}

export function ponerRutaDeLaSubida(editor: Editor, grupo: string, ruta: string): void {
  const bloque = bloqueDeLaSubida(editor, grupo)
  if (bloque) {
    cambiarAtributos(editor, bloque.indice, { ruta, subida: null })
  }
}

export function quitarPorSubida(editor: Editor, grupo: string): void {
  const bloque = bloqueDeLaSubida(editor, grupo)
  if (bloque) {
    quitarBloque(editor, bloque.indice)
  }
}

type FotoDeGaleria = { ruta: string; alt: string }

export function fotosDeLaGaleria(nodo: NodoDePm): FotoDeGaleria[] {
  const lista: unknown = nodo.attrs['imagenes']
  return Array.isArray(lista) ? (lista as FotoDeGaleria[]) : []
}

// Suma una foto a la galería de esa subida (hasta el tope); las que sobran se descartan.
export function agregarFotoALaGaleria(editor: Editor, grupo: string, ruta: string): void {
  const bloque = bloqueDeLaSubida(editor, grupo)
  if (bloque) {
    const fotos = fotosDeLaGaleria(bloque.nodo)
    if (fotos.length < MAXIMO_DE_IMAGENES_DE_LA_GALERIA) {
      cambiarAtributos(editor, bloque.indice, { imagenes: [...fotos, { ruta, alt: '' }] })
    }
  }
}

// Borra lo escrito después de «/» en el párrafo donde está el cursor (el texto que buscaba el bloque).
function borrarLoEscrito(editor: Editor): void {
  const { $from } = editor.state.selection
  if ($from.parent.type.name === 'paragraph' && $from.parent.textContent.startsWith('/')) {
    editor
      .chain()
      .command(({ tr }) => {
        tr.delete($from.start(), $from.end())
        return true
      })
      .run()
  }
}

export type ArchivosElegidos = { grupo: string; archivos: File[] }

const TEXTOS: Partial<Record<ClaveDeBloque, (e: Editor) => boolean>> = {
  parrafo: () => true,
  'titulo-grande': (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  'titulo-chico': (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  lista: (e) => e.chain().focus().toggleBulletList().run(),
  'lista-numerada': (e) => e.chain().focus().toggleOrderedList().run(),
  cita: (e) => e.chain().focus().toggleBlockquote().run(),
}

// Pone el bloque elegido donde está el cursor (el párrafo vacío, o el que decía «/…»). Imagen y galería reciben los archivos ya elegidos.
export function insertarBloque(
  editor: Editor,
  clave: ClaveDeBloque,
  elegidos: ArchivosElegidos | null,
): void {
  borrarLoEscrito(editor)
  const texto = TEXTOS[clave]
  if (texto) {
    texto(editor)
    return
  }
  const contenido = {
    separador: { type: 'horizontalRule' },
    boton: { type: 'button', attrs: { texto: 'Ver más', href: '' } },
    video: { type: 'video', attrs: { url: '' } },
    imagen: { type: 'image', attrs: { ruta: null, alt: '', subida: elegidos?.grupo ?? null } },
    galeria: { type: 'gallery', attrs: { imagenes: [], subida: elegidos?.grupo ?? null } },
  }[clave as 'separador' | 'boton' | 'video' | 'imagen' | 'galeria']
  editor.chain().focus().insertContent(contenido).run()
  dejarUnParrafoAlFinal(editor)
  if (clave === 'separador') {
    editor.commands.focus('end')
  }
}

// Un bloque que no es texto no puede ser el último: detrás queda un párrafo vacío donde seguir escribiendo (la elección no se mueve).
function dejarUnParrafoAlFinal(editor: Editor): void {
  const ultimo = editor.state.doc.lastChild
  const parrafo = editor.schema.nodes['paragraph']
  if (!ultimo || ultimo.isTextblock || !parrafo) {
    return
  }
  editor
    .chain()
    .command(({ tr }) => {
      tr.insert(tr.doc.content.size, parrafo.create())
      return true
    })
    .run()
}
