// Los mutadores del corpus de `validar_diseno()` para la ayuda en bloques de una celda: los de forma, uno por marca (D86–D99 de
// `_diseno_forma_item()`), y los cruzados, uno por regla de `_diseno_ayudas()` (§7) que pide el catálogo o una columna que llena, más uno que deja la
// ayuda en bloques válida para que las mezclas la combinen con otros.
import {
  deTipo,
  idsDe,
  itemsDe,
  objetos,
  porcentajeDe,
  texto,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'
import { elegir, esObjeto, type Azar, type Json, type Objeto } from './mutadores-de-formula'

const unaCelda = (e: Entrada, azar: Azar) => elegir(azar, itemsDe(e, deTipo('celda')))?.it
const corto = (v: Json) => [...JSON.stringify(v)].slice(0, 20).join('')

const titulo = (t: Json): Json => ({ tipo: 'titulo', texto: t })
const bloqueDeTexto = (t: Json): Json => ({ tipo: 'texto', texto: t })
const enlaces = (lista: Json): Json => ({ tipo: 'enlaces', enlaces: lista })
const bueno: Json = { titulo: 'Copart', url: 'https://www.copart.com/' }
const tabla = (clave: Json, extra: Objeto = {}): Json => ({ tipo: 'tabla', tabla: clave, ...extra })
const columna = (c: Json, llena?: Json): Json =>
  llena === undefined ? { columna: c } : { columna: c, llena }

// Pone en una celda una ayuda en bloques: un título, el bloque elegido al azar y un texto (el bloque va en el medio: la forma lo mira entero).
function enBloques(marca: string, valores: readonly Json[]): MutadorDeDiseno {
  return {
    nombre: `forma_${marca}`,
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      const v = elegir(azar, valores) ?? null
      c['ayuda'] = [titulo('Ayuda'), v, bloqueDeTexto('Fin')]
      return `forma_${marca}(${corto(v)})`
    },
  }
}

// Pone en una celda la ayuda elegida, entera.
function laAyuda(marca: string, valores: readonly Json[]): MutadorDeDiseno {
  return {
    nombre: `forma_${marca}`,
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      const v = elegir(azar, valores) ?? null
      c['ayuda'] = v
      return `forma_${marca}(${corto(v)})`
    },
  }
}

const columnas = (n: number): Json[] =>
  Array.from({ length: n }, (_, i) => columna(`c${String(i)}`))

export const MUTADORES_DE_FORMA_DE_LAS_AYUDAS: readonly MutadorDeDiseno[] = [
  laAyuda('D86', [[], Array.from({ length: 9 }, () => bloqueDeTexto('x'))]),
  enBloques('D87', ['x', 7, null, { tipo: 'imagen', texto: 'x' }, { texto: 'x' }]),
  enBloques('D88', [
    titulo(''),
    titulo('t'.repeat(81)),
    titulo(5),
    { ...(titulo('x') as Objeto), nivel: 2 },
  ]),
  enBloques('D89', [bloqueDeTexto(''), bloqueDeTexto('x'.repeat(1001)), { tipo: 'texto' }]),
  enBloques('D90', [
    enlaces([]),
    enlaces('https://x.y/'),
    enlaces(Array.from({ length: 6 }, () => bueno)),
    { tipo: 'enlaces' },
  ]),
  enBloques('D91', [
    enlaces(['https://x.y/']),
    enlaces([{ titulo: 'x' }]),
    enlaces([{ ...(bueno as Objeto), nuevo: true }]),
  ]),
  enBloques('D92', [
    enlaces([{ titulo: '', url: 'https://x.y/' }]),
    enlaces([{ titulo: 't'.repeat(61), url: 'https://x.y/' }]),
  ]),
  enBloques('D93', [
    enlaces([{ titulo: 'x', url: '' }]),
    enlaces([{ titulo: 'x', url: 'https://' + 'x'.repeat(1993) }]),
  ]),
  enBloques('D94', [tabla('Mala'), tabla(7), { tipo: 'tabla' }, tabla('fletes', { titulo: 'x' })]),
  enBloques('D95', [
    tabla('fletes', { columnas: [] }),
    tabla('fletes', { columnas: 'monto' }),
    tabla('fletes', { columnas: columnas(21) }),
  ]),
  enBloques('D96', [
    tabla('fletes', { columnas: ['monto'] }),
    tabla('fletes', { columnas: [columna('Mala')] }),
    tabla('fletes', { columnas: [columna('monto', 'Mala')] }),
    tabla('fletes', { columnas: [{ columna: 'monto', ancho: 2 }] }),
  ]),
  enBloques('D97', [
    tabla('fletes', { columnas: [columna('monto'), columna('desde'), columna('monto')] }),
  ]),
  enBloques('D98', [tabla('fletes', { resaltar: 'si' }), tabla('fletes', { resaltar: 1 })]),
  laAyuda('D99', [[tabla('a'), tabla('b'), tabla('c'), tabla('d')]]),
]

