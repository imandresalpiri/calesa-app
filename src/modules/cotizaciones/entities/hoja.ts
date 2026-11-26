import { type z } from 'zod'
import type { Tono } from '@/shared/ui/xcell'
import {
  aspectoDeCabecera,
  aspectoDeItem,
  aspectoDeItemConAncho,
  aspectoDeSeccion,
  type AspectoDeCabecera,
  type AspectoDeItem,
  type AspectoDeItemConAncho,
  type AspectoDeSeccion,
} from './aspecto-de-la-hoja'
import {
  type AnchoDeCelda,
  type EFECTOS_DE_INTERRUPTOR,
  type PRESENTACIONES,
  type SECUNDARIOS,
} from './diseno'
import {
  type esquemaCelda,
  type esquemaDeDiseno,
  esquemaHoja,
  type esquemaItem,
  type esquemaLista,
  type MotivoDeCandado,
  type TipoDeNodoDeHoja,
} from './hoja-esquema'
import type { Formato } from './nodos'
import { ayudaDeLaHoja, type AyudaDeCelda } from './ayuda-de-la-hoja'
import type { ParDeHoja } from './hoja-en-par'

// La hoja que la pantalla recibe de `cotizacion_hoja()` (paso 4.13): la respuesta leída con `hoja-esquema.ts` y en camelCase.
export type { MotivoDeCandado, TipoDeNodoDeHoja } from './hoja-esquema'

// ---------------------------------------------------------------------------------------------------------------------------------
// Lo que la pantalla recibe (camelCase)
// ---------------------------------------------------------------------------------------------------------------------------------
export type EdicionDeHoja = { editable: boolean; motivo: MotivoDeCandado | null }

export type SecundarioDeCelda = EdicionDeHoja & {
  nodo: string
  tipoDeNodo: TipoDeNodoDeHoja
  como: (typeof SECUNDARIOS)[number]
  formato: Formato
  // Los «Decimales» del nodo (glosario): sin la clave, «Automático». Sólo la vista.
  decimales?: number
  ajustes: boolean
  // Con el monto escrito, el porcentaje lo calcula el par: no es lo tipeado (`entradasDeLoGuardado()`). Lo dice la base (`sigue_al_monto`).
  sigueAlMonto?: true
}

export type {
  AyudaDeCelda,
  BloqueEnLaHoja,
  CasaDeLaFila,
  ColumnaDeLaAyudaEnLaHoja,
  EnlaceDeLaAyuda,
} from './ayuda-de-la-hoja'

// La columna de la tabla de una celda y el dato del vehículo con que se busca (`tipo` ← `tipo_vehiculo`).
export type DatoDelVehiculo = { tabla: string; columnas: { columna: string; campo: string }[] }

// Cada ítem y cada sección llevan su aspecto (`aspecto-de-la-hoja.ts`): sólo las claves que el diseño trae.
export type CeldaDeHoja = EdicionDeHoja &
  AspectoDeItem & {
    tipo: 'celda'
    nodo: string
    etiqueta: string
    tipoDeNodo: TipoDeNodoDeHoja
    formato: Formato
    decimales?: number
    ancho: AnchoDeCelda
    tono: string | null
    // El ⚙: lo da el permiso del origen (constante) o el de los tipos de cambio; no depende de `editable`.
    ajustes: boolean
    ayuda: AyudaDeCelda | null
    datoDelVehiculo: DatoDelVehiculo | null
    soloEn: string[] | null
    condicion: string | null
    requeridoSi: string | null
    secundario: SecundarioDeCelda | null
    // Cambia según la opción de la variante en par: se dibuja en dos celdas (sin la clave, una).
    enPar?: true
  }
export type ChipDeAtajos = { etiqueta: string; valor: number | null }
export type AtajosDeHoja = AspectoDeItemConAncho & {
  tipo: 'atajos'
  nodo: string
  chips: ChipDeAtajos[]
}
export type VarianteDeHoja = EdicionDeHoja &
  AspectoDeItemConAncho & {
    tipo: 'variante'
    nodo: string
    etiqueta: string
    opciones: { clave: string; etiqueta: string; titulo: string }[]
    porDefecto: string | null
  }
export type InterruptorDeHoja = EdicionDeHoja &
  AspectoDeItemConAncho & {
    tipo: 'interruptor'
    nodo: string
    etiqueta: string
    efecto: (typeof EFECTOS_DE_INTERRUPTOR)[number]
    soloEn: string[] | null
  }
