// Lo que «Dato» ofrece: las variables cerradas de la tarjeta con su nombre en español y los nodos de la fórmula publicada del nivel «todos», por grupo, con lo que
// cada uno puede mostrar (la misma regla que `mostrar_no_admitido` de la base). Un nodo restringido que la plantilla ya nombra se lista marcado: con él no se podría
// publicar. Puro. Todo por id va por `Map`/`Set`.
import {
  MOSTRAR,
  VARIABLES_DE_LA_TARJETA,
  type DatoDeLaCelda,
  type Mostrar,
  type VariableDeLaTarjeta,
} from '../../cuadricula-de-la-tarjeta'
import { pctDelPar, pctsDeLosPares } from '../nodos-de-cuadricula'
import { esDeTodos } from '../nodos-de-plantilla'
import type { ContextoDePlantilla } from '../validar-plantilla'

// Lo que se dibuja del picker: a lo sumo esto, y «Escribe para acotar.».
export const TOPE_DE_DATOS_A_LA_VISTA = 50

export const NOMBRES_DE_LAS_VARIABLES: Readonly<Record<VariableDeLaTarjeta, string>> = {
  empresa_nombre: 'Nombre de la empresa',
  fecha_larga: 'Fecha',
  numero: 'Número de la cotización',
  titulo: 'Título de la cotización',
  titulo_opcion: 'Título de la opción',
  asesor_nombre: 'Nombre del asesor',
  asesor_iniciales: 'Iniciales del asesor',
  cliente_nombre: 'Nombre del cliente',
  vehiculo_titulo: 'Vehículo',
  vehiculo_lote: 'Lote del vehículo',
  vehiculo_vin: 'VIN del vehículo',
  vence_el: 'Vence el',
  modo_tc: 'Modo de tipo de cambio',
  asesor_telefono: 'WhatsApp del asesor',
  asesor_cargo: 'Cargo del asesor',
}

export const NOMBRES_DE_MOSTRAR: Readonly<Record<Mostrar, string>> = {
  monto: 'Monto',
  etiqueta: 'Etiqueta',
  descripcion: 'Descripción',
  porcentaje: 'Porcentaje',
  tc_nombre: 'Nombre del tipo de cambio',
  tc_valor: 'Valor del tipo de cambio',
  plazo: 'Plazo',
}

export const nombreDeLaVariable = (v: string): string =>
  Object.hasOwn(NOMBRES_DE_LAS_VARIABLES, v)
    ? NOMBRES_DE_LAS_VARIABLES[v as VariableDeLaTarjeta]
    : v
export const nombreDeMostrar = (m: string): string =>
  Object.hasOwn(NOMBRES_DE_MOSTRAR, m) ? NOMBRES_DE_MOSTRAR[m as Mostrar] : m

export const VARIABLES_PARA_ELEGIR = VARIABLES_DE_LA_TARJETA.map((clave) => ({
  clave,
  nombre: NOMBRES_DE_LAS_VARIABLES[clave],
}))

const DEL_GRUPO: ReadonlySet<string> = new Set(['tc_nombre', 'tc_valor', 'plazo'])

// Lo que un nodo puede mostrar: siempre su monto, su etiqueta y su descripción; el porcentaje sólo si es de un par porcentaje-monto; el tipo de cambio y el plazo,
// sólo si es de un grupo de la fórmula.
export function mostrarQueAdmite(nodo: string, contexto: ContextoDePlantilla): Mostrar[] {
  const nodos = contexto.definicion.nodos ?? []
  const n = nodos.find((x) => x.id === nodo)
  const grupos = new Set((contexto.definicion.grupos ?? []).map((g) => g.id))
  const conGrupo = n?.grupo != null && grupos.has(n.grupo)
  const conPar = pctDelPar(n, pctsDeLosPares(nodos)) !== null
  return MOSTRAR.filter((m) => {
    if (m === 'porcentaje') return conPar
    return DEL_GRUPO.has(m) ? conGrupo : true
  })
}

export type NodoParaElegir = {
  readonly id: string
  readonly etiqueta: string
  readonly restringido: boolean
}
export type GrupoParaElegir = {
  readonly id: string | null
  readonly etiqueta: string
  readonly nodos: readonly NodoParaElegir[]
}

