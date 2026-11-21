import { z } from 'zod'
import { conteoCorto } from '@/shared/lib/conteo'
import type { FilaDeItem } from '../nucleo/item'
import { CLAVE_SIN_FASE, TEXTO_SIN_FASE } from './grupos-por-paso'
import { nombreDelValor, type CatalogosDeLaHoja, type ClaveDeCatalogoDeLaHoja } from './hoja'

// El buscador y los filtros de los ítems de un proyecto (glosario: «Filtros de los ítems»): se aplican en el navegador sobre las filas que la hoja ya leyó (≤ 200), O(n). Puro.

export type FiltroDeItems = {
  // Lo que se busca: tipo de pieza, descripción, tracking y notas; vacío = sin búsqueda.
  q: string
  // Un id de fase o `sin_fase`; nulo = todas.
  fase: string | null
  tipo: string | null
  condicion: string | null
  pais: string | null
  via: string | null
  sinPrecio: boolean
}

export const FILTRO_VACIO: FiltroDeItems = {
  q: '',
  fase: null,
  tipo: null,
  condicion: null,
  pais: null,
  via: null,
  sinPrecio: false,
}

/** Los nombres de cada parte del filtro en la URL (`?q=&fase=&tipo=&condicion=&pais=&via=&sin_precio=1`). */
export const CLAVES_DEL_FILTRO = {
  q: 'q',
  fase: 'fase',
  tipo: 'tipo',
  condicion: 'condicion',
  pais: 'pais',
  via: 'via',
  sinPrecio: 'sin_precio',
} as const satisfies Record<keyof FiltroDeItems, string>

export const LARGO_MAXIMO_DE_LA_BUSQUEDA = 100

/** Lo que dicen los parámetros de la URL, sin validar. */
export type ParametrosDelFiltro = Partial<
  Record<(typeof CLAVES_DEL_FILTRO)[keyof typeof CLAVES_DEL_FILTRO], string | null>
>

const esquemaDeId = z.union([z.guid(), z.literal(CLAVE_SIN_FASE)])
const esquemaDeCatalogo = z.guid()

function validar(esquema: z.ZodType<string>, crudo: string | null | undefined): string | null {
  const r = esquema.safeParse(crudo)
  return r.success ? r.data : null
}

/** El filtro de lo que dice la URL: lo que no es un id (o `sin_fase` en la fase) no filtra; la búsqueda se recorta. */
export function leerFiltroDeItems(parametros: ParametrosDelFiltro): FiltroDeItems {
  return {
    q: (parametros.q ?? '').slice(0, LARGO_MAXIMO_DE_LA_BUSQUEDA),
    fase: validar(esquemaDeId, parametros.fase),
    tipo: validar(esquemaDeCatalogo, parametros.tipo),
    condicion: validar(esquemaDeCatalogo, parametros.condicion),
    pais: validar(esquemaDeCatalogo, parametros.pais),
    via: validar(esquemaDeCatalogo, parametros.via),
    sinPrecio: parametros.sin_precio === '1',
  }
}

export function hayFiltro(f: FiltroDeItems): boolean {
  return (
    f.q.trim() !== '' ||
    f.fase !== null ||
    f.tipo !== null ||
    f.condicion !== null ||
    f.pais !== null ||
    f.via !== null ||
    f.sinPrecio
  )
}

/** Minúsculas y sin acentos: «Pará» y «para» se encuentran. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function coincideLaBusqueda(fila: FilaDeItem, q: string, catalogos: CatalogosDeLaHoja): boolean {
  const pajar = [
    nombreDelValor(catalogos, 'tipo_pieza', fila.tipoPiezaId),
    fila.descripcion,
    fila.tracking,
    fila.notas,
  ]
  return pajar.some((texto) => texto !== null && normalizar(texto).includes(q))
}

const esDeLaFase = (fila: FilaDeItem, fase: string) =>
  fase === CLAVE_SIN_FASE ? fila.fase === null : fila.fase?.id === fase

type Condicion = (fila: FilaDeItem) => boolean

// Una condición por cada parte elegida del filtro; el catálogo y la fase se comparan por id.
function condicionesDe(filtro: FiltroDeItems, catalogos: CatalogosDeLaHoja): Condicion[] {
  const q = normalizar(filtro.q.trim())
  const { fase, tipo, condicion, pais, via } = filtro
  const condiciones: Condicion[] = []
  if (q !== '') condiciones.push((f) => coincideLaBusqueda(f, q, catalogos))
  if (fase !== null) condiciones.push((f) => esDeLaFase(f, fase))
  if (tipo !== null) condiciones.push((f) => f.tipoPiezaId === tipo)
  if (condicion !== null) condiciones.push((f) => f.condicionId === condicion)
  if (pais !== null) condiciones.push((f) => f.paisOrigenId === pais)
  if (via !== null) condiciones.push((f) => f.modoTransporteId === via)
  if (filtro.sinPrecio) condiciones.push((f) => f.precioCliente === null)
  return condiciones
}

/** Las filas que cumplen todo lo elegido (en su mismo orden). Sin filtro, las mismas. */
export function filtrarItems(
  filas: readonly FilaDeItem[],
  filtro: FiltroDeItems,
  catalogos: CatalogosDeLaHoja,
): readonly FilaDeItem[] {
  if (!hayFiltro(filtro)) return filas
  const condiciones = condicionesDe(filtro, catalogos)
  return filas.filter((fila) => condiciones.every((cumple) => cumple(fila)))
}

