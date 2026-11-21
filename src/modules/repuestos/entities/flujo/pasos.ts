import type { FilaDeItem } from '../nucleo/item'
import {
  ORDEN_DE_LOS_HITOS,
  PANEL_DEL_HITO,
  type FaseDeLosPasos,
  type FlujoDeLosPasos,
  type HitoDelPaso,
  type PanelDelPaso,
  type PedidoDeHito,
  type SalidaDeLosPasos,
} from './pasos-del-flujo'

// Los **pasos** de un proyecto (`docs/GLOSARIO.md` › «Paso (de un proyecto)»): las fases activas del flujo de repuestos en su orden y, justo antes de la primera fase
// activa que lo pide, cada **hito** («Precio al cliente», «Pago del cliente»). Puro: lo calcula el navegador sobre las filas vivas de la hoja, así un precio tecleado
// cambia el progreso sin releer nada.

export type IndiceDelFlujo = {
  // Las fases activas, en el orden del flujo: los pasos de los ítems.
  activas: readonly FaseDeLosPasos[]
  // Todas las leídas (también las jubiladas: un ítem puede seguir en una).
  porId: ReadonlyMap<string, FaseDeLosPasos>
  // El lugar de cada fase en el orden del flujo (`orden`, y el id para desempatar): «hacia adelante» es ir a un lugar mayor.
  lugar: ReadonlyMap<string, number>
  // Las fases a las que se llega desde cada una sólo por salidas hacia adelante, ella incluida.
  alcance: ReadonlyMap<string, ReadonlySet<string>>
  // Las salidas de cada fase hacia una fase activa: primero las que van hacia adelante (la más cercana primero) y después las que vuelven.
  salidas: ReadonlyMap<string, readonly SalidaDeLosPasos[]>
  // Lo que cada fase pide de los hitos (bloqueante o informativo).
  pedidos: ReadonlyMap<string, readonly PedidoDeHito[]>
  // La fase activa antes de la cual va cada hito (la primera, por orden, que lo pide); sin entrada, el flujo no lo ubica.
  faseDelHito: ReadonlyMap<HitoDelPaso, string>
}

const porOrden = (a: FaseDeLosPasos, b: FaseDeLosPasos) =>
  a.orden - b.orden || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

