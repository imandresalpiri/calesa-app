// Los atajos de teclado del lienzo, como Excel: qué hace una tecla sobre la grilla (sin estar escribiendo en una celda). Puro: recibe la tecla y sus modificadores y
// devuelve la acción, o nulo si la grilla no la toma (y entonces no se frena: Tab sale de la grilla al panel). Ctrl y Cmd valen lo mismo. Copiar y pegar se piden
// aquí, pero quien escucha no frena la tecla: el navegador dispara además `copy` y `paste`, que llevan el texto del portapapeles del sistema.
import type { Direccion } from './seleccion'

export type Tecla = {
  readonly key: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
  readonly alt: boolean
}

export type AccionDelTeclado =
  | { readonly tipo: 'mover'; readonly direccion: Direccion; readonly extender: boolean }
  // Enter o F2: escribir en la celda (un dato o el logo: al campo «Contenido» del panel).
  | { readonly tipo: 'editar' }
  // Una letra, un número o un signo: empieza a escribir reemplazando lo que había.
  | { readonly tipo: 'escribir'; readonly texto: string }
  | { readonly tipo: 'vaciar' }
  | { readonly tipo: 'deshacer' }
  | { readonly tipo: 'rehacer' }
  | { readonly tipo: 'copiar' }
  | { readonly tipo: 'pegar' }
  | { readonly tipo: 'menu' }
  // Esc: soltar la selección (el panel vuelve al resumen).
  | { readonly tipo: 'soltar' }
  | { readonly tipo: 'todo' }
  // Shift+Espacio la fila, Ctrl+Espacio la columna.
  | { readonly tipo: 'fila' }
  | { readonly tipo: 'columna' }

const FLECHAS: Readonly<Record<string, Direccion>> = {
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
}

// Un carácter que se escribe: una sola letra (o un emoji), sin Ctrl, Cmd ni Alt. `?` no: con la grilla enfocada abre la ayuda de atajos (para escribirlo, Enter o F2
// y luego la tecla).
const esImprimible = (t: Tecla) =>
  !t.ctrl && !t.meta && !t.alt && [...t.key].length === 1 && t.key !== ' ' && t.key !== '?'

// Las flechas, Home y End (con Shift extienden; con Ctrl, Home y End van a la primera y la última casilla).
function deMovimiento(t: Tecla): AccionDelTeclado | null {
  if (t.alt) return null
  const flecha = Object.hasOwn(FLECHAS, t.key) ? FLECHAS[t.key] : undefined
  if (flecha !== undefined) return { tipo: 'mover', direccion: flecha, extender: t.shift }
  const mando = t.ctrl || t.meta
  if (t.key === 'Home')
    return { tipo: 'mover', direccion: mando ? 'primera' : 'inicio', extender: t.shift }
  if (t.key === 'End')
    return { tipo: 'mover', direccion: mando ? 'ultima' : 'fin', extender: t.shift }
  return null
}

const CON_MANDO: Readonly<Record<string, AccionDelTeclado>> = {
  z: { tipo: 'deshacer' },
  y: { tipo: 'rehacer' },
  c: { tipo: 'copiar' },
  v: { tipo: 'pegar' },
  a: { tipo: 'todo' },
  ' ': { tipo: 'columna' },
}

// Con Ctrl o Cmd (sin Alt): Ctrl+Shift+Z también rehace.
function conMando(t: Tecla): AccionDelTeclado | null {
  const letra = t.key.toLowerCase()
  if (letra === 'z' && t.shift) return { tipo: 'rehacer' }
  return Object.hasOwn(CON_MANDO, letra) ? (CON_MANDO[letra] ?? null) : null
}

const SUELTAS: Readonly<Record<string, AccionDelTeclado>> = {
  Enter: { tipo: 'editar' },
  F2: { tipo: 'editar' },
  Delete: { tipo: 'vaciar' },
  Backspace: { tipo: 'vaciar' },
  Escape: { tipo: 'soltar' },
  ContextMenu: { tipo: 'menu' },
}

function sinMando(t: Tecla): AccionDelTeclado | null {
  if (t.key === ' ' && t.shift) return { tipo: 'fila' }
  if (t.key === 'F10' && t.shift) return { tipo: 'menu' }
  if (Object.hasOwn(SUELTAS, t.key)) return SUELTAS[t.key] ?? null
  return esImprimible(t) ? { tipo: 'escribir', texto: t.key } : null
}

export function accionDeLaTecla(t: Tecla): AccionDelTeclado | null {
  const movimiento = deMovimiento(t)
  if (movimiento !== null) return movimiento
  if (t.alt) return null
  return t.ctrl || t.meta ? conMando(t) : sinMando(t)
}
