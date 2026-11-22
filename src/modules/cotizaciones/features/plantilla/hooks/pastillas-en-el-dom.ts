// El campo del texto con datos en el DOM (glosario: «Texto con datos», «Pastilla»): leer las partes de lo que hay en el `contentEditable`, dibujarlas (cada dato,
// un `<span contenteditable="false" data-parte>`) y pasar el cursor entre el DOM y las unidades del modelo (`entities/plantilla/edicion/texto-con-datos.ts`:
// cada unidad de UTF-16, 1; cada pastilla, 1). Un `<br data-relleno>` final deja ver un salto de línea al final y no cuenta.
import type { DatoDeLaCelda, ParteDelTexto } from '../../../entities/cuadricula-de-la-tarjeta'
import { datoQueYaNoEsta } from '../../../entities/plantilla/edicion/condiciones'
import { nombreDeLaPastilla } from '../../../entities/plantilla/edicion/datos-para-elegir'
import { nombreDelDato } from '../../../entities/plantilla/edicion/frases-de-las-condiciones'
import { esDeTodos } from '../../../entities/plantilla/nodos-de-plantilla'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'

export type Cursor = { readonly desde: number; readonly hasta: number }

const CLASE_DE_LA_PASTILLA =
  'mx-0.5 inline-block rounded-(--radius-sm) border border-(--color-primario) bg-(--color-primario-soft) px-1 align-baseline text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink) select-all data-[restringido]:border-(--color-aviso-ink) data-[restringido]:bg-(--color-aviso-soft)'

const esPastilla = (n: Node): n is HTMLElement =>
  n instanceof HTMLElement && n.dataset['parte'] !== undefined
const esRelleno = (n: Node): boolean =>
  n instanceof HTMLElement && n.dataset['relleno'] !== undefined

// Lo que vale cada hijo en unidades: un texto, su largo; una pastilla, 1; un `<br>` (el relleno o el de un campo vacío que pone el navegador), 0: Enter escribe un
// `\n` en el texto.
function unidadesDe(n: Node): number {
  if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? '').length
  if (esPastilla(n)) return 1
  if (n.nodeName === 'BR') return 0
  return (n.textContent ?? '').length
}

// Las partes que dice el DOM: cada texto y cada pastilla (su dato, por el índice con que se dibujó); un bloque que haya puesto el navegador, en su línea. Sin
// normalizar.
export function leerPartes(
  raiz: HTMLElement,
  dibujadas: readonly ParteDelTexto[],
): ParteDelTexto[] {
  const partes: ParteDelTexto[] = []
  for (const n of raiz.childNodes) {
    if (esPastilla(n)) {
      const dato = dibujadas[Number(n.dataset['parte'])]
      if (dato !== undefined && typeof dato !== 'string') partes.push(dato)
    } else if (n.nodeType === Node.TEXT_NODE) partes.push(n.textContent ?? '')
    else if (n.nodeName === 'BR') continue
    else partes.push(`\n${n.textContent ?? ''}`)
  }
  return partes
}

function avisoDelDato(d: DatoDeLaCelda, contexto: ContextoDePlantilla): string | null {
  if (datoQueYaNoEsta(d, contexto)) return 'ya no está en la fórmula'
  if ('nodo' in d && !esDeTodos(contexto.visibilidad ?? {}, d.nodo)) return 'restringido'
  return null
}

function pastilla(d: DatoDeLaCelda, i: number, contexto: ContextoDePlantilla): HTMLElement {
  const span = document.createElement('span')
  span.contentEditable = 'false'
  span.dataset['parte'] = String(i)
  span.className = CLASE_DE_LA_PASTILLA
  const aviso = avisoDelDato(d, contexto)
  if (aviso !== null) span.dataset['restringido'] = ''
  span.setAttribute(
    'aria-label',
    `Dato: ${nombreDelDato(d, contexto)}${aviso === null ? '' : `, ${aviso}`}`,
  )
  span.textContent = nombreDeLaPastilla(d, contexto)
  return span
}

export function dibujar(
  raiz: HTMLElement,
  partes: readonly ParteDelTexto[],
  contexto: ContextoDePlantilla,
): void {
  const hijos: Node[] = partes.map((p, i) =>
    typeof p === 'string' ? document.createTextNode(p) : pastilla(p, i, contexto),
  )
  const ultima = partes.at(-1)
  if (typeof ultima === 'string' && ultima.endsWith('\n')) {
    const br = document.createElement('br')
    br.dataset['relleno'] = ''
    hijos.push(br)
  }
  raiz.replaceChildren(...hijos)
}

// Un punto del DOM (nodo y desplazamiento) en unidades; nulo si está fuera del campo.
function unidadesHasta(raiz: HTMLElement, nodo: Node, desplazamiento: number): number | null {
  if (nodo === raiz) {
    let suma = 0
    for (const n of [...raiz.childNodes].slice(0, desplazamiento)) suma += unidadesDe(n)
    return suma
  }
  let hijo: Node | null = nodo
  while (hijo !== null && hijo.parentNode !== raiz) hijo = hijo.parentNode
  if (hijo === null) return null
  let suma = 0
  for (const n of raiz.childNodes) {
    if (n === hijo) break
    suma += unidadesDe(n)
  }
  // Dentro de un texto, su desplazamiento; dentro de una pastilla (no debería), antes de ella.
  return hijo === nodo && nodo.nodeType === Node.TEXT_NODE ? suma + desplazamiento : suma
}

// Las unidades antes de un hijo del campo (una pastilla).
export function unidadesAntesDe(raiz: HTMLElement, hijo: Node): number {
  let suma = 0
  for (const n of raiz.childNodes) {
    if (n === hijo) break
    suma += unidadesDe(n)
  }
  return suma
}

export function cursorEnUnidades(raiz: HTMLElement): Cursor | null {
  const sel = raiz.ownerDocument.getSelection()
  if (sel === null || sel.rangeCount === 0) return null
  const r = sel.getRangeAt(0)
  const desde = unidadesHasta(raiz, r.startContainer, r.startOffset)
  const hasta = unidadesHasta(raiz, r.endContainer, r.endOffset)
  return desde === null || hasta === null ? null : { desde, hasta }
}

// Pone el cursor en la unidad `pos` (al final si se pasa).
export function ponerCursor(raiz: HTMLElement, pos: number): void {
  const sel = raiz.ownerDocument.getSelection()
  if (sel === null) return
  const r = raiz.ownerDocument.createRange()
  let resto = pos
  let puesto = false
  for (const n of raiz.childNodes) {
    if (esRelleno(n)) break
    const largo = unidadesDe(n)
    if (n.nodeType === Node.TEXT_NODE && resto <= largo) {
      r.setStart(n, resto)
      puesto = true
      break
    }
    if (n.nodeType !== Node.TEXT_NODE && resto === 0) {
      r.setStartBefore(n)
      puesto = true
      break
    }
    resto -= largo
  }
  if (!puesto) {
    const relleno = [...raiz.childNodes].find(esRelleno)
    if (relleno === undefined) r.setStart(raiz, raiz.childNodes.length)
    else r.setStartBefore(relleno)
  }
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
}
