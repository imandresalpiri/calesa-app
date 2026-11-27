// Atajos globales de teclado (docs/UX.md › Reglas transversales). Acá vive el catálogo y la
// lectura de un evento; quién escucha y a quién le toca responder es de `src/shared/ui/atajos`.

export const ATAJOS = {
  cerrar: { combinacion: 'escape', descripcion: 'Cerrar el panel abierto' },
  buscar: { combinacion: 'mod+k', descripcion: 'Buscar y ejecutar comandos' },
  nuevo: { combinacion: 'n', descripcion: 'Nuevo, según la pantalla' },
  abrirNuevo: { combinacion: 'shift+n', descripcion: 'Abrir «Nuevo»: elegir qué crear' },
  guardar: { combinacion: 'mod+s', descripcion: 'Guardar' },
  guardarYSeguir: { combinacion: 'mod+enter', descripcion: 'Guardar y seguir' },
  plegarMenu: { combinacion: 'mod+b', descripcion: 'Plegar o desplegar el menú lateral' },
  buscarEnPantalla: { combinacion: '/', descripcion: 'Buscar dentro de Configuración' },
  ayuda: { combinacion: '?', descripcion: 'Ver la lista de atajos' },
  // De una pantalla: sólo cuentan con ella montada y salen en la lista de «?» bajo el nombre de su pantalla (`useAyudaDePantalla()`), no en la general. Con Alt (y la
  // tecla por su `code`, que en macOS no cambia con Option) para no pisar al navegador ni al sistema.
  combinarCeldas: {
    combinacion: 'alt+m',
    descripcion: 'Combinar las celdas elegidas',
    pantalla: 'tarjeta',
  },
  separarCeldas: {
    combinacion: 'alt+u',
    descripcion: 'Separar las celdas combinadas',
    pantalla: 'tarjeta',
  },
  insertarFilaAbajo: {
    combinacion: 'alt+r',
    descripcion: 'Insertar una fila abajo',
    pantalla: 'tarjeta',
  },
  insertarFilaArriba: {
    combinacion: 'alt+shift+r',
    descripcion: 'Insertar una fila arriba',
    pantalla: 'tarjeta',
  },
  insertarColumnaDerecha: {
    combinacion: 'alt+c',
    descripcion: 'Insertar una columna a la derecha',
    pantalla: 'tarjeta',
  },
  insertarColumnaIzquierda: {
    combinacion: 'alt+shift+c',
    descripcion: 'Insertar una columna a la izquierda',
    pantalla: 'tarjeta',
  },
} as const satisfies Record<string, { combinacion: string; descripcion: string; pantalla?: string }>

export type ClaveAtajo = keyof typeof ATAJOS

// Lo mínimo de un KeyboardEvent, para poder probarlo sin DOM.
export type Tecla = {
  key: string
  // La tecla física (`KeyboardEvent.code`): con Alt, la letra sale de ella, no de `key` (en macOS Option+M escribe «µ»).
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey?: boolean
}

const esLetra = (key: string) => key.length === 1 && key.toLowerCase() !== key.toUpperCase()

// La letra de una tecla física (`KeyA`…`KeyZ`), en minúscula.
const letraDelCodigo = (code: string | undefined) =>
  /^Key([A-Z])$/.exec(code ?? '')?.[1]?.toLowerCase()

// `mod` es Ctrl en Windows y Linux y Cmd en macOS: se aceptan los dos en cualquier sistema. `shift` sólo cuenta con una letra suelta (o con Alt): `?` ya lleva el
// Mayús puesto en su `key`, `Ctrl+Shift+S` sigue siendo guardar, y con Bloq Mayús una `N` llega como `N` sin `shiftKey`: sigue siendo `n`.
export function combinacionDe(tecla: Tecla): string {
  const key = (tecla.altKey ? letraDelCodigo(tecla.code) : undefined) ?? tecla.key.toLowerCase()
  const mod = tecla.ctrlKey || tecla.metaKey
  const mayus = tecla.shiftKey === true && esLetra(key) && !mod
  return `${mod ? 'mod+' : ''}${tecla.altKey ? 'alt+' : ''}${mayus ? 'shift+' : ''}${key}`
}

export function atajoDe(tecla: Tecla): ClaveAtajo | null {
  const combinacion = combinacionDe(tecla)
  for (const clave of Object.keys(ATAJOS) as ClaveAtajo[]) {
    if (ATAJOS[clave].combinacion === combinacion) {
      return clave
    }
  }
  return null
}

// Los de una sola tecla (`N`, `?`) no se disparan mientras la persona escribe; los que llevan
// `mod` y `Esc` sí, que para eso existen. Salvo `Ctrl+B`: en un campo de texto enriquecido es la negrita.
export function valeMientrasSeEscribe(clave: ClaveAtajo): boolean {
  if (clave === 'plegarMenu') {
    return false
  }
  const { combinacion } = ATAJOS[clave]
  return combinacion.startsWith('mod+') || combinacion === 'escape'
}

export function esMac(plataforma: string): boolean {
  return /mac|iphone|ipad/i.test(plataforma)
}

const NOMBRE_DE_TECLA: Record<string, string> = {
  enter: 'Intro',
  escape: 'Esc',
  shift: 'Mayús',
  ' ': 'Espacio',
  delete: 'Supr',
  backspace: 'Retroceso',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  contextmenu: 'Menú',
}

// Las teclas de una combinación como se muestran: `mod` es Ctrl, o ⌘ en macOS; `alt`, Alt u ⌥; una letra va en mayúscula.
export function teclasDeLaCombinacion(combinacion: string, { mac }: { mac: boolean }): string[] {
  return combinacion.split('+').map((parte) => {
    if (parte === 'mod') {
      return mac ? '⌘' : 'Ctrl'
    }
    if (parte === 'alt') {
      return mac ? '⌥' : 'Alt'
    }
    return NOMBRE_DE_TECLA[parte] ?? parte.toUpperCase()
  })
}

export function teclasDelAtajo(clave: ClaveAtajo, { mac }: { mac: boolean }): string[] {
  return teclasDeLaCombinacion(ATAJOS[clave].combinacion, { mac })
}

// Lo que una pantalla suma a la lista de «?» (`useAyudaDePantalla()`): un título y sus teclas, con la combinación escrita como en `ATAJOS` (`mod+z`, `shift+ `).
export type GrupoDeAyuda = {
  titulo: string
  atajos: readonly { combinacion: string; descripcion: string }[]
}

// Las claves de `ATAJOS` de una pantalla.
export function atajosDeLaPantalla(
  pantalla: string,
): { combinacion: string; descripcion: string }[] {
  return (Object.keys(ATAJOS) as ClaveAtajo[]).flatMap((clave) => {
    const atajo: { combinacion: string; descripcion: string; pantalla?: string } = ATAJOS[clave]
    return atajo.pantalla === pantalla ? [atajo] : []
  })
}
