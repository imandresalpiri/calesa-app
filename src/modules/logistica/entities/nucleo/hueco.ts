import type { ComponentType } from 'react'

import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

import type { Unidad, UnidadAbierta } from './unidad'

// Los huecos del panel de la unidad (6.01): lo que un área llena en el panel sin que el núcleo la importe. Cada área declara los suyos en
// `pantallas/<área>-unidad.ts` (vacío hasta su paso) y `src/app` los junta y los filtra con `huecosVisibles`. Un componente de hueco recibe sólo
// datos serializables (`{ unidad }`): el servidor decide si se dibuja y el componente es de cliente y carga lo suyo al abrirse el bloque.
export type HuecoDeLaUnidad = {
  // Una de `ORDEN_DE_HUECOS`: dice dónde va en el panel. Una desconocida no se dibuja.
  clave: string
  titulo: string
  // Se dibuja si la persona tiene ALGUNA, en el origen de la unidad. Vacío: basta el acceso al panel.
  permisos: readonly ClavePermiso[]
  // La regla de `flujos_reglas` que lo enciende (`transporte`, `aduana`, `gastos`, `pagos`…). Nula: no depende de una regla.
  regla: string | null
  // La variante para un ítem de repuesto (8.13-2): sin ella, el hueco no se dibuja para un ítem. Con ella, se filtra por estos permisos (sin origen: el flujo de repuestos no tiene) y esta regla,
  // y se dibuja con su `componente` (que recibe la unidad abierta, sin origen). `componente` del hueco es de las áreas que sólo tratan vehículos y nunca ve un ítem.
  repuesto?: {
    permisos: readonly ClavePermiso[]
    regla: string | null
    componente?: ComponentType<{ unidad: UnidadAbierta }>
  }
  // El del hueco de un área que sólo trata vehículos pide `Unidad`; uno que también sirve a un ítem (mover) pide `UnidadAbierta` y se dibuja igual para el vehículo.
  componente: ComponentType<{ unidad: Unidad }> | ComponentType<{ unidad: UnidadAbierta }>
  // Su contenido se pide al hidratar el panel. Los demás se montan al acercarse. Lo usa «Qué falta» (6.04), que es lo primero que se mira para mover.
  abiertoAlInicio?: boolean
}

/** El orden fijo del panel, sea cual sea el archivo que declara cada hueco: por lo que más se hace (mover, documentos, notas, y después lo ocasional). */
export const ORDEN_DE_HUECOS = [
  'que-falta',
  'documentos',
  'notas',
  'historial',
  'transporte',
  'repuestos',
  'aduana',
  'gastos',
  'pagos',
  'margen',
] as const

type ParaFiltrar = Pick<HuecoDeLaUnidad, 'clave' | 'permisos' | 'regla' | 'repuesto'>

/**
 * Los huecos que se dibujan, en el orden del panel: sin los de clave desconocida (o repetida: queda la primera), sin los que piden un permiso
 * que la persona no tiene en ese origen y sin los que piden una regla que el flujo del origen no tiene activa.
 */
export function huecosVisibles<H extends ParaFiltrar>(
  huecos: readonly H[],
  contexto: {
    permisos: Permisos
    origenId: string | null
    reglasActivas: readonly string[]
    // Qué unidad se abre: sin él, un vehículo (todo lo de antes). Un ítem sólo ve los huecos con variante `repuesto`.
    tipo?: UnidadAbierta['tipo']
  },
): H[] {
  const { permisos, origenId, reglasActivas, tipo = 'vehiculo' } = contexto
  const visibles = new Map<string, H>()
  for (const h of huecos) {
    // El filtro de tipo va antes de descartar repetidos: un hueco de vehículo no tapa al de repuesto de la misma clave.
    const reglas = tipo === 'repuesto' ? h.repuesto : h
    if (reglas === undefined) continue
    if (visibles.has(h.clave)) continue
    if (!(ORDEN_DE_HUECOS as readonly string[]).includes(h.clave)) continue
    if (reglas.permisos.length > 0 && !reglas.permisos.some((c) => puede(permisos, c, origenId)))
      continue
    if (reglas.regla !== null && !reglasActivas.includes(reglas.regla)) continue
    visibles.set(h.clave, h)
  }
  return ORDEN_DE_HUECOS.flatMap((c) => {
    const h = visibles.get(c)
    return h === undefined ? [] : [h]
  })
}

/**
 * El orden del panel de un ítem de repuesto con sus secciones a la vista: «Qué falta» primero (lo de su paso), después lo que el ítem consulta a diario y lo
 * ocasional al final. Los bloques propios de `repuestos` (imágenes, stock, compras) van entre «Qué falta» y «Documentos»; los pone `PanelDeLaUnidadALaVista`.
 */
export const ORDEN_DEL_ITEM = [
  'que-falta',
  'documentos',
  'historial',
  'notas',
  'transporte',
] as const

/** Los huecos ya visibles en el orden del ítem; uno que no está en `ORDEN_DEL_ITEM` va al final, en el orden en que llegó. */
export function enElOrdenDelItem<H extends { clave: string }>(huecos: readonly H[]): H[] {
  const lugar = (h: H) => {
    const i = (ORDEN_DEL_ITEM as readonly string[]).indexOf(h.clave)
    return i === -1 ? ORDEN_DEL_ITEM.length : i
  }
  return huecos
    .map((h, i) => ({ h, i }))
    .sort((a, b) => lugar(a.h) - lugar(b.h) || a.i - b.i)
    .map(({ h }) => h)
}
