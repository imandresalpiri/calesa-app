import type { OrigenDeLaCadena } from '@/modules/logistica'
import { origenElegido } from '@/modules/logistica/pantallas/cadena-origen'

// El origen que dibuja una página de Logística (docs/DECISIONES.md › «Logística siempre en un origen, el último que usaste»). Puro: lo prueba
// `origen-de-la-cadena.test.ts`; las lecturas las hace `origen-de-la-pagina.ts`.
//
// - Pedido por URL y entre los de la persona: ése (`recordar` si no era ya el último).
// - Pedido y existe, pero la persona no tiene `logistica.ver` ahí: `sin_permiso`, sin caer en otro (sería leer otra cosa que lo que dice la URL).
// - Pedido y existe, pero está inactivo o con la logística apagada: `no_disponible` con su nombre; un id que no existe: `no_disponible` sin nombre.
// - Sin pedido: el último que eligió si todavía lo ve; si no, el primero. No se recuerda: no eligió nada.
// - Ninguno: `sin_origenes`. La lista no se pudo leer: `error`.
export type OrigenResuelto =
  | { tipo: 'ok'; origen: OrigenDeLaCadena; origenes: OrigenDeLaCadena[]; recordar: boolean }
  | { tipo: 'sin_permiso' | 'no_disponible'; nombre: string | null; origenes: OrigenDeLaCadena[] }
  | { tipo: 'sin_origenes' | 'error' }

export type DatosDelOrigen = {
  // Los orígenes de Logística de la persona (`leerOrigenesDeLaCadena`); nulo si no se pudo leer.
  visibles: OrigenDeLaCadena[] | null
  // Todos los orígenes, también los inactivos, para nombrar uno pedido que no está entre los visibles.
  todos: readonly { id: string; nombre: string }[]
  // Los ids donde la persona tiene `logistica.ver`.
  conPermiso: readonly string[]
  pedido: string | undefined
  ultimo: string | null
}

export function resolverElOrigen({
  visibles,
  todos,
  conPermiso,
  pedido,
  ultimo,
}: DatosDelOrigen): OrigenResuelto {
  if (visibles === null) return { tipo: 'error' }
  if (pedido !== undefined) {
    const elegido = visibles.find((o) => o.id === pedido)
    if (elegido !== undefined) {
      return { tipo: 'ok', origen: elegido, origenes: visibles, recordar: pedido !== ultimo }
    }
    const existente = todos.find((o) => o.id === pedido)
    if (existente === undefined) return { tipo: 'no_disponible', nombre: null, origenes: visibles }
    return {
      tipo: conPermiso.includes(pedido) ? 'no_disponible' : 'sin_permiso',
      nombre: existente.nombre,
      origenes: visibles,
    }
  }
  const origen = origenElegido(visibles, undefined, ultimo)
  if (origen === null) return { tipo: 'sin_origenes' }
  return { tipo: 'ok', origen, origenes: visibles, recordar: false }
}
