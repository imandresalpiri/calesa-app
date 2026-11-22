// Los mutadores del corpus de `validar_diseno()` para lo que la cabecera trae por defecto y los enlaces de la ayuda: los de forma, uno por
// marca (D77–D80 de `_diseno_forma()`, D81–D85 de `_diseno_forma_item()`), y los cruzados, uno por regla de `_diseno_cabecera()` (§1b) y de
// `_diseno_ayudas()` (§7), más dos que dejan el diseño válido para que las mezclas los combinen con otros.
import {
  deTipo,
  itemsDe,
  modos,
  raiz,
  texto,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'
import { elegir, esObjeto, type Azar, type Json, type Objeto } from './mutadores-de-formula'

const cabecera = (e: Entrada): Objeto | undefined => {
  const c = raiz(e)?.['cabecera']
  return esObjeto(c) ? c : undefined
}
const claves = (e: Entrada) => modos(e).map((m) => texto(m, 'clave') ?? '?')
const unaCelda = (e: Entrada, azar: Azar) => elegir(azar, itemsDe(e, deTipo('celda')))?.it
const corto = (v: Json) => [...JSON.stringify(v)].slice(0, 20).join('')

// Pone en la cabecera un valor elegido al azar.
function enLaCabecera(marca: string, clave: string, valores: readonly Json[]): MutadorDeDiseno {
  return {
    nombre: `forma_${marca}`,
    aplicar: (e, azar) => {
      const c = cabecera(e)
      if (!c) return null
      const v = elegir(azar, valores) ?? null
      c[clave] = v
      return `forma_${marca}(${clave}=${corto(v)})`
    },
  }
}

// Pone en una celda una ayuda de texto con los enlaces elegidos al azar.
function conEnlaces(marca: string, valores: readonly Json[]): MutadorDeDiseno {
  return {
    nombre: `forma_${marca}`,
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      const v = elegir(azar, valores) ?? null
      c['ayuda'] = { texto: 'Consulta la fuente.', enlaces: v }
      return `forma_${marca}(${corto(v)})`
    },
  }
}

const enlace = (titulo: Json, url: Json): Json => ({ titulo, url })
const bueno = enlace('Copart', 'https://www.copart.com/')

export const MUTADORES_DE_FORMA_POR_DEFECTO: readonly MutadorDeDiseno[] = [
  enLaCabecera('D77', 'modo_por_defecto', ['Paralelo', 7, '']),
  enLaCabecera('D78', 'ver_total_bs_por_defecto', ['si', 1, null]),
  enLaCabecera('D79', 'modos_visibles', ['paralelo', {}]),
  enLaCabecera('D80', 'modos_visibles', [['Mala'], [1], [null]]),
  conEnlaces('D81', ['https://www.copart.com/', {}]),
  conEnlaces('D82', [[], [bueno, bueno, bueno, bueno, bueno, bueno]]),
  conEnlaces('D83', [
    ['https://www.copart.com/'],
    [{ titulo: 'x', url: 'https://x.y/', nuevo: true }],
  ]),
  conEnlaces('D84', [
    [enlace('', 'https://x.y/')],
    [enlace('x'.repeat(61), 'https://x.y/')],
    [enlace(null, 'https://x.y/')],
  ]),
  conEnlaces('D85', [
    [enlace('Larga', 'https://' + 'x'.repeat(1993))],
    [enlace('Vacía', '')],
    [enlace('Número', 5)],
  ]),
]

export const MUTADORES_POR_DEFECTO: readonly MutadorDeDiseno[] = [
  {
    nombre: 'modo_por_defecto_inexistente',
    aplicar: (e) => {
      const c = cabecera(e)
      if (!c) return null
      c['modo_por_defecto'] = 'zzz'
      return 'modo_por_defecto_inexistente'
    },
  },
  {
    nombre: 'modo_visible_inexistente',
    aplicar: (e, azar) => {
      const c = cabecera(e)
      const todas = claves(e)
      if (!c || todas.length === 0) return null
      const lista: Json[] = [...todas]
      lista.splice(azar.entero(lista.length + 1), 0, 'zzz')
      c['modos_visibles'] = lista
      return `modo_visible_inexistente(${String(lista.indexOf('zzz'))})`
    },
  },
  {
    nombre: 'modo_visible_repetido',
    aplicar: (e, azar) => {
      const c = cabecera(e)
      const todas = claves(e)
      const otra = elegir(azar, todas)
      if (!c || otra === undefined) return null
      c['modos_visibles'] = [...todas, otra]
      return `modo_visible_repetido(${otra})`
    },
  },
  {
    nombre: 'modo_por_defecto_oculto',
    aplicar: (e, azar) => {
      const c = cabecera(e)
      const todas = claves(e)
      if (!c || todas.length === 0) return null
      // Sin modo por defecto, el primero; con uno escrito, ése.
      const oculto = azar.entero(2) === 0 ? todas[0] : elegir(azar, todas)
      if (oculto === undefined) return null
      if (oculto !== todas[0]) c['modo_por_defecto'] = oculto
      c['modos_visibles'] = todas.filter((x) => x !== oculto)
      return `modo_por_defecto_oculto(${oculto})`
    },
  },
  {
    nombre: 'ver_total_bs_por_defecto_no_ofrecido',
    aplicar: (e) => {
      const c = cabecera(e)
      if (!c) return null
      c['ver_total_bs'] = false
      c['ver_total_bs_por_defecto'] = true
      return 'ver_total_bs_por_defecto_no_ofrecido'
    },
  },
  {
    nombre: 'ayuda_enlace_no_https',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      const url =
        elegir(azar, [
          'http://www.copart.com/',
          'https://',
          'https://a b',
          'javascript:alert(1)',
          'https://ñ.bo',
        ]) ?? 'http://x'
      const enlaces: Json[] = [bueno]
      enlaces.splice(azar.entero(2), 0, enlace('Mala', url))
      c['ayuda'] = { texto: 'Consulta la fuente.', enlaces }
      return `ayuda_enlace_no_https(${url})`
    },
  },
  {
    nombre: 'por_defecto_valido',
    aplicar: (e, azar) => {
      const c = cabecera(e)
      const ultima = claves(e).at(-1)
      if (!c || ultima === undefined) return null
      c['modo_por_defecto'] = ultima
      c['modos_visibles'] = [ultima]
      c['ver_total_bs_por_defecto'] = c['ver_total_bs'] === true && azar.entero(2) === 0
      return `por_defecto_valido(${ultima})`
    },
  },
  {
    nombre: 'ayuda_con_enlaces',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      const n = 1 + azar.entero(5)
      c['ayuda'] = { texto: 'Consulta la fuente.', enlaces: Array.from({ length: n }, () => bueno) }
      return `ayuda_con_enlaces(${String(n)})`
    },
  },
]
