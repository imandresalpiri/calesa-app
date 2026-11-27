// A qué pieza del lienzo apunta un rechazo de `validarDiseno()` (el editor de la hoja la marca con su mensaje y «Publicar…» lleva ahí). `donde` es un id de
// sección o de nodo según la regla, y los dos comparten el espacio de nombres: por eso cada regla dice qué nombra, en un registro exhaustivo (una regla nueva
// no compila sin su lugar). Las del total apuntan a la tarjeta del total aunque `donde` sea su sección: es la pieza que se mueve.
import type { Diseno, ItemDeDiseno, SeccionDeDiseno } from '../diseno'
import type { RechazoDeDiseno, ReglaDeDiseno } from '../motivos-de-diseno'
import { primeraPiezaQueNoCabe } from '../validar-diseno-rejilla'
import { piezaDelItemDeLaHoja, type PiezaDeLaHoja } from './pieza-de-la-hoja'

type QueNombra =
  | 'campo'
  | 'seccion'
  | 'nodo'
  | 'seccion_o_nodo'
  | 'atajos'
  | 'total'
  | 'tarjeta'
  | 'cabecera'
  | 'sin_lugar'
  | 'tono'
  | 'rejilla'

const QUE_NOMBRA: Record<ReglaDeDiseno, QueNombra> = {
  forma: 'campo',
  demasiados_items: 'seccion',
  modo_duplicado: 'cabecera',
  modo_sin_total_en: 'cabecera',
  modo_bucket_inexistente: 'cabecera',
  modo_bucket_repetido: 'cabecera',
  modo_tipo_de_cambio_inexistente: 'cabecera',
  modo_incompleto: 'cabecera',
  modo_por_defecto_inexistente: 'cabecera',
  modo_visible_inexistente: 'cabecera',
  modo_visible_repetido: 'cabecera',
  modo_por_defecto_oculto: 'cabecera',
  ver_total_bs_por_defecto_no_ofrecido: 'cabecera',
  seccion_duplicada: 'seccion',
  nivel_inexistente: 'seccion_o_nodo',
  nivel_retirado: 'seccion_o_nodo',
  total_repetido: 'total',
  total_en_avanzado: 'total',
  total_con_nivel: 'total',
  pieza_fuera_de_la_rejilla: 'rejilla',
  piezas_se_pisan: 'rejilla',
  nodo_inexistente: 'nodo',
  celda_no_es_valor: 'nodo',
  secundario_sin_porcentaje: 'nodo',
  par_sin_secundario: 'nodo',
  atajos_no_es_tabla: 'atajos',
  atajos_no_sobrescribible: 'atajos',
  variante_no_es_opcion: 'nodo',
  interruptor_no_es_bandera: 'nodo',
  interruptor_sin_efecto: 'nodo',
  subtotal_no_es_calculo: 'nodo',
  nivel_no_admitido: 'nodo',
  editar_sin_ver: 'seccion_o_nodo',
  nodo_repetido: 'nodo',
  tarjeta_no_es_el_total: 'tarjeta',
  tarjeta_secundario_no_es_aparte: 'tarjeta',
  atajos_sin_celda: 'atajos',
  nodo_con_dos_niveles: 'atajos',
  nodo_sin_seccion: 'sin_lugar',
  tono_inexistente: 'tono',
  ayuda_enlace_no_https: 'nodo',
  ayuda_tabla_inexistente: 'nodo',
  ayuda_columna_inexistente: 'nodo',
  ayuda_llena_no_acepta_valor: 'nodo',
}

// Una pieza del lienzo, o una fila de la fórmula sin lugar en la hoja (`nodo_sin_seccion`: la lista «Sin lugar en la hoja»).
export type LugarEnLaHoja =
  { tipo: 'pieza'; pieza: PiezaDeLaHoja } | { tipo: 'sin_lugar'; nodo: string }

const pieza = (p: PiezaDeLaHoja): LugarEnLaHoja => ({ tipo: 'pieza', pieza: p })
const TOTAL = pieza({ pieza: 'total' })
const CABECERA = pieza({ pieza: 'cabecera' })

const items = (d: Diseno): ItemDeDiseno[] => d.secciones.flatMap((s) => s.items)
const laSeccion = (d: Diseno, id: string | undefined): SeccionDeDiseno | undefined =>
  d.secciones.find((s) => s.id === id)
const deLaSeccion = (id: string) => pieza({ pieza: 'seccion', seccion: id })

