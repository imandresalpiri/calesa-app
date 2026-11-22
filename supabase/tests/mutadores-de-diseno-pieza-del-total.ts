// Los mutadores del corpus de `validar_diseno()` de la tarjeta del total como pieza (`{ tipo: 'total' }`, sin `nodo`): los que rompen sus tres
// reglas (`total_repetido`, `total_en_avanzado`, `total_con_nivel`) y uno que la ubica bien. Cada uno deja a lo sumo las piezas que dice y
// no pasa del tope de ítems (`demasiados_items` va antes y taparía la regla).
import { MAXIMO_DE_ITEMS_DEL_DISENO } from '@/modules/cotizaciones/entities/diseno'
import { elegir, esObjeto, type Azar, type Objeto } from './mutadores-de-formula'
import {
  deTipo,
  itemsDe,
  lista,
  secciones,
  texto,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'

const esTotal = deTipo('total')
const cuantosItems = (e: Entrada) => itemsDe(e).length

// Una sección donde la pieza vale: principal y sin nivel de ver.
const admiteElTotal = (s: Objeto) =>
  texto(s, 'presentacion') === 'principal' && s['nivel_ver'] === undefined

function quitarLosTotales(e: Entrada) {
  for (const s of secciones(e)) {
    const items = s['items']
    if (Array.isArray(items)) s['items'] = items.filter((it) => !(esObjeto(it) && esTotal(it)))
  }
}

// La pieza, a veces con su aspecto (ancho de 1 a 12, alto de 1 a 4, letra y énfasis).
function pieza(azar: Azar): Objeto {
  const p: Objeto = { tipo: 'total' }
  if (azar.entero(2) === 0) p['ancho'] = 1 + azar.entero(12)
  if (azar.entero(3) === 0) p['alto'] = 1 + azar.entero(4)
  if (azar.entero(3) === 0) p['letra'] = elegir(azar, ['chica', 'normal', 'grande']) ?? 'grande'
  if (azar.entero(3) === 0) p['enfasis'] = elegir(azar, ['normal', 'fuerte']) ?? 'fuerte'
  return p
}

// Inserta la pieza en `s`, en `desde` o después (al azar).
function insertar(s: Objeto, p: Objeto, azar: Azar, desde = 0) {
  const items = s['items']
  if (!Array.isArray(items)) return
  const k = desde + azar.entero(items.length - desde + 1)
  items.splice(k, 0, p)
}

export const MUTADORES_DE_LA_PIEZA_DEL_TOTAL: readonly MutadorDeDiseno[] = [
  {
    // Dos piezas: la primera en una sección que la admite y la segunda en la misma (detrás) o en una posterior. Cae la segunda.
    nombre: 'total_dos_veces',
    aplicar: (e, azar) => {
      quitarLosTotales(e)
      const todas = secciones(e)
      const i = elegir(
        azar,
        todas.flatMap((s, k) => (admiteElTotal(s) ? [k] : [])),
      )
      const s = i === undefined ? undefined : todas[i]
      if (i === undefined || !s || cuantosItems(e) + 2 > MAXIMO_DE_ITEMS_DEL_DISENO) return null
      const k = azar.entero(lista(s['items']).length + 1)
      lista(s['items']).splice(k, 0, pieza(azar))
      const j = i + azar.entero(todas.length - i)
      const otra = todas[j]
      if (!otra) return null
      insertar(otra, pieza(azar), azar, j === i ? k + 1 : 0)
      return `total_dos_veces(${texto(s, 'id') ?? '?'},${texto(otra, 'id') ?? '?'})`
    },
  },
  {
    // La única pieza, en una sección avanzada (si la elegida es principal, pasa a avanzada: eso solo vale).
    nombre: 'total_a_una_avanzada',
    aplicar: (e, azar) => {
      quitarLosTotales(e)
      const s = elegir(azar, secciones(e))
      if (!s || cuantosItems(e) + 1 > MAXIMO_DE_ITEMS_DEL_DISENO) return null
      s['presentacion'] = 'avanzado'
      insertar(s, pieza(azar), azar)
      return `total_a_una_avanzada(${texto(s, 'id') ?? '?'})`
    },
  },
  {
    // La única pieza, primera de una sección principal con nivel de ver (y el mismo de editar: si no, `editar_sin_ver` iría antes). Sin un
    // nivel vigente en el contexto, suma uno.
    nombre: 'total_en_seccion_con_nivel',
    aplicar: (e, azar) => {
      quitarLosTotales(e)
      const s = elegir(azar, secciones(e))
      if (!s || cuantosItems(e) + 1 > MAXIMO_DE_ITEMS_DEL_DISENO) return null
      let nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (nivel === undefined) {
        nivel = 'nivel_del_total'
        e.contexto.niveles.push(nivel)
      }
      s['presentacion'] = 'principal'
      s['nivel_ver'] = nivel
      s['nivel_editar'] = nivel
      lista(s['items']).unshift(pieza(azar))
      return `total_en_seccion_con_nivel(${texto(s, 'id') ?? '?'},${nivel})`
    },
  },
  {
    // Válido: una sola pieza, en una sección principal sin nivel de ver, en cualquier lugar y con o sin aspecto.
    nombre: 'total_en_la_hoja',
    aplicar: (e, azar) => {
      quitarLosTotales(e)
      const s = elegir(azar, secciones(e).filter(admiteElTotal))
      if (!s || cuantosItems(e) + 1 > MAXIMO_DE_ITEMS_DEL_DISENO) return null
      insertar(s, pieza(azar), azar)
      return `total_en_la_hoja(${texto(s, 'id') ?? '?'})`
    },
  },
]
