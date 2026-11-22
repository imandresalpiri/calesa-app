// Los mutadores de forma del aspecto de las secciones y de los ítems (D60–D76 de `_diseno_forma()` y `_diseno_forma_item()`), uno por marca
// como los de `mutadores-de-diseno-forma.ts`. Los de la cabecera (D35–D38) van allá, con los demás de la cabecera.
import {
  deTipo,
  itemsDe,
  secciones,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'
import { elegir, type Azar, type Json, type Objeto } from './mutadores-de-formula'

type Objetivo = (e: Entrada, azar: Azar) => Objeto | undefined
const TIPOS = ['celda', 'atajos', 'variante', 'interruptor', 'subtotal', 'total']
const unaSeccion: Objetivo = (e, azar) => elegir(azar, secciones(e))
const unItem =
  (...tipos: string[]): Objetivo =>
  (e, azar) =>
    elegir(azar, itemsDe(e, deTipo(...tipos)))?.it

// Pone en `clave` un valor elegido al azar entre los de su lista; `claves` dice cuáles se pueden romper (el ancho o el alto).
function marca(
  nombre: string,
  objetivo: Objetivo,
  valores: Record<string, readonly Json[]>,
): MutadorDeDiseno {
  return {
    nombre: `forma_${nombre}`,
    aplicar: (e, azar) => {
      const o = objetivo(e, azar)
      if (!o) return null
      const clave = elegir(azar, Object.keys(valores)) ?? ''
      const valor = elegir(azar, [...(valores[clave] ?? [])]) ?? null
      o[clave] = valor
      return `forma_${nombre}(${clave}=${JSON.stringify(valor)})`
    },
  }
}

export const MUTADORES_DE_FORMA_DEL_ASPECTO: readonly MutadorDeDiseno[] = [
  // Las columnas y las filas de una sección.
  marca('D60', unaSeccion, { ancho: ['6', true, null], alto: ['2', [2]] }),
  marca('D61', unaSeccion, { ancho: [0], alto: [0] }),
  marca('D62', unaSeccion, { ancho: [13, 100], alto: [5, 9] }),
  marca('D63', unaSeccion, { ancho: [6.5, -2, 0.5], alto: [1.5, -1] }),
  marca('D64', unaSeccion, { relleno: ['enorme', 'p-4', 1] }),
  marca('D65', unaSeccion, { separacion: ['ninguna', null] }),
  marca('D66', unaSeccion, { densidad: ['apretada', true] }),
  marca('D67', unaSeccion, { letra: ['gigante', '16px'] }),
  marca('D68', unaSeccion, { enfasis: ['cursiva', 'bold'] }),
  marca('D69', unaSeccion, { tono: ['Compra', '#ff0000', 7] }),
  // Una celda sin su ancho.
  {
    nombre: 'forma_D70',
    aplicar: (e, azar) => {
      const c = unItem('celda')(e, azar)
      if (!c) return null
      delete c['ancho']
      return 'forma_D70'
    },
  },
  // Las columnas y las filas de un ítem (un ancho de texto en una celda es D44: aquí, otro tipo).
  marca('D71', unItem(...TIPOS), { ancho: [null, true], alto: ['2', null] }),
  marca('D72', unItem(...TIPOS), { ancho: [0], alto: [0] }),
  marca('D73', unItem(...TIPOS), { ancho: [13, 50], alto: [5, 8] }),
  marca('D74', unItem(...TIPOS), { ancho: [6.5, -3], alto: [2.5, -1] }),
  marca('D75', unItem(...TIPOS), { letra: ['gigante', 2] }),
  marca('D76', unItem(...TIPOS), { enfasis: ['cursiva', false] }),
]
