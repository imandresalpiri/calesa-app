// Los flujos que quien mira puede configurar, con el nombre y el color de su origen, y la elección del que abre una página. Puro; los orígenes los
// trae `src/app` (el módulo no importa `origenes`) y los flujos los filtra `flujosConfigurables()` por permisos.
import type { FlujoConfigurable, FlujoVisible } from './flujo'

// Lo que el selector necesita de un origen: su nombre y su color vienen de la fila, nunca de un texto fijo.
export type OrigenDelSelector = { id: string; nombre: string; color: string; activo: boolean }

export const CLAVE_DE_REPUESTOS = 'repuestos'

export type EntradaDelSelector<F extends FlujoConfigurable = FlujoConfigurable> = {
  // El id del origen o `repuestos`.
  clave: string
  titulo: string
  // El de repuestos no tiene color de origen.
  color: string | null
  flujo: F
}

// Los orígenes en el orden recibido y, al final, el flujo de repuestos. Un flujo de vehículos cuyo origen no llegó en la lista no se ofrece (D11).
export function armarSelector<F extends FlujoConfigurable>(
  flujos: readonly F[],
  origenes: readonly OrigenDelSelector[],
): EntradaDelSelector<F>[] {
  const entradas: EntradaDelSelector<F>[] = []
  for (const origen of origenes) {
    const flujo = flujos.find((f) => f.ambito === 'vehiculos' && f.origenId === origen.id)
    if (!flujo) continue
    entradas.push({
      clave: origen.id,
      titulo: origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`,
      color: origen.color,
      flujo,
    })
  }
  const repuestos = flujos.find((f) => f.ambito === 'repuestos')
  if (repuestos) {
    entradas.push({
      clave: CLAVE_DE_REPUESTOS,
      titulo: repuestos.nombre,
      color: null,
      flujo: repuestos,
    })
  }
  return entradas
}

// El flujo que abre una página: el de un origen (su pestaña Fases) o el de repuestos (Repuestos › Flujo de repuestos).
export type FlujoFijo = { origenId: string } | { ambito: typeof CLAVE_DE_REPUESTOS }

// La entrada de ese flujo, o `null` si no está entre las que quien mira puede configurar. Nunca cae en otra: la pestaña de un origen no abre el
// flujo de otro.
export function entradaFija<F extends FlujoConfigurable>(
  entradas: readonly EntradaDelSelector<F>[],
  fijo: FlujoFijo,
): EntradaDelSelector<F> | null {
  const clave = 'origenId' in fijo ? fijo.origenId : CLAVE_DE_REPUESTOS
  return entradas.find((entrada) => entrada.clave === clave) ?? null
}

// Lo que dice la página cuando su flujo no está: cada origen nace con el suyo, así que no hay acción para crearlo.
export function textoSinFlujo(fijo: FlujoFijo): string {
  return 'origenId' in fijo
    ? 'Este origen todavía no tiene flujo.'
    : 'Todavía no hay flujo de repuestos.'
}

// Un flujo del que se pueden copiar las fases («Empezar con las fases de…»): el de un origen, con su nombre y su color. Sólo strings: cruza del servidor
// al cliente.
export type FlujoParaCopiar = { flujoId: string; origenId: string; titulo: string; color: string }

// Lo que se copia sale de un flujo que quien mira configura: uno que sólo ve en lectura (gestiona ahí los catálogos de logística) no se ofrece.
const configurable = (entrada: EntradaDelSelector<FlujoConfigurable | FlujoVisible>) =>
  !('soloLectura' in entrada.flujo && entrada.flujo.soloLectura)

// De dónde puede copiar las fases el flujo `flujoId`: los flujos de vehículos que quien mira configura (las entradas ya vienen filtradas por permisos;
// las de sólo lectura no cuentan), menos el propio y menos los que no tienen ninguna fase activa (`conFases`), en el orden de las entradas. El de
// repuestos nunca: sólo entre vehículos.
export function flujosParaCopiar(
  entradas: readonly EntradaDelSelector<FlujoConfigurable | FlujoVisible>[],
  flujoId: string,
  conFases: ReadonlySet<string>,
): FlujoParaCopiar[] {
  return entradas.flatMap((entrada) => {
    const { flujo } = entrada
    if (
      !configurable(entrada) ||
      flujo.ambito !== 'vehiculos' ||
      flujo.origenId === null ||
      flujo.id === flujoId ||
      !conFases.has(flujo.id)
    ) {
      return []
    }
    return [
      {
        flujoId: flujo.id,
        origenId: flujo.origenId,
        titulo: entrada.titulo,
        color: entrada.color ?? '',
      },
    ]
  })
}

// Los flujos que vale la pena preguntar si tienen fases: los de vehículos de las entradas, menos el propio.
export function candidatosParaCopiar(
  entradas: readonly EntradaDelSelector<FlujoConfigurable | FlujoVisible>[],
  flujoId: string,
): string[] {
  return entradas
    .filter((e) => configurable(e) && e.flujo.ambito === 'vehiculos' && e.flujo.id !== flujoId)
    .map((e) => e.flujo.id)
}
