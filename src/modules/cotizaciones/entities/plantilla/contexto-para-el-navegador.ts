// Lo que el editor de la tarjeta lleva al navegador: del contexto de `validarPlantilla()` sólo lo que ese validador y el editor necesitan. La `definicion` entera de la
// fórmula pesa decenas de KB y no se dibuja. Quedan los nodos del nivel «todos» (los que el editor ofrece para «Dato», con los de los tipos de cambio y la variante) y
// los restringidos que la cuadrícula ya nombra (para marcarlos: con ellos no se podría publicar); de cada uno su etiqueta, su grupo, su salida, su descripción y su
// par porcentaje-monto (`tipo`, `op`, `pct`), y de la variante sus opciones. Los buckets, los grupos, del diseño los modos y los secundarios, y de la visibilidad sólo
// el `ver` de esos ids, del `pct` de su par y de los que dan el tipo de cambio de un bucket (los juzga `tipoDeCambioRestringido()`). Nunca el cuerpo de un nodo (su
// fórmula, sus entradas) ni un nodo restringido que la cuadrícula no nombra. Todo lo que se arma por id va por `Object.fromEntries`/`Map`:
// `__proto__` y `constructor` son ids legales.
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { datosNombrados } from './datos-de-la-cuadricula'
import {
  esDeTodos,
  type DefinicionParaPlantilla,
  type DisenoParaPlantilla,
  type NodoParaPlantilla,
  type VisibilidadParaPlantilla,
} from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

// Los nodos que la cuadrícula nombra: los de las filas y los de las celdas, también los de sus condiciones y sus listas de respaldo.
export const nodosNombradosPor = (p: PlantillaEnCuadricula): ReadonlySet<string> =>
  new Set(datosNombrados(p).flatMap((d) => (d.nodo === null ? [] : [d.nodo])))

// La variante, sólo si es del nivel «todos»: el título de la opción en la tarjeta y en «Ocultas con esta referencia».
const varianteDeTodos = ({ definicion, visibilidad }: ContextoDePlantilla) =>
  (definicion.nodos ?? []).find(
    (n) => n.tipo === 'opcion' && visibilidad !== null && esDeTodos(visibilidad, n.id),
  )

const textoONulo = (v: unknown): string | null => (typeof v === 'string' ? v : null)

// Lo que viaja de un nodo.
function nodoReducido(n: NodoParaPlantilla, opcion: string | undefined): NodoParaPlantilla {
  return {
    id: n.id,
    etiqueta: n.etiqueta ?? null,
    grupo: n.grupo ?? null,
    salida: n.salida ?? null,
    ...(typeof n.descripcion === 'string' && n.descripcion !== ''
      ? { descripcion: n.descripcion }
      : {}),
    ...(typeof n.tipo === 'string' ? { tipo: n.tipo } : {}),
    ...(textoONulo(n.op) === null ? {} : { op: n.op }),
    ...(textoONulo(n.pct) === null ? {} : { pct: n.pct }),
    ...(typeof n.decimales === 'number' ? { decimales: n.decimales } : {}),
    ...(n.id === opcion
      ? { opciones: (n.opciones ?? []).map((o) => ({ clave: o.clave, titulo: o.titulo })) }
      : {}),
  }
}

export function contextoParaElNavegador(
  contexto: ContextoDePlantilla,
  cuadricula: PlantillaEnCuadricula,
): ContextoDePlantilla {
  const { definicion, diseno, visibilidad } = contexto
  const vis = visibilidad ?? {}
  const buckets = definicion.buckets ?? {}
  const deLosModos = (diseno?.cabecera?.modos ?? []).map((m) => ({
    clave: m.clave ?? null,
    nombre: m.nombre ?? null,
    buckets: (m.buckets ?? []).map(({ bucket, nodo }) => ({ bucket, nodo })),
  }))
  // Los nodos que dan el tipo de cambio de un bucket (el de omisión y los de cada modo): `tipoDeCambioRestringido()` los juzga por su visibilidad.
  const deTipoDeCambio = new Set([
    ...Object.values(buckets),
    ...deLosModos.flatMap((m) => m.buckets.map((b) => b.nodo)),
  ])
  const nombrados = nodosNombradosPor(cuadricula)
  const opcion = varianteDeTodos(contexto)
  // Un nodo de un nivel restringido que la cuadrícula no nombra no viaja (tampoco el de un tipo de cambio): de él sólo va su `ver`, que juzga el validador.
  const nodos: NodoParaPlantilla[] = (definicion.nodos ?? [])
    .filter((n) => esDeTodos(vis, n.id) || nombrados.has(n.id) || n.id === opcion?.id)
    .map((n) => nodoReducido(n, opcion?.id))
  const reducida: DefinicionParaPlantilla = {
    nodos,
    buckets: Object.fromEntries(Object.entries(buckets)),
    grupos: (definicion.grupos ?? []).map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta ?? null,
      tono: g.tono ?? null,
      bucket: g.bucket ?? null,
      plazo: typeof g.plazo === 'string' ? g.plazo : null,
    })),
  }
  const disenoReducido: DisenoParaPlantilla | null =
    diseno === null
      ? null
      : {
          cabecera: { modos: deLosModos },
          tarjeta_total: { secundarios: [...(diseno.tarjeta_total?.secundarios ?? [])] },
        }
  return {
    definicion: reducida,
    diseno: disenoReducido,
    visibilidad: visibilidadReducida(visibilidad, [
      ...nodos.map((n) => n.id),
      ...nodos.flatMap((n) => (typeof n.pct === 'string' ? [n.pct] : [])),
      ...deTipoDeCambio,
      ...nombrados,
    ]),
    tonos: contexto.tonos,
  }
}

// Sólo `{ ver }` de cada id que se queda; un id que no figura sigue sin figurar (para `esDeTodos()` es restringido).
function visibilidadReducida(
  visibilidad: VisibilidadParaPlantilla | null,
  ids: readonly string[],
): VisibilidadParaPlantilla | null {
  if (visibilidad === null) return null
  const entradas = [...new Set(ids)].flatMap((id): [string, { ver?: unknown }][] => {
    if (!Object.hasOwn(visibilidad, id)) return []
    const v = visibilidad[id]
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [[id, {}]]
    return [[id, Object.hasOwn(v, 'ver') ? { ver: (v as { ver?: unknown }).ver } : {}]]
  })
  return Object.fromEntries(entradas)
}