function agrupar<T>(filas: readonly T[], clave: (fila: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>()
  for (const fila of filas) {
    const k = clave(fila)
    const grupo = grupos.get(k)
    if (grupo) grupo.push(fila)
    else grupos.set(k, [fila])
  }
  return grupos
}

function alcanceHaciaAdelante(
  fases: readonly FaseDeLosPasos[],
  adelante: ReadonlyMap<string, readonly string[]>,
): Map<string, Set<string>> {
  const alcance = new Map<string, Set<string>>()
  for (const fase of fases) {
    const vistas = new Set<string>([fase.id])
    const pendientes = [fase.id]
    for (let actual = pendientes.pop(); actual !== undefined; actual = pendientes.pop()) {
      for (const siguiente of adelante.get(actual) ?? []) {
        if (!vistas.has(siguiente)) {
          vistas.add(siguiente)
          pendientes.push(siguiente)
        }
      }
    }
    alcance.set(fase.id, vistas)
  }
  return alcance
}

/** El flujo listo para preguntarle: orden, alcance hacia adelante, salidas por fase y dónde va cada hito. Se calcula una vez por flujo. */
export function indexarFlujo(flujo: FlujoDeLosPasos): IndiceDelFlujo {
  const ordenadas = [...flujo.fases].sort(porOrden)
  const lugar = new Map(ordenadas.map((fase, i) => [fase.id, i]))
  const porId = new Map(ordenadas.map((fase) => [fase.id, fase]))
  const activas = ordenadas.filter((fase) => fase.activa)
  const lugarDe = (id: string) => lugar.get(id) ?? -1
  const haciaAdelante = (s: SalidaDeLosPasos) => lugarDe(s.a) > lugarDe(s.de)
  const adelante = new Map<string, string[]>()
  for (const [de, grupo] of agrupar(flujo.salidas.filter(haciaAdelante), (s) => s.de)) {
    adelante.set(
      de,
      grupo.map((s) => s.a),
    )
  }
  const salidas = new Map<string, SalidaDeLosPasos[]>()
  for (const [de, grupo] of agrupar(
    flujo.salidas.filter((s) => porId.get(s.a)?.activa === true),
    (s) => s.de,
  )) {
    salidas.set(
      de,
      [...grupo].sort(
        (a, b) =>
          Number(haciaAdelante(b)) - Number(haciaAdelante(a)) || lugarDe(a.a) - lugarDe(b.a),
      ),
    )
  }
  const pedidos = agrupar(flujo.pedidos, (p) => p.faseId)
  const faseDelHito = new Map<HitoDelPaso, string>()
  for (const fase of activas) {
    for (const pedido of pedidos.get(fase.id) ?? []) {
      if (!faseDelHito.has(pedido.hito)) faseDelHito.set(pedido.hito, fase.id)
    }
  }
  return {
    activas,
    porId,
    lugar,
    alcance: alcanceHaciaAdelante(ordenadas, adelante),
    salidas,
    pedidos,
    faseDelHito,
  }
}

export type ProgresoDelPaso = { n: number; total: number; hayMas: boolean; texto: string }

/** «3 de 5»; con la hoja topada, «37+ de 200+»: nunca un total exacto más allá de lo leído. */
export function textoDelProgreso(n: number, total: number, hayMas: boolean): string {
  return hayMas ? `${String(n)}+ de ${String(total)}+` : `${String(n)} de ${String(total)}`
}

const progreso = (n: number, total: number, hayMas: boolean, sufijo = ''): ProgresoDelPaso => ({
  n,
  total,
  hayMas,
  texto: `${textoDelProgreso(n, total, hayMas)}${sufijo}`,
})

export type PasoDelProyecto =
  | { tipo: 'fase'; fase: FaseDeLosPasos; progreso: ProgresoDelPaso }
  | {
      tipo: 'hito'
      hito: HitoDelPaso
      panel: PanelDelPaso
      // La fase que lo pide (el hito va justo antes).
      faseId: string
      progreso: ProgresoDelPaso
      // Sólo del pago y sólo con `repuestos.costos.ver`: si hay un pago vivo. Nulo = quien mira no lo ve.
      pago: boolean | null
    }

type Fila = Pick<FilaDeItem, 'fase' | 'precioCliente'>

/** Los ítems que llegaron a esa fase: están en ella o en una a la que se llega desde ella hacia adelante. Un ítem sin fase no cuenta. */
export function llegaronA(indice: IndiceDelFlujo, faseId: string, filas: readonly Fila[]): number {
  const alcance = indice.alcance.get(faseId)
  if (alcance === undefined) return 0
  return filas.filter((f) => f.fase !== null && alcance.has(f.fase.id)).length
}

function pasoDelHito(
  indice: IndiceDelFlujo,
  { hito, faseId }: { hito: HitoDelPaso; faseId: string },
  filas: readonly Fila[],
  { hayMas, pago }: { hayMas: boolean; pago: boolean | null },
): PasoDelProyecto {
  const total = filas.length
  const base = { tipo: 'hito', hito, panel: PANEL_DEL_HITO[hito], faseId } as const
  if (hito === 'precio') {
    const conPrecio = filas.filter((f) => f.precioCliente !== null).length
    return { ...base, progreso: progreso(conPrecio, total, hayMas, ' con precio'), pago: null }
  }
  // Un pago es del proyecto y cubre a todos sus ítems. Sin `repuestos.costos.ver` no se dice nada del pago: se ve por la fase de los ítems.
  if (pago === null) {
    return { ...base, progreso: progreso(llegaronA(indice, faseId, filas), total, hayMas), pago }
  }
  return {
    ...base,
    progreso: progreso(
      pago ? total : 0,
      total,
      hayMas,
      pago ? ' · Registrado' : ' · Sin registrar',
    ),
    pago,
  }
}

/** Los pasos del proyecto con su progreso, en el orden del flujo. `pago`: nulo sin `repuestos.costos.ver`. */
export function armarPasos(
  indice: IndiceDelFlujo,
  filas: readonly Fila[],
  contexto: { hayMas: boolean; pago: boolean | null },
): PasoDelProyecto[] {
  const pasos: PasoDelProyecto[] = []
  for (const fase of indice.activas) {
    for (const hito of ORDEN_DE_LOS_HITOS) {
      if (indice.faseDelHito.get(hito) === fase.id) {
        pasos.push(pasoDelHito(indice, { hito, faseId: fase.id }, filas, contexto))
      }
    }
    pasos.push({
      tipo: 'fase',
      fase,
      progreso: progreso(llegaronA(indice, fase.id, filas), filas.length, contexto.hayMas),
    })
  }
  return pasos
}