export type OpcionDelFiltro = { valor: string; etiqueta: string }

export type OpcionesDelFiltro = {
  fase: OpcionDelFiltro[]
  tipo: OpcionDelFiltro[]
  condicion: OpcionDelFiltro[]
  pais: OpcionDelFiltro[]
  via: OpcionDelFiltro[]
}

export const TEXTO_DE_OPCION_QUE_YA_NO_EXISTE = 'Ya no existe'

const CATALOGO_DE = {
  tipo: ['tipo_pieza', 'tipoPiezaId'],
  condicion: ['condicion', 'condicionId'],
  pais: ['pais_origen', 'paisOrigenId'],
  via: ['modo_transporte', 'modoTransporteId'],
} as const satisfies Record<string, readonly [ClaveDeCatalogoDeLaHoja, keyof FilaDeItem]>

// Los valores del catálogo que algún ítem usa, en el orden del catálogo, más el elegido aunque ya no esté (para poder quitarlo).
function opcionesDeCatalogo(
  filas: readonly FilaDeItem[],
  catalogos: CatalogosDeLaHoja,
  [catalogo, campo]: readonly [ClaveDeCatalogoDeLaHoja, keyof FilaDeItem],
  elegido: string | null,
): OpcionDelFiltro[] {
  const usados = new Set(filas.map((f) => f[campo] as string | null))
  const opciones = catalogos[catalogo].valores
    .filter((v) => usados.has(v.id) || v.id === elegido)
    .map((v) => ({ valor: v.id, etiqueta: v.nombre }))
  if (elegido !== null && !opciones.some((o) => o.valor === elegido)) {
    opciones.push({ valor: elegido, etiqueta: TEXTO_DE_OPCION_QUE_YA_NO_EXISTE })
  }
  return opciones
}

const porNombre = new Intl.Collator('es')

// Las fases de los ítems en el orden del flujo (una fuera de él, después y por nombre); «Sin fase» al final si hay ítems sin fase.
function opcionesDeFase(
  filas: readonly FilaDeItem[],
  orden: ReadonlyMap<string, number> | null,
  elegido: string | null,
): OpcionDelFiltro[] {
  const fases = new Map<string, string>()
  let haySinFase = false
  for (const fila of filas) {
    if (fila.fase === null) haySinFase = true
    else fases.set(fila.fase.id, fila.fase.nombre)
  }
  const lugar = (id: string) => orden?.get(id) ?? Number.POSITIVE_INFINITY
  const opciones = [...fases.entries()]
    .sort(([ia, na], [ib, nb]) => {
      const porLugar = lugar(ia) === lugar(ib) ? 0 : lugar(ia) < lugar(ib) ? -1 : 1
      return porLugar !== 0 ? porLugar : porNombre.compare(na, nb)
    })
    .map(([valor, etiqueta]) => ({ valor, etiqueta }))
  if (haySinFase || elegido === CLAVE_SIN_FASE) {
    opciones.push({ valor: CLAVE_SIN_FASE, etiqueta: TEXTO_SIN_FASE })
  }
  if (elegido !== null && !opciones.some((o) => o.valor === elegido)) {
    opciones.push({ valor: elegido, etiqueta: TEXTO_DE_OPCION_QUE_YA_NO_EXISTE })
  }
  return opciones
}

/** Lo que ofrece cada ficha: sólo los valores que los ítems del proyecto tienen (no ofrece opciones con cero resultados) y, si ya no está, el elegido. */
export function opcionesDelFiltro(
  filas: readonly FilaDeItem[],
  catalogos: CatalogosDeLaHoja,
  filtro: FiltroDeItems,
  ordenDeLasFases: ReadonlyMap<string, number> | null,
): OpcionesDelFiltro {
  return {
    fase: opcionesDeFase(filas, ordenDeLasFases, filtro.fase),
    tipo: opcionesDeCatalogo(filas, catalogos, CATALOGO_DE.tipo, filtro.tipo),
    condicion: opcionesDeCatalogo(filas, catalogos, CATALOGO_DE.condicion, filtro.condicion),
    pais: opcionesDeCatalogo(filas, catalogos, CATALOGO_DE.pais, filtro.pais),
    via: opcionesDeCatalogo(filas, catalogos, CATALOGO_DE.via, filtro.via),
  }
}

/** «3 de 12 ítems»; con la hoja topada, «3 de 200+ ítems»: el total nunca es exacto. */
export function textoDeResultados(n: number, total: number, hayMas: boolean): string {
  return `${conteoCorto({ n, hayMas: false })} de ${conteoCorto({ n: total, hayMas })} ítems`
}