// El ítem que dibuja el nodo (antes que sus atajos); si sólo lo nombra la tarjeta del total, la tarjeta.
function delNodo(d: Diseno, nodo: string | undefined): LugarEnLaHoja | null {
  if (nodo === undefined) return null
  const todos = items(d)
  const dibujo =
    todos.find((it) => it.tipo !== 'total' && it.tipo !== 'atajos' && it.nodo === nodo) ??
    todos.find((it) => it.tipo === 'atajos' && it.nodo === nodo)
  if (dibujo !== undefined) return pieza(piezaDelItemDeLaHoja(dibujo))
  const tarjeta = d.tarjeta_total
  return tarjeta.nodo === nodo || tarjeta.secundarios.includes(nodo) ? TOTAL : null
}

// La sección si lleva nivel (es la que lo nombra); si no, el ítem del nodo.
function deSeccionONodo(d: Diseno, donde: string | undefined): LugarEnLaHoja | null {
  const s = laSeccion(d, donde)
  if (s !== undefined && (s.nivel_ver !== undefined || s.nivel_editar !== undefined)) {
    return deLaSeccion(s.id)
  }
  return delNodo(d, donde) ?? (s === undefined ? null : deLaSeccion(s.id))
}

const indice = (texto: string | undefined) =>
  texto !== undefined && /^\d+$/.test(texto) ? Number(texto) : -1

// La pieza de un rechazo de la rejilla: la primera que no cabe en el diseño de trabajo; si ya cabe todo, la sección o el nodo que nombra.
function deLaRejilla(d: Diseno, donde: string | undefined): LugarEnLaHoja | null {
  const choque = primeraPiezaQueNoCabe(d)
  if (choque === null) return conSeccion(d, donde) ?? delNodo(d, donde)
  return choque.item === undefined
    ? deLaSeccion(choque.seccion.id)
    : pieza(piezaDelItemDeLaHoja(choque.item))
}

// La ruta de Zod de un rechazo de forma: `diseno.secciones.2.items.1.alto` (o `….posicion.fila`) es ese ítem; `diseno.secciones.2.relleno`, la sección;
// `diseno.avanzado`, el bloque «Avanzado»; la cabecera y la tarjeta, las suyas.
function delCampo(d: Diseno, campo: string | undefined): LugarEnLaHoja | null {
  const [raiz, parte, a, b, c] = (campo ?? '').split('.')
  if (raiz !== 'diseno') return null
  if (parte === 'cabecera') return CABECERA
  if (parte === 'tarjeta_total') return TOTAL
  if (parte === 'avanzado') return pieza({ pieza: 'bloque-avanzado' })
  const s = parte === 'secciones' ? d.secciones[indice(a)] : undefined
  if (s === undefined) return null
  const it = b === 'items' && c !== undefined ? s.items[indice(c)] : undefined
  return it === undefined ? deLaSeccion(s.id) : pieza(piezaDelItemDeLaHoja(it))
}

type Rechazo = Pick<RechazoDeDiseno, 'regla' | 'donde' | 'campo'>

const conSeccion = (d: Diseno, donde: string | undefined) => {
  const s = laSeccion(d, donde)
  return s === undefined ? null : deLaSeccion(s.id)
}

const RESOLVER: Record<QueNombra, (d: Diseno, r: Rechazo) => LugarEnLaHoja | null> = {
  campo: (d, r) => delCampo(d, r.campo),
  seccion: (d, r) => conSeccion(d, r.donde),
  nodo: (d, r) => delNodo(d, r.donde),
  seccion_o_nodo: (d, r) => deSeccionONodo(d, r.donde),
  atajos: (_d, r) => (r.donde === undefined ? null : pieza({ pieza: 'atajos', nodo: r.donde })),
  total: () => TOTAL,
  tarjeta: () => TOTAL,
  cabecera: () => CABECERA,
  sin_lugar: (_d, r) => (r.donde === undefined ? null : { tipo: 'sin_lugar', nodo: r.donde }),
  // El tono de un grupo es de la planilla: en la hoja no tiene pieza.
  tono: (d, r) => (r.donde === 'cabecera' ? CABECERA : conSeccion(d, r.donde)),
  rejilla: (d, r) => deLaRejilla(d, r.donde),
}

export const lugarDelRechazo = (d: Diseno, rechazo: Rechazo): LugarEnLaHoja | null =>
  RESOLVER[QUE_NOMBRA[rechazo.regla]](d, rechazo)