// Los nodos del nivel «todos» (y los restringidos que la plantilla ya nombra), agrupados en el orden de los grupos de la fórmula; los que no son de un grupo (el total,
// lo aparte, los demás) van al final en «Otros».
export function nodosParaElegir(
  contexto: ContextoDePlantilla,
  nombrados: ReadonlySet<string>,
): GrupoParaElegir[] {
  const vis = contexto.visibilidad ?? {}
  const porGrupo = new Map<string | null, NodoParaElegir[]>()
  for (const n of contexto.definicion.nodos ?? []) {
    const deTodos = esDeTodos(vis, n.id)
    if (!deTodos && !nombrados.has(n.id)) continue
    const lista = porGrupo.get(n.grupo ?? null) ?? []
    lista.push({ id: n.id, etiqueta: n.etiqueta || n.id, restringido: !deTodos })
    porGrupo.set(n.grupo ?? null, lista)
  }
  const grupos: GrupoParaElegir[] = (contexto.definicion.grupos ?? []).flatMap((g) => {
    const nodos = porGrupo.get(g.id)
    porGrupo.delete(g.id)
    return nodos === undefined ? [] : [{ id: g.id, etiqueta: g.etiqueta || g.id, nodos }]
  })
  const otros = [...porGrupo.values()].flat()
  return distinguirRepetidas(
    otros.length === 0 ? grupos : [...grupos, { id: null, etiqueta: 'Otros', nodos: otros }],
  )
}

// Dos nodos con la misma etiqueta («Transporte» a Bolivia y a Chile) se distinguen con su id: «Transporte (transporte_chile)».
function distinguirRepetidas(grupos: GrupoParaElegir[]): GrupoParaElegir[] {
  const cuantas = new Map<string, number>()
  for (const n of grupos.flatMap((g) => g.nodos))
    cuantas.set(n.etiqueta, (cuantas.get(n.etiqueta) ?? 0) + 1)
  return grupos.map((g) => ({
    ...g,
    nodos: g.nodos.map((n) =>
      (cuantas.get(n.etiqueta) ?? 0) > 1 ? { ...n, etiqueta: `${n.etiqueta} (${n.id})` } : n,
    ),
  }))
}

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')

// Lo que se dibuja con lo escrito: los nodos cuya etiqueta (o id) contiene el texto, sin acentos ni mayúsculas, hasta el tope; `hayMas` si quedaron fuera.
export function acotarDatos(
  grupos: readonly GrupoParaElegir[],
  texto: string,
  tope = TOPE_DE_DATOS_A_LA_VISTA,
): { grupos: GrupoParaElegir[]; hayMas: boolean } {
  const buscado = normal(texto.trim())
  let quedan = tope
  let hayMas = false
  const acotados = grupos.flatMap((g) => {
    const coinciden = g.nodos.filter(
      (n) =>
        buscado === '' || normal(n.etiqueta).includes(buscado) || normal(n.id).includes(buscado),
    )
    if (coinciden.length > quedan) hayMas = true
    const tomados = coinciden.slice(0, Math.max(0, quedan))
    quedan -= tomados.length
    return tomados.length === 0 ? [] : [{ ...g, nodos: tomados }]
  })
  return { grupos: acotados, hayMas }
}

// Lo que dice la pastilla de un dato en un texto con datos: una variable, su nombre («Nombre del cliente»); un nodo, su etiqueta con `monto`, «% <etiqueta>» con
// `porcentaje` («% Transferencia a USA») y «<etiqueta> · <qué muestra>» con lo demás. Un nodo que no está, su id.
export function nombreDeLaPastilla(d: DatoDeLaCelda, contexto: ContextoDePlantilla): string {
  if ('variable' in d) return nombreDeLaVariable(d.variable)
  const n = (contexto.definicion.nodos ?? []).find((x) => x.id === d.nodo)
  const etiqueta = n?.etiqueta || d.nodo
  if (d.mostrar === 'monto') return etiqueta
  if (d.mostrar === 'porcentaje') return `% ${etiqueta}`
  return `${etiqueta} · ${nombreDeMostrar(d.mostrar)}`
}