// Las tablas que nombran las ayudas del diseño (también las de antes, salvo con `soloBloques`), cada una con las columnas que sus bloques muestran.
// La de antes no se mira contra el catálogo: quitarla de él no rompe nada.
function tablasDelDiseno(e: Entrada, soloBloques = false): Map<string, Set<string>> {
  const tablas = new Map<string, Set<string>>()
  for (const { it } of itemsDe(e, deTipo('celda'))) {
    const ayuda = it['ayuda']
    const deAntes: Objeto[] = esObjeto(ayuda) && !soloBloques ? [{ tipo: 'tabla', ...ayuda }] : []
    const bloques = Array.isArray(ayuda) ? objetos(ayuda) : deAntes
    for (const b of bloques) {
      const clave = texto(b, 'tabla')
      if (texto(b, 'tipo') !== 'tabla' || clave === undefined) continue
      const cols = tablas.get(clave) ?? new Set<string>()
      for (const c of objetos(b['columnas'])) cols.add(texto(c, 'columna') ?? '?')
      tablas.set(clave, cols)
    }
  }
  return tablas
}

// Pone en el contexto un catálogo con todas las tablas y columnas que el diseño ya nombra (más una de relleno): sólo falla lo que el mutador agrega.
function conCatalogo(e: Entrada, sacar?: { tabla: string; columna?: string }) {
  const catalogo = [...tablasDelDiseno(e)].map(([clave, cols]) => ({
    clave,
    columnas: [...cols, 'otra'].filter((c) => !(sacar?.tabla === clave && sacar.columna === c)),
  }))
  e.contexto.tablas = [
    ...catalogo.filter((t) => !(sacar?.tabla === t.clave && sacar.columna === undefined)),
    { clave: 'relleno', columnas: ['uno'] },
  ]
}

// Los nodos que la hoja deja escribir desde una celda del diseño y los que no (para `llena`).
function nodosQueAceptan(e: Entrada): string[] {
  const nodos = new Map(objetos(e.definicion['nodos']).map((n) => [texto(n, 'id') ?? '?', n]))
  const acepta = (n: Objeto | undefined): n is Objeto =>
    n !== undefined &&
    (['input', 'constante'].includes(texto(n, 'tipo') ?? '') ||
      (['tabla', 'tramo', 'calculo'].includes(texto(n, 'tipo') ?? '') &&
        texto(n, 'salida') !== 'total'))
  const ids: string[] = []
  for (const { it } of itemsDe(e, deTipo('celda'))) {
    const n = nodos.get(texto(it, 'nodo') ?? '')
    if (acepta(n)) ids.push(texto(it, 'nodo') ?? '?')
    const pct =
      n !== undefined && porcentajeDe(n) && it['secundario'] !== undefined
        ? nodos.get(texto(n, 'pct') ?? '')
        : undefined
    if (acepta(pct)) ids.push(texto(pct, 'id') ?? '?')
  }
  return ids
}

export const MUTADORES_DE_LAS_AYUDAS: readonly MutadorDeDiseno[] = [
  {
    nombre: 'ayuda_tabla_inexistente',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      // La tabla que falta es una nueva, o una que un bloque del diseño ya nombra y el catálogo no trae.
      const ya = [...tablasDelDiseno(e, true).keys()]
      const quitada = azar.entero(2) === 0 ? elegir(azar, ya) : undefined
      if (quitada === undefined) {
        conCatalogo(e)
        c['ayuda'] = [titulo('Referencia'), tabla('no_esta')]
        return 'ayuda_tabla_inexistente(no_esta)'
      }
      conCatalogo(e, { tabla: quitada })
      return `ayuda_tabla_inexistente(${quitada})`
    },
  },
  {
    nombre: 'ayuda_columna_inexistente',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      const cols: Json[] = [columna('uno')]
      cols.splice(azar.entero(2), 0, columna('falta'))
      conCatalogo(e)
      c['ayuda'] = [tabla('relleno', { columnas: cols })]
      return 'ayuda_columna_inexistente(falta)'
    },
  },
  {
    nombre: 'ayuda_llena_no_acepta_valor',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      const aceptan = new Set(nodosQueAceptan(e))
      const malos = [...idsDe(e, () => true).filter((id) => !aceptan.has(id)), 'no_existe']
      const malo = elegir(azar, malos)
      if (!c || malo === undefined) return null
      const otra = elegir(azar, [...aceptan])
      const cols: Json[] = otra === undefined ? [] : [columna('a', otra)]
      cols.splice(azar.entero(cols.length + 1), 0, columna('b', malo))
      c['ayuda'] = [bloqueDeTexto('Elige un valor.'), tabla('fletes', { columnas: cols })]
      return `ayuda_llena_no_acepta_valor(${malo})`
    },
  },
  {
    nombre: 'ayuda_en_bloques_valida',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      const llena = elegir(azar, nodosQueAceptan(e))
      if (!c || llena === undefined) return null
      c['ayuda'] = [
        titulo('Referencia'),
        bloqueDeTexto('El **IVA** según el tipo.'),
        enlaces([bueno]),
        tabla('impuestos', {
          columnas: [columna('tipo'), columna('iva', llena)],
          resaltar: azar.entero(2) === 0,
        }),
      ]
      if (azar.entero(2) === 0) conCatalogo(e)
      return `ayuda_en_bloques_valida(${llena})`
    },
  },
]
