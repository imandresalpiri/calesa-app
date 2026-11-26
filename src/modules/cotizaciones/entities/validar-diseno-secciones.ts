// §2 y §3 de `validarDiseno()`: las secciones, ítem por ítem, y la tarjeta del total. Un ítem se revisa entero, en el orden de la
// fila, antes del siguiente; lo que cruza ítems (dónde se dibuja cada nodo, los atajos) queda en el `Estado` para §4 y §5. La geometría de la
// rejilla (`validar-diseno-rejilla.ts`) va tras las reglas propias de cada sección y, en cada ítem, tras `nodo_repetido`.
import {
  NIVEL_TODOS,
  type CeldaDeDiseno,
  type Diseno,
  type ItemConNodo,
  type SeccionDeDiseno,
} from './diseno'
import { buscar, esta, recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Nodo } from './nodos'
import { revisarNivel, type Estado, type Indice } from './validar-diseno-contexto'
import {
  ocupacionesDeLasSecciones,
  revisarGeometriaDeLaSeccion,
  revisarGeometriaDelItem,
} from './validar-diseno-rejilla'

// Los niveles de una sección ya revisada: lo que un ítem hereda.
type Niveles = { ver: string; editar: string }

export function revisarSecciones(ix: Indice, d: Diseno, e: Estado): FalloDeDiseno | undefined {
  const vistas = new Set<string>()
  const espacios = ocupacionesDeLasSecciones(d)
  for (const s of recorrer(d.secciones, ix.m)) {
    if (esta(vistas, s.id, ix.m)) return fallo('seccion_duplicada', { donde: s.id })
    vistas.add(s.id)
    const rechazo =
      revisarLaSeccion(ix, s) ??
      revisarGeometriaDeLaSeccion(espacios[s.presentacion], s, ix.m) ??
      revisarLosItems(ix, e, s)
    if (rechazo !== undefined) return rechazo
  }
  return undefined
}

// Las reglas propias de una sección: sus niveles y que no edite sin ver.
function revisarLaSeccion(ix: Indice, s: SeccionDeDiseno): FalloDeDiseno | undefined {
  const r = revisarNivel(ix, s.nivel_ver, s.id) ?? revisarNivel(ix, s.nivel_editar, s.id)
  if (r !== undefined) return r
  return editaSinVer(s.nivel_ver, s.nivel_editar)
    ? fallo('editar_sin_ver', { donde: s.id })
    : undefined
}

// Los ítems de una sección, cada uno entero (sus reglas y después su geometría) antes del siguiente.
function revisarLosItems(ix: Indice, e: Estado, s: SeccionDeDiseno): FalloDeDiseno | undefined {
  const heredados = { ver: s.nivel_ver ?? NIVEL_TODOS, editar: s.nivel_editar ?? NIVEL_TODOS }
  const celdas = new Set<number>()
  for (const item of recorrer(s.items, ix.m)) {
    const rechazo =
      (item.tipo === 'total'
        ? revisarTotal(e, s, heredados)
        : revisarItem(ix, e, item, heredados)) ?? revisarGeometriaDelItem(celdas, s, item, ix.m)
    if (rechazo !== undefined) return rechazo
  }
  return undefined
}

// La tarjeta del total como pieza: una sola en el diseño, en una sección principal y sin nivel de ver (el total lo ven todos). `donde` es la
// sección; no nombra un nodo (su nodo es el de `tarjeta_total`, que revisa §3) ni cuenta como dibujo de uno.
function revisarTotal(e: Estado, s: SeccionDeDiseno, sec: Niveles): FalloDeDiseno | undefined {
  const repetido = e.totalVisto
  const avanzada = s.presentacion === 'avanzado'
  const conNivel = sec.ver !== NIVEL_TODOS
  if (repetido) return fallo('total_repetido', { donde: s.id })
  if (avanzada) return fallo('total_en_avanzado', { donde: s.id })
  if (conNivel) return fallo('total_con_nivel', { donde: s.id })
  e.totalVisto = true
  return undefined
}

