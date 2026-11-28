// Los atajos de teclado del editor de artes: qué acción da cada tecla, sin DOM ni React (como `keyboard.ts` de V1). Quien escucha (`window`)
// no la llama mientras se escribe en un campo (`esCampoEditable()`). Esc, Ctrl+S y «?» no van acá: los atiende el proveedor global de atajos
// (`useAtajo('cerrar' | 'guardar' | 'ayuda')`), así ninguna tecla tiene dos oyentes. Puro.
import type { GrupoDeAyuda } from '@/shared/lib/atajos'
import type { HaciaDonde } from './orden'

export type HerramientaDelEditor =
  'mover' | 'mano' | 'texto' | 'rectangulo' | 'elipse' | 'linea' | 'poligono' | 'pluma' | 'imagen'

export type TeclaDelEditor = {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
  repeat: boolean
}

export type AccionDelEditor =
  | { tipo: 'herramienta'; herramienta: HerramientaDelEditor }
  | { tipo: 'mano-transitoria'; activa: boolean }
  | { tipo: 'deshacer' }
  | { tipo: 'rehacer' }
  | { tipo: 'copiar' }
  | { tipo: 'pegar' }
  | { tipo: 'duplicar' }
  | { tipo: 'quitar' }
  | { tipo: 'elegir-todo' }
  | { tipo: 'agrupar' }
  | { tipo: 'desagrupar' }
  | { tipo: 'mover'; dx: number; dy: number }
  | { tipo: 'ordenar'; hacia: HaciaDonde }
  | { tipo: 'ajustar' }
  | { tipo: 'al-cien' }
  | { tipo: 'enter' }

export const PASO_DE_LAS_FLECHAS = 1
export const PASO_DE_LAS_FLECHAS_CON_MAYUS = 10

// Un campo donde se escribe: ahí las teclas son del campo. Por sus propiedades (no `instanceof`), para probarlo sin DOM.
export function esCampoEditable(destino: EventTarget | null): boolean {
  if (destino === null || typeof destino !== 'object') {
    return false
  }
  const { tagName, isContentEditable } = destino as {
    tagName?: unknown
    isContentEditable?: unknown
  }
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    isContentEditable === true
  )
}

const HERRAMIENTAS_POR_LETRA: Readonly<Record<string, HerramientaDelEditor>> = {
  v: 'mover',
  h: 'mano',
  t: 'texto',
  r: 'rectangulo',
  e: 'elipse',
  l: 'linea',
  p: 'pluma',
}

const CON_MOD: Readonly<Record<string, AccionDelEditor>> = {
  a: { tipo: 'elegir-todo' },
  z: { tipo: 'deshacer' },
  y: { tipo: 'rehacer' },
  c: { tipo: 'copiar' },
  v: { tipo: 'pegar' },
  d: { tipo: 'duplicar' },
  g: { tipo: 'agrupar' },
  '0': { tipo: 'ajustar' },
  '1': { tipo: 'al-cien' },
  ']': { tipo: 'ordenar', hacia: 'subir' },
  '[': { tipo: 'ordenar', hacia: 'bajar' },
}

const CON_MOD_Y_MAYUS: Readonly<Record<string, AccionDelEditor>> = {
  z: { tipo: 'rehacer' },
  g: { tipo: 'desagrupar' },
  ']': { tipo: 'ordenar', hacia: 'frente' },
  '[': { tipo: 'ordenar', hacia: 'atras' },
}

const FLECHAS: Readonly<Record<string, { dx: number; dy: number }>> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
}

const DE_LA_TECLA_FISICA: Readonly<Record<string, string>> = {
  BracketRight: ']',
  BracketLeft: '[',
}

// La tecla como se busca en las tablas: la letra, el dígito o el corchete escritos (`key`, en minúscula: con Bloq Mayús una `V` es `v`); si
// no es ninguno (Mayús+] da «}», un teclado en español no tiene corchete suelto), la de la tecla física (`code`).
function claveDe(tecla: TeclaDelEditor): string {
  const escrita = tecla.key.toLowerCase()
  if (/^[a-z0-9[\]]$/.test(escrita)) {
    return escrita
  }
  const letra = /^Key([A-Z])$/.exec(tecla.code)?.[1]
  const digito = /^Digit([0-9])$/.exec(tecla.code)?.[1]
  return letra?.toLowerCase() ?? digito ?? DE_LA_TECLA_FISICA[tecla.code] ?? escrita
}

const esEspacio = (tecla: TeclaDelEditor) => tecla.code === 'Space' || tecla.key === ' '

