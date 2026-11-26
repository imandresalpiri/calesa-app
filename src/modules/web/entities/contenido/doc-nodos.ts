// Los nodos del documento del sitio: la lista blanca y el HTML de cada nodo, espejo de `_web_doc_nodo()` y `_web_doc_marcas()`. Las piezas
// están en `doc-primitivas.ts` y los bloques que no son texto en `doc-bloques.ts`. La entrada es `htmlDelDocumento()` de `doc.ts`.
import { boton, galeria, imagen, video } from './doc-bloques'
import {
  MOTIVO_DE_ENLACE,
  MOTIVO_DE_NIVELES,
  PROFUNDIDAD_MAXIMA,
  escaparHtml,
  esObjeto,
  hrefSeguro,
  rechazar,
  soloClaves,
} from './doc-primitivas'
import type { Crudo } from './doc-primitivas'

export * from './doc-primitivas'

const HIJOS: Record<string, readonly string[]> = {
  raiz: ['doc'],
  doc: [
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'image',
    'horizontalRule',
    'gallery',
    'button',
    'video',
  ],
  blockquote: ['paragraph', 'bulletList', 'orderedList'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  paragraph: ['text', 'hardBreak'],
  heading: ['text', 'hardBreak'],
}

const CLAVES: Record<string, readonly string[]> = {
  text: ['type', 'text', 'marks'],
  hardBreak: ['type', 'marks'],
  orderedList: ['type', 'content', 'attrs'],
  heading: ['type', 'content', 'attrs'],
  image: ['type', 'attrs'],
  gallery: ['type', 'attrs'],
  button: ['type', 'attrs'],
  video: ['type', 'attrs'],
  horizontalRule: ['type'],
}

const NO_VACIOS = ['bulletList', 'orderedList', 'listItem', 'blockquote']

function hrefDelEnlace(marca: Crudo): string {
  soloClaves(marca, ['type', 'attrs'])
  const attrs = marca['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['href'])
  const href = attrs['href']
  if (typeof href !== 'string') {
    rechazar()
  }
  if (hrefSeguro(href) === null) {
    rechazar(MOTIVO_DE_ENLACE)
  }
  return href
}

type Marcas = { negrita: boolean; cursiva: boolean; href: string | null }

function leerMarca(marca: unknown, vistas: Set<string>, marcas: Marcas) {
  if (!esObjeto(marca) || typeof marca['type'] !== 'string' || vistas.has(marca['type'])) {
    rechazar()
  }
  const tipo = marca['type']
  vistas.add(tipo)
  if (tipo === 'bold' || tipo === 'italic') {
    soloClaves(marca, ['type'])
    if (tipo === 'bold') marcas.negrita = true
    else marcas.cursiva = true
  } else if (tipo === 'link') {
    marcas.href = hrefDelEnlace(marca)
  } else {
    rechazar()
  }
}

// `_web_doc_marcas`: valida y envuelve en orden fijo (enlace › cursiva › negrita).
function conMarcas(crudas: unknown, html: string): string {
  if (crudas === undefined) {
    return html
  }
  if (!Array.isArray(crudas)) {
    rechazar()
  }
  const vistas = new Set<string>()
  const marcas: Marcas = { negrita: false, cursiva: false, href: null }
  for (const marca of crudas) {
    leerMarca(marca, vistas, marcas)
  }
  let salida = html
  if (marcas.negrita) salida = `<strong>${salida}</strong>`
  if (marcas.cursiva) salida = `<em>${salida}</em>`
  if (marcas.href !== null) {
    salida = `<a href="${escaparHtml(marcas.href)}" rel="noopener noreferrer nofollow">${salida}</a>`
  }
  return salida
}

function nivelDelTitulo(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['level'])
  const nivel = attrs['level']
  if (nivel !== 2 && nivel !== 3) {
    rechazar()
  }
  return String(nivel)
}

// El número con el que empieza una lista numerada (`attrs.start`, 1 si no viene).
function inicioDeLista(nodo: Crudo): number {
  if (!('attrs' in nodo)) {
    return 1
  }
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['start'])
  const start = attrs['start']
  if (typeof start !== 'number' || !Number.isInteger(start) || start < 1 || start > 99999) {
    rechazar()
  }
  return start
}

function hijosDe(tipo: string, nodo: Crudo): unknown[] {
  if (!('content' in nodo)) {
    if (NO_VACIOS.includes(tipo)) {
      rechazar()
    }
    return []
  }
  const hijos = nodo['content']
  if (!Array.isArray(hijos) || (NO_VACIOS.includes(tipo) && hijos.length === 0)) {
    rechazar()
  }
  return hijos
}

function envolver(tipo: string, interior: string, nivel: string, inicio: number): string {
  switch (tipo) {
    case 'paragraph':
      return `<p>${interior}</p>`
    case 'heading':
      return `<h${nivel}>${interior}</h${nivel}>`
    case 'bulletList':
      return `<ul>${interior}</ul>`
    case 'orderedList':
      return `${inicio === 1 ? '<ol>' : `<ol start="${String(inicio)}">`}${interior}</ol>`
    case 'listItem':
      return `<li>${interior}</li>`
    case 'blockquote':
      return `<blockquote>${interior}</blockquote>`
    default:
      return interior
  }
}

// El tipo de un nodo, si puede ir dentro de `padre` y no trae claves de más.
function tipoDeNodo(nodo: unknown, padre: string, profundidad: number): [string, Crudo] {
  if (profundidad > PROFUNDIDAD_MAXIMA) {
    rechazar(MOTIVO_DE_NIVELES)
  }
  if (!esObjeto(nodo) || typeof nodo['type'] !== 'string') {
    rechazar()
  }
  const tipo = nodo['type']
  if (!(HIJOS[padre] ?? []).includes(tipo)) {
    rechazar()
  }
  soloClaves(nodo, CLAVES[tipo] ?? ['type', 'content'])
  return [tipo, nodo]
}

// Texto, salto, separador o un bloque de datos (imagen, galería, botón, video): lo que no tiene hijos. `null` = es un nodo con hijos.
function htmlSinHijos(tipo: string, nodo: Crudo): string | null {
  if (tipo === 'text') {
    const texto = nodo['text']
    if (typeof texto !== 'string' || texto === '') {
      rechazar()
    }
    return conMarcas(nodo['marks'], escaparHtml(texto))
  }
  if (tipo === 'hardBreak') {
    conMarcas(nodo['marks'], '')
    return '<br>'
  }
  switch (tipo) {
    case 'image':
      return imagen(nodo)
    case 'horizontalRule':
      return '<hr>'
    case 'gallery':
      return galeria(nodo)
    case 'button':
      return boton(nodo)
    case 'video':
      return video(nodo)
    default:
      return null
  }
}

// `_web_doc_nodo`: niveles, forma, padre, claves, y después lo propio del tipo.
export function htmlDeNodo(crudo: unknown, padre: string, profundidad: number): string {
  const [tipo, nodo] = tipoDeNodo(crudo, padre, profundidad)
  const hoja = htmlSinHijos(tipo, nodo)
  if (hoja !== null) {
    return hoja
  }
  const nivel = tipo === 'heading' ? nivelDelTitulo(nodo) : ''
  const inicio = tipo === 'orderedList' ? inicioDeLista(nodo) : 1
  const interior = hijosDe(tipo, nodo)
    .map((hijo) => htmlDeNodo(hijo, tipo, profundidad + 1))
    .join('')
  return envolver(tipo, interior, nivel, inicio)
}
