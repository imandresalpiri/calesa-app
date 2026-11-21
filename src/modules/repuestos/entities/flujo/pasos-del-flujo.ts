import { z } from 'zod'
import { TOPE_DE_FASES_DE_LA_CADENA } from './cadena'

// Lo que se lee del flujo de repuestos para dibujar los **pasos** de un proyecto (`docs/GLOSARIO.md` › «Paso (de un proyecto)»): sus fases, sus salidas y los
// requisitos de dato que ubican un **hito**. Ningún nombre de fase se lee: un hito sale de la clave del requisito, nunca de cómo se llama la fase que lo pide.

/** Las claves de requisito de dato que ubican un hito en los pasos, y el hito que ubican. Otra clave no es un hito. */
export const CLAVES_DE_HITO = {
  'repuesto.precio': 'precio',
  'proyecto.pago_cliente': 'pago',
} as const

export type ClaveDeHito = keyof typeof CLAVES_DE_HITO
export type HitoDelPaso = (typeof CLAVES_DE_HITO)[ClaveDeHito]
export const CLAVES_DATO_DE_HITO = Object.keys(CLAVES_DE_HITO) as ClaveDeHito[]

/** El orden en que se dibujan dos hitos que caen antes de la misma fase. */
export const ORDEN_DE_LOS_HITOS: readonly HitoDelPaso[] = ['precio', 'pago']

/** El texto de cada hito en los pasos. */
export const TITULO_DEL_HITO: Readonly<Record<HitoDelPaso, string>> = {
  precio: 'Precio al cliente',
  pago: 'Pago del cliente',
}

/** Las pestañas del proyecto que no son la hoja de ítems (`?pestana=`): el valor de la URL de siempre, para que los enlaces viejos sigan abriendo lo mismo. */
export const PANELES_DEL_PASO = ['cotizaciones', 'pagos', 'compras'] as const
export type PanelDelPaso = (typeof PANELES_DEL_PASO)[number]

export const TITULO_DEL_PANEL: Readonly<Record<PanelDelPaso, string>> = {
  cotizaciones: 'Cotizaciones',
  pagos: 'Pagos',
  compras: 'Compras',
}

/** La pestaña a la que lleva cada hito. Compras no tiene hito: la base no tiene una clave que la ubique. */
export const PANEL_DEL_HITO: Readonly<Record<HitoDelPaso, PanelDelPaso>> = {
  precio: 'cotizaciones',
  pago: 'pagos',
}

// Son configuración, no volumen: más de esto es un error que se dice («los pasos no se dibujan»), nunca un corte en silencio.
export const TOPE_DE_FASES_DE_LOS_PASOS = TOPE_DE_FASES_DE_LA_CADENA
/** 30 fases × 12 destinos (los que muestra «Qué falta»). */
export const TOPE_DE_SALIDAS_DE_LOS_PASOS = 360
/** 30 fases × las dos claves de hito. */
export const TOPE_DE_REQUISITOS_DE_LOS_PASOS = 60

export type FaseDeLosPasos = {
  id: string
  nombre: string
  color: string
  orden: number
  activa: boolean
  esInicial: boolean
  esFinal: boolean
}

export type SalidaDeLosPasos = { de: string; a: string; accion: string | null }

export type PedidoDeHito = { faseId: string; hito: HitoDelPaso; bloqueante: boolean }

export type FlujoDeLosPasos = {
  fases: FaseDeLosPasos[]
  salidas: SalidaDeLosPasos[]
  pedidos: PedidoDeHito[]
}

/** Cómo quedó la lectura: con el flujo, sin fases activas, con algo que no se pudo leer o con más de lo que se puede mostrar. */
export type LecturaDeLosPasos =
  | { estado: 'listo'; flujo: FlujoDeLosPasos }
  | { estado: 'sin_fases' }
  | { estado: 'ilegible' }
  | { estado: 'tope' }

const esquemaDeFase = z.object({
  id: z.guid(),
  nombre: z.string(),
  color: z.string(),
  orden: z.number().int(),
  activa: z.boolean(),
  es_inicial: z.boolean(),
  es_final: z.boolean(),
})

const esquemaDeSalida = z.object({
  de_fase_id: z.guid(),
  a_fase_id: z.guid(),
  accion: z.string().nullable(),
})

const esquemaDePedido = z.object({
  fase_id: z.guid(),
  clave_dato: z.string().nullable(),
  bloqueante: z.boolean(),
})

const esHito = (clave: string | null): clave is ClaveDeHito =>
  clave !== null && Object.hasOwn(CLAVES_DE_HITO, clave)

/**
 * Las tres lecturas del flujo (las filas de la base, tal cual) como el flujo de los pasos. Cada lectura pide un tope más uno: si alguna lo pasa, `tope`; si alguna
 * no tiene la forma esperada, `ilegible`; sin ninguna fase activa, `sin_fases`. Una salida o un pedido que nombra una fase que no se leyó se descarta.
 */
export function flujoDeLosPasosDesde(
  fases: unknown,
  salidas: unknown,
  pedidos: unknown,
): LecturaDeLosPasos {
  const f = z.array(esquemaDeFase).safeParse(fases)
  const s = z.array(esquemaDeSalida).safeParse(salidas)
  const p = z.array(esquemaDePedido).safeParse(pedidos)
  if (!f.success || !s.success || !p.success) return { estado: 'ilegible' }
  if (
    f.data.length > TOPE_DE_FASES_DE_LOS_PASOS ||
    s.data.length > TOPE_DE_SALIDAS_DE_LOS_PASOS ||
    p.data.length > TOPE_DE_REQUISITOS_DE_LOS_PASOS
  ) {
    return { estado: 'tope' }
  }
  if (!f.data.some((fase) => fase.activa)) return { estado: 'sin_fases' }
  const ids = new Set(f.data.map((fase) => fase.id))
  return {
    estado: 'listo',
    flujo: {
      fases: f.data.map((fase) => ({
        id: fase.id,
        nombre: fase.nombre,
        color: fase.color,
        orden: fase.orden,
        activa: fase.activa,
        esInicial: fase.es_inicial,
        esFinal: fase.es_final,
      })),
      salidas: s.data
        .filter((x) => ids.has(x.de_fase_id) && ids.has(x.a_fase_id))
        .map((x) => ({ de: x.de_fase_id, a: x.a_fase_id, accion: x.accion })),
      pedidos: p.data.flatMap((x) =>
        ids.has(x.fase_id) && esHito(x.clave_dato)
          ? [{ faseId: x.fase_id, hito: CLAVES_DE_HITO[x.clave_dato], bloqueante: x.bloqueante }]
          : [],
      ),
    },
  }
}