function sinMod(tecla: TeclaDelEditor): AccionDelEditor | null {
  const flecha = FLECHAS[tecla.key]
  if (flecha) {
    const paso = tecla.shiftKey ? PASO_DE_LAS_FLECHAS_CON_MAYUS : PASO_DE_LAS_FLECHAS
    return { tipo: 'mover', dx: flecha.dx * paso, dy: flecha.dy * paso }
  }
  if (tecla.key === 'Delete' || tecla.key === 'Backspace') {
    return { tipo: 'quitar' }
  }
  if (tecla.key === 'Enter') {
    return { tipo: 'enter' }
  }
  if (tecla.shiftKey || tecla.altKey) {
    return null
  }
  const herramienta = HERRAMIENTAS_POR_LETRA[claveDe(tecla)]
  return herramienta ? { tipo: 'herramienta', herramienta } : null
}

// La acción de una tecla (`null`: no es un atajo, y quien escucha no frena al navegador). `mod` es Ctrl o ⌘ en cualquier sistema. Al soltar,
// sólo cuenta el Espacio (suelta la mano transitoria); al mantenerlo apretado, su repetición no hace nada.
export function accionDeLaTecla(
  tecla: TeclaDelEditor,
  momento: 'bajar' | 'subir',
): AccionDelEditor | null {
  const mod = tecla.ctrlKey || tecla.metaKey
  if (esEspacio(tecla)) {
    if (mod || (momento === 'bajar' && tecla.repeat)) {
      return null
    }
    return { tipo: 'mano-transitoria', activa: momento === 'bajar' }
  }
  if (momento === 'subir') {
    return null
  }
  if (!mod) {
    return sinMod(tecla)
  }
  const tabla = tecla.shiftKey ? CON_MOD_Y_MAYUS : CON_MOD
  return tabla[claveDe(tecla)] ?? null
}

// La lista de «?» (`useAyudaDePantalla()`), con la combinación escrita como en `ATAJOS` de `src/shared/lib/atajos.ts`. Suma Esc y Ctrl+S,
// que atiende el proveedor global, para que esté completa.
export const ATAJOS_DEL_EDITOR: readonly { combinacion: string; descripcion: string }[] = [
  { combinacion: 'v', descripcion: 'Mover y elegir' },
  { combinacion: 'h', descripcion: 'Mano: desplazar el lienzo' },
  { combinacion: ' ', descripcion: 'Mano mientras la mantienes' },
  { combinacion: 't', descripcion: 'Texto' },
  { combinacion: 'r', descripcion: 'Rectángulo' },
  { combinacion: 'e', descripcion: 'Elipse' },
  { combinacion: 'l', descripcion: 'Línea' },
  { combinacion: 'p', descripcion: 'Pluma' },
  { combinacion: 'mod+z', descripcion: 'Deshacer' },
  { combinacion: 'mod+shift+z', descripcion: 'Rehacer' },
  { combinacion: 'mod+c', descripcion: 'Copiar' },
  { combinacion: 'mod+v', descripcion: 'Pegar' },
  { combinacion: 'mod+d', descripcion: 'Duplicar' },
  { combinacion: 'delete', descripcion: 'Quitar lo elegido' },
  { combinacion: 'mod+a', descripcion: 'Elegir todo' },
  { combinacion: 'mod+g', descripcion: 'Agrupar' },
  { combinacion: 'mod+shift+g', descripcion: 'Desagrupar' },
  { combinacion: 'arrowup', descripcion: 'Mover de a 1 (con cada flecha)' },
  { combinacion: 'shift+arrowup', descripcion: 'Mover de a 10' },
  { combinacion: 'mod+]', descripcion: 'Traer hacia adelante' },
  { combinacion: 'mod+[', descripcion: 'Enviar hacia atrás' },
  { combinacion: 'mod+shift+]', descripcion: 'Traer al frente' },
  { combinacion: 'mod+shift+[', descripcion: 'Enviar al fondo' },
  { combinacion: 'mod+0', descripcion: 'Ajustar a la pantalla' },
  { combinacion: 'mod+1', descripcion: 'Ver al 100 %' },
  { combinacion: 'enter', descripcion: 'Editar el texto o terminar el trazo' },
  { combinacion: 'escape', descripcion: 'Deseleccionar o terminar el trazo' },
  { combinacion: 'mod+s', descripcion: 'Guardar' },
]

export const GRUPO_DE_AYUDA_DEL_EDITOR: GrupoDeAyuda = {
  titulo: 'Editor de artes',
  atajos: ATAJOS_DEL_EDITOR,
}