export type SubtotalDeHoja = AspectoDeItemConAncho & {
  tipo: 'subtotal'
  nodo: string
  etiqueta: string
  formato: Formato
  decimales?: number
  tono: string | null
  enPar?: true
}
// La tarjeta del total como pieza de una sección: su nodo (el de la tarjeta), su etiqueta y su formato; el monto es el total del resumen.
export type TotalDeHoja = AspectoDeItemConAncho & {
  tipo: 'total'
  nodo: string
  etiqueta: string
  formato: Formato
  decimales?: number
}
export type ItemDeHoja =
  CeldaDeHoja | AtajosDeHoja | VarianteDeHoja | InterruptorDeHoja | SubtotalDeHoja | TotalDeHoja

export type SeccionDeHoja = AspectoDeSeccion & {
  id: string
  titulo: string | null
  presentacion: (typeof PRESENTACIONES)[number]
  items: ItemDeHoja[]
}
export type NodoDeTarjeta = { nodo: string; etiqueta: string; formato: Formato; decimales?: number }

// El diseño de una versión de la fórmula recortado al nivel de quien mira: lo que dibuja la hoja, sea la de cotizar o la de una guardada.
export type DisenoDeHoja = {
  origen: { id: string; nombre: string }
  formula: { id: string; version: number }
  // Los modos de tipo de cambio se identifican por su clave: sus buckets no viajan (nombran tipos de cambio que un nivel puede esconder).
  cabecera: AspectoDeCabecera & {
    modos: { clave: string; nombre: string }[]
    verTotalBs: boolean
    monedaBs: string | null
    // El ⚙ de la cabecera (lo decide la base) y lo que el diseño trae por defecto: nulo o falso si no lo trae.
    ajustes: boolean
    modoPorDefecto: string | null
    verTotalBsPorDefecto: boolean
    modosVisibles: string[] | null
  }
  secciones: SeccionDeHoja[]
  tarjetaTotal: NodoDeTarjeta & { secundarios: NodoDeTarjeta[] }
  tonos: Tono[]
  // La variante en par (`hoja-en-par.ts`); sin la clave, la hoja de siempre.
  par?: ParDeHoja
  // La fila del bloque del avanzado en la rejilla de las secciones (docs/GLOSARIO.md › «Bloque del avanzado»); sin la clave, debajo de la última fila.
  avanzado?: { fila: number }
}

export type HojaLista = DisenoDeHoja & {
  estado: 'lista'
  // La hora de la base con que se abrió (un texto ISO), y la hoja abierta que firma la base con la versión de la fórmula y esa hora: es lo que se manda como
  // `p_abierta` a `cotizacion_evaluar` (el recálculo calcula con esta versión y estas tarifas, 4-28) y a `cotizacion_crear` (D2, 4-27). Opaca: la pantalla no la lee.
  abiertaEn: string
  abierta: string
}
export type HojaSinPublicar = {
  estado: 'sin_publicar'
  origen: { id: string; nombre: string }
  puedeConfigurar: boolean
}
export type HojaParaCotizar = HojaLista | HojaSinPublicar

type Crudo<T extends z.ZodType> = z.infer<T>

// Los decimales del nodo, sólo si vinieron: sin la clave, «Automático».
const conDecimales = (x: { decimales?: number | undefined }): { decimales?: number } =>
  x.decimales === undefined ? {} : { decimales: x.decimales }

const edicionDe = (e: { editable: boolean; motivo?: MotivoDeCandado }): EdicionDeHoja => ({
  editable: e.editable,
  motivo: e.motivo ?? null,
})