function revisarItem(
  ix: Indice,
  e: Estado,
  item: ItemConNodo,
  sec: Niveles,
): FalloDeDiseno | undefined {
  const nodo = buscar(ix.nodos, item.nodo, ix.m)
  if (nodo === undefined) return fallo('nodo_inexistente', { donde: item.nodo })
  const propios =
    item.tipo === 'celda'
      ? { ver: item.nivel_ver ?? sec.ver, editar: item.nivel_editar ?? sec.editar }
      : sec
  const rechazo =
    revisarTipo(ix, item, nodo) ??
    (item.tipo === 'celda'
      ? (revisarNivel(ix, item.nivel_ver, nodo.id) ?? revisarNivel(ix, item.nivel_editar, nodo.id))
      : undefined) ??
    revisarNivelAbierto(ix, item, nodo, propios.ver) ??
    revisarEditarSinVer(item, nodo, propios)
  return rechazo ?? registrar(ix, e, item, { nodo, propios, sec })
}

// Que el nodo sea de la clase que el ítem dibuja, en el orden de cada ítem.
function revisarTipo(ix: Indice, item: ItemConNodo, nodo: Nodo): FalloDeDiseno | undefined {
  const donde = nodo.id
  switch (item.tipo) {
    case 'celda':
      return revisarCelda(item, nodo)
    case 'atajos':
      if (nodo.tipo !== 'tabla') return fallo('atajos_no_es_tabla', { donde })
      return nodo.sobrescribible === true ? undefined : fallo('atajos_no_sobrescribible', { donde })
    case 'variante':
      return nodo.tipo === 'opcion' ? undefined : fallo('variante_no_es_opcion', { donde })
    case 'interruptor':
      if (nodo.tipo !== 'bandera') return fallo('interruptor_no_es_bandera', { donde })
      return interruptorHace(ix, item.efecto, nodo.id)
        ? undefined
        : fallo('interruptor_sin_efecto', { donde })
    case 'subtotal':
      return nodo.tipo === 'calculo' ? undefined : fallo('subtotal_no_es_calculo', { donde })
    default: {
      const _: never = item
      return _
    }
  }
}

function revisarCelda(item: CeldaDeDiseno, nodo: Nodo): FalloDeDiseno | undefined {
  const donde = nodo.id
  if (nodo.tipo === 'opcion' || nodo.tipo === 'bandera')
    return fallo('celda_no_es_valor', { donde })
  const esPorcentaje = nodo.tipo === 'calculo' && nodo.op === 'porcentaje_de'
  if (item.secundario !== undefined && !esPorcentaje) {
    return fallo('secundario_sin_porcentaje', { donde })
  }
  if (esPorcentaje && nodo.sobrescribible === true && item.secundario === undefined) {
    return fallo('par_sin_secundario', { donde })
  }
  return undefined
}

// «Habilita» apaga (deshabilita) lo que la bandera condiciona o pide; «muestra» sólo lo que condiciona.
function interruptorHace(ix: Indice, efecto: 'habilita' | 'muestra', bandera: string): boolean {
  if (esta(ix.condicionadas, bandera, ix.m)) return true
  return efecto === 'habilita' && esta(ix.requeridas, bandera, ix.m)
}

// El total, lo que va aparte y la variante los recibe todo el mundo: la base siempre manda el total y las salidas aparte (D7), y la
// variante titula el PDF, que sólo lleva lo del nivel «todos». «Lo que va aparte» incluye el porcentaje que muestra una celda con
// secundario y la bandera de un interruptor (4-9): se dibujan con el nivel de su ítem, y la base los manda igual.
function revisarNivelAbierto(
  ix: Indice,
  item: ItemConNodo,
  nodo: Nodo,
  ver: string,
): FalloDeDiseno | undefined {
  if (ver === NIVEL_TODOS) return undefined
  const suyo =
    item.tipo === 'variante' ||
    ((item.tipo === 'celda' || item.tipo === 'subtotal') && sinNivel(nodo))
  if (suyo) return fallo('nivel_no_admitido', { donde: nodo.id })
  const pct = item.tipo === 'celda' && item.secundario !== undefined ? pctDe(ix, nodo) : undefined
  if (pct !== undefined && sinNivel(pct)) return fallo('nivel_no_admitido', { donde: pct.id })
  return item.tipo === 'interruptor' && sinNivel(nodo)
    ? fallo('nivel_no_admitido', { donde: nodo.id })
    : undefined
}

