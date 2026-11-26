// Los textos visibles que una línea de `src/` agrega o quita (literales y texto de JSX) y los localizadores no exactos de un spec: lo
// que `e2e-afectados.mjs` cruza para hallar los specs que un cambio de texto puede romper. Puro; se prueba en `e2e-afectados.test.ts`.

const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g
const CODIGO_EN_EL_TEXTO = /[/\\_=<>{}[\]#@$|^~*]/

// Un texto que se ve: en español, con al menos tres letras y sin pinta de ruta, clase, identificador o constante. Lo que no es texto
// y pasa (`relative flex gap`) no estorba: no aparece en ningún spec.
export function esTextoVisible(texto) {
  const t = texto.trim()
  if (t.length < 3 || (t.match(/\p{L}/gu) ?? []).length < 3 || CODIGO_EN_EL_TEXTO.test(t))
    return false
  if (/^\S+$/.test(t)) {
    // Una sola palabra: `AbortError`, `ESCRITORIO`, `Promise.all` o `use client` no son texto; `Vitrina` sí.
    if (/\p{Ll}\p{Lu}/u.test(t) || !/\p{Ll}/u.test(t) || /\.\S/.test(t)) return false
    return /^[¿¡«"“]?\p{Lu}/u.test(t)
  }
  if (/^[¿¡«"“]?\p{Lu}/u.test(t)) return true
  // En minúscula sólo si parece una frase: sin guiones, dos puntos ni cifras, y con tilde o eñe o al menos tres palabras.
  if (/[-:\d]/.test(t)) return false
  return /[áéíóúñü]/i.test(t) || t.split(/\s+/).length >= 3
}

/** Los textos visibles de una línea de código: sus literales (de un template, los trozos fijos) y el texto de JSX. */
export function textosDeLaLinea(linea) {
  const s = linea.trim()
  if (/^(import\b|export \* from|\/\/|\/\*|\*)/.test(s)) return []
  const textos = []
  const sinLiterales = s.replace(LITERAL, (_, comilla, cuerpo) => {
    if (comilla === '`') textos.push(...cuerpo.split(/\$\{[^}]*\}/))
    else textos.push(cuerpo.replace(/\\(.)/g, '$1'))
    return '""'
  })
  if (/[<>{}]/.test(sinLiterales)) {
    // Texto de JSX entre etiquetas o llaves: `<span>Vitrina</span>`, `Recargar <Icono />`, `{n} vehículos`.
    for (const m of sinLiterales.matchAll(/(?:^|[>}])([^<>{}]+)(?=[<{]|$)/g)) {
      if (m[1] && !/[();=]|=>|&&|\|\|/.test(m[1])) textos.push(m[1])
    }
  } else if (!/[();=]|=>|&&|\|\||,$/.test(sinLiterales)) {
    // Una línea sola de texto: lo que Prettier parte de un párrafo largo de JSX.
    textos.push(sinLiterales)
  }
  return [...new Set(textos.map((t) => t.trim().replace(/\s+/g, ' ')))].filter(esTextoVisible)
}

/** Los textos visibles de varias líneas, sin repetir. */
export function textosDeLasLineas(lineas) {
  return [...new Set(lineas.flatMap(textosDeLaLinea))]
}

const LITERAL_DEL_ARGUMENTO = String.raw`(['"\x60])((?:\\.|(?!\1)[^\\])*?)\1`
const POR_TEXTO = new RegExp(
  String.raw`\bgetBy(?:Text|Label|Placeholder|Title|AltText)\(\s*${LITERAL_DEL_ARGUMENTO}\s*(?:,\s*\{([^}]*)\})?\s*\)`,
  'g',
)
const POR_ROL = /\bgetByRole\(\s*['"`][\w-]+['"`]\s*,\s*\{([^}]*)\}\s*\)/g
const NOMBRE = new RegExp(String.raw`\bname:\s*${LITERAL_DEL_ARGUMENTO}`)
const CON_TEXTO = new RegExp(String.raw`\bhasText:\s*${LITERAL_DEL_ARGUMENTO}`, 'g')
const EXACTO = /\bexact:\s*true\b/

/**
 * Los textos de los localizadores no exactos de un spec o ayudante (`getByRole(…, { name })`, `getByText`, `getByLabel`,
 * `getByPlaceholder`, `getByTitle`, `getByAltText` sin `exact: true`, y `hasText`). Playwright los compara como subcadena sin
 * mayúsculas: un texto nuevo que contiene uno de ellos lo vuelve ambiguo (strict mode).
 */
export function localizadoresNoExactos(texto) {
  const encontrados = new Set()
  const sumar = (t) => {
    if (t && !t.includes('${') && (t.match(/\p{L}/gu) ?? []).length >= 3) encontrados.add(t.trim())
  }
  for (const m of texto.matchAll(POR_TEXTO)) if (!EXACTO.test(m[3] ?? '')) sumar(m[2])
  for (const m of texto.matchAll(POR_ROL)) {
    const opciones = m[1] ?? ''
    if (!EXACTO.test(opciones)) sumar(NOMBRE.exec(opciones)?.[2])
  }
  for (const m of texto.matchAll(CON_TEXTO)) sumar(m[2])
  return encontrados
}

const normalizar = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim()

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Si un texto nuevo vuelve ambiguo a un localizador no exacto (lo contiene sin ser el mismo: el mismo texto lo nombra) y cuánto:
 * `inicio` si lo cumple desde su comienzo, `palabra` si como palabra entera, `parte` si a mitad de palabra; null si no.
 */
export function atrapa(textoNuevo, localizador) {
  const nuevo = normalizar(textoNuevo)
  const loc = normalizar(localizador)
  if (nuevo === loc || !nuevo.includes(loc)) return null
  const entero = (prefijo) => new RegExp(`${prefijo}${escapar(loc)}(?!\\p{L})`, 'u').test(nuevo)
  if (entero('^')) return 'inicio'
  return entero('(?<!\\p{L})') ? 'palabra' : 'parte'
}

export const esFuenteDeSrc = (a) =>
  /^src\/.+\.(tsx?|mjs|js)$/.test(a) &&
  !/\.(test|spec)\.[cm]?[jt]sx?$|\.d\.ts$|\.types\.ts$/.test(a)

// Una línea que agrega una entrada del «⋯» (`AccionDeMenu`: `etiqueta: 'Subir'`) o de un menú de Base UI.
const ENTRADA_DE_MENU = /\betiqueta:\s*['"`]|<(?:Dropdown)?Menu(?:Item|CheckboxItem|RadioItem)\b/

/** Los textos netos de cada archivo de `src/` del diff: una línea que sólo cambió su clase no cambia su texto. */
export function textosDelDiff(cambios) {
  const agregados = new Map()
  const quitados = new Map()
  const enMenu = new Set()
  const fueraDeMenu = new Set()
  for (const [archivo, c] of Object.entries(cambios)) {
    if (!esFuenteDeSrc(archivo)) continue
    const ag = new Set(textosDeLasLineas(c.agregadas ?? []))
    const qu = new Set(textosDeLasLineas(c.quitadas ?? []))
    for (const t of ag) if (!qu.has(t)) sumarA(agregados, t, archivo)
    for (const t of qu) if (!ag.has(t)) sumarA(quitados, t, archivo)
    for (const linea of c.agregadas ?? [])
      for (const t of textosDeLaLinea(linea))
        (ENTRADA_DE_MENU.test(linea) ? enMenu : fueraDeMenu).add(t)
  }
  // Un texto «del menú» es el que sólo se agrega como línea de un menú: si también se dibuja suelto, sigue a la vista.
  for (const t of fueraDeMenu) enMenu.delete(t)
  return { agregados, quitados, enMenu }
}

export function sumarA(mapa, clave, valor) {
  if (!mapa.has(clave)) mapa.set(clave, new Set())
  mapa.get(clave).add(valor)
}