function celdaDe(c: Crudo<typeof esquemaCelda>): CeldaDeHoja {
  return {
    ...edicionDe(c),
    tipo: 'celda',
    nodo: c.nodo,
    etiqueta: c.etiqueta,
    tipoDeNodo: c.tipo_nodo,
    formato: c.formato,
    ...conDecimales(c),
    ancho: c.ancho,
    ...aspectoDeItem(c),
    tono: c.tono ?? null,
    ajustes: c.ajustes,
    ayuda: ayudaDeLaHoja(c.ayuda),
    datoDelVehiculo: c.dato_del_vehiculo ?? null,
    soloEn: c.solo_en ?? null,
    condicion: c.condicion ?? null,
    requeridoSi: c.requerido_si ?? null,
    secundario: c.secundario
      ? {
          ...edicionDe(c.secundario),
          nodo: c.secundario.nodo,
          tipoDeNodo: c.secundario.tipo_nodo,
          como: c.secundario.como,
          formato: c.secundario.formato,
          ...conDecimales(c.secundario),
          ajustes: c.secundario.ajustes,
          ...(c.secundario.sigue_al_monto ? { sigueAlMonto: true as const } : {}),
        }
      : null,
    ...(c.en_par ? { enPar: true as const } : {}),
  }
}

function itemDe(i: Crudo<typeof esquemaItem>): ItemDeHoja {
  switch (i.tipo) {
    case 'celda':
      return celdaDe(i)
    case 'atajos':
      return { tipo: 'atajos', nodo: i.nodo, chips: i.chips, ...aspectoDeItemConAncho(i) }
    case 'variante':
      return {
        ...edicionDe(i),
        tipo: 'variante',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        opciones: i.opciones,
        porDefecto: i.por_defecto ?? null,
        ...aspectoDeItemConAncho(i),
      }
    case 'interruptor':
      return {
        ...edicionDe(i),
        tipo: 'interruptor',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        efecto: i.efecto,
        soloEn: i.solo_en ?? null,
        ...aspectoDeItemConAncho(i),
      }
    case 'subtotal':
      return {
        tipo: 'subtotal',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        formato: i.formato,
        ...conDecimales(i),
        tono: i.tono ?? null,
        ...(i.en_par ? { enPar: true as const } : {}),
        ...aspectoDeItemConAncho(i),
      }
    case 'total':
      return {
        tipo: 'total',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        formato: i.formato,
        ...conDecimales(i),
        ...aspectoDeItemConAncho(i),
      }
    default: {
      const _: never = i
      return _
    }
  }
}

// El diseño leído, en camelCase: lo comparten `listaDe()` y la hoja de una guardada.
export function disenoDe(h: Crudo<typeof esquemaDeDiseno>): DisenoDeHoja {
  return {
    origen: h.origen,
    formula: h.formula,
    cabecera: {
      modos: h.cabecera.modos,
      verTotalBs: h.cabecera.ver_total_bs,
      monedaBs: h.cabecera.moneda_bs,
      ajustes: h.cabecera.ajustes ?? false,
      modoPorDefecto: h.cabecera.modo_por_defecto ?? null,
      verTotalBsPorDefecto: h.cabecera.ver_total_bs_por_defecto ?? false,
      modosVisibles: h.cabecera.modos_visibles ?? null,
      ...aspectoDeCabecera(h.cabecera),
    },
    secciones: h.secciones.map((s) => ({
      id: s.id,
      titulo: s.titulo ?? null,
      presentacion: s.presentacion,
      ...aspectoDeSeccion(s),
      items: s.items.map(itemDe),
    })),
    tarjetaTotal: h.tarjeta_total,
    tonos: h.tonos,
    ...(h.par
      ? { par: { nodo: h.par.nodo, etiqueta: h.par.etiqueta, opciones: h.par.opciones } }
      : {}),
    ...(h.avanzado ? { avanzado: { fila: h.avanzado.fila } } : {}),
  }
}

function listaDe(h: Crudo<typeof esquemaLista>): HojaLista {
  return {
    ...disenoDe(h),
    estado: 'lista',
    abiertaEn: h.abierta_en,
    abierta: h.abierta,
  }
}

// La respuesta de `cotizacion_hoja()` ya en la forma que usa la pantalla, o nulo si no es lo que la base promete.
export function hojaDesde(crudo: unknown): HojaParaCotizar | null {
  const leida = esquemaHoja.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const h = leida.data
  if (h.estado === 'sin_publicar') {
    return { estado: 'sin_publicar', origen: h.origen, puedeConfigurar: h.puede_configurar }
  }
  return listaDe(h)
}

// Si el diseño ubica la tarjeta del total en una sección (sólo puede ir en una principal): el resumen esconde la suya al costado.
export const hayTotalEnLaHoja = (h: Pick<DisenoDeHoja, 'secciones'>): boolean =>
  h.secciones.some((s) => s.presentacion === 'principal' && s.items.some((i) => i.tipo === 'total'))