// Lo que no se ve no se edita: un nivel de ver restringido con el de editar abierto se rechaza (ver abierto con editar restringido vale: se ve y no se edita
// sin el permiso). Una sección ya revisada no lo tiene, así que sus ítems sólo lo rompen con el nivel propio de una celda.
const editaSinVer = (ver: string | undefined, editar: string | undefined) =>
  (ver ?? NIVEL_TODOS) !== NIVEL_TODOS && (editar ?? NIVEL_TODOS) === NIVEL_TODOS

function revisarEditarSinVer(
  item: ItemConNodo,
  nodo: Nodo,
  propios: Niveles,
): FalloDeDiseno | undefined {
  return item.tipo === 'celda' && editaSinVer(propios.ver, propios.editar)
    ? fallo('editar_sin_ver', { donde: nodo.id })
    : undefined
}

// El total y lo que va aparte no admiten un nivel.
const sinNivel = (nodo: Nodo) => nodo.salida === 'total' || nodo.salida === 'aparte'

// El nodo del porcentaje de un par (`porcentaje_de`), o nada si el nodo no lo es.
function pctDe(ix: Indice, nodo: Nodo): Nodo | undefined {
  return nodo.tipo === 'calculo' && nodo.op === 'porcentaje_de'
    ? buscar(ix.nodos, nodo.pct, ix.m)
    : undefined
}

// Anota dónde se dibuja el valor del nodo (y el del porcentaje de un par); un segundo dibujo es `nodo_repetido`.
type Dibujo = { nodo: Nodo; propios: Niveles; sec: Niveles }

function registrar(
  ix: Indice,
  e: Estado,
  item: ItemConNodo,
  dibujo: Dibujo,
): FalloDeDiseno | undefined {
  const { nodo, propios, sec } = dibujo
  if (item.tipo === 'atajos') {
    if (esta(e.atajosVistos, nodo.id, ix.m)) return fallo('nodo_repetido', { donde: nodo.id })
    e.atajosVistos.add(nodo.id)
    e.atajos.push({ nodo: nodo.id, ver: sec.ver, editar: sec.editar })
    return undefined
  }
  if (buscar(e.apariciones, nodo.id, ix.m) !== undefined) {
    return fallo('nodo_repetido', { donde: nodo.id })
  }
  e.apariciones.set(nodo.id, { ...propios })
  if (item.tipo === 'celda' && item.secundario !== undefined && nodo.tipo === 'calculo') {
    if (nodo.op !== 'porcentaje_de') return undefined
    if (buscar(e.apariciones, nodo.pct, ix.m) !== undefined) {
      return fallo('nodo_repetido', { donde: nodo.pct })
    }
    e.apariciones.set(nodo.pct, { ...propios })
  }
  return undefined
}

// §3 la tarjeta: el total y sus secundarios (la garantía), que repiten lo que la hoja ya dibuja.
export function revisarTarjeta(ix: Indice, d: Diseno): FalloDeDiseno | undefined {
  const total = buscar(ix.nodos, d.tarjeta_total.nodo, ix.m)
  if (total === undefined) return fallo('nodo_inexistente', { donde: d.tarjeta_total.nodo })
  if (total.salida !== 'total') return fallo('tarjeta_no_es_el_total', { donde: total.id })
  const vistos = new Set<string>()
  for (const id of recorrer(d.tarjeta_total.secundarios, ix.m)) {
    const nodo = buscar(ix.nodos, id, ix.m)
    if (nodo === undefined) return fallo('nodo_inexistente', { donde: id })
    if (nodo.salida !== 'aparte') return fallo('tarjeta_secundario_no_es_aparte', { donde: id })
    if (esta(vistos, id, ix.m)) return fallo('nodo_repetido', { donde: id })
    vistos.add(id)
  }
  return undefined
}
