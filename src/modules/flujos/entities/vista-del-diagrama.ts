// Lo que se hace sobre el diagrama ya dispuesto (`disposicion-del-diagrama.ts`): dónde cae una fase que se suelta, el orden que eso da y la vista al
// abrir o al enfocar una fase. Puro: sin I/O ni React.
import type { DisposicionDelDiagrama, MedidasDelDiagrama, Punto } from './disposicion-del-diagrama'

// La columna donde cae una caja que se suelta con su centro en `xCentro`, dentro de las `n` que hay.
export function columnaAlSoltar(xCentro: number, m: MedidasDelDiagrama, n: number): number {
  const columna = Math.round((xCentro - m.margen - m.ancho / 2) / (m.ancho + m.separacion))
  return Math.min(Math.max(columna, 0), Math.max(n - 1, 0))
}

// La fase tras la que va la movida si se suelta en `columna` (`fase_mover(…, p_despues_de)`; nula = primera), o `null` si queda donde estaba.
export function despuesDeAlSoltar(
  ids: readonly string[],
  idMovida: string,
  columna: number,
): { despuesDe: string | null } | null {
  const antes = ids.indexOf(idMovida)
  if (antes < 0) return null
  const sin = ids.filter((id) => id !== idMovida)
  const donde = Math.min(Math.max(columna, 0), sin.length)
  if (donde === antes) return null
  return { despuesDe: donde === 0 ? null : (sin[donde - 1] ?? null) }
}

// El orden que se ve en pantalla mientras `fase_mover` contesta.
export function ordenAlSoltar<T extends { id: string }>(
  fases: readonly T[],
  idMovida: string,
  columna: number,
): T[] {
  const movida = fases.find((f) => f.id === idMovida)
  if (!movida) return [...fases]
  const sin = fases.filter((f) => f.id !== idMovida)
  const donde = Math.min(Math.max(columna, 0), sin.length)
  return [...sin.slice(0, donde), movida, ...sin.slice(donde)]
}

export const ZOOM_MINIMO_INICIAL = 0.6
export const ZOOM_MAXIMO_INICIAL = 1

export type Vista = { x: number; y: number; zoom: number }

// La vista al abrir el diagrama, del tamaño del lienzo (px): el zoom que hace entrar todo el dibujo (sus límites, que no empiezan en 0 si una fase quedó
// a la izquierda o arriba), entre 0,6 y 1. Si entra, centrado; si no, desde el principio o con la fase abierta en el medio (sin pasarse de los bordes).
export function vistaInicial(
  disposicion: Pick<DisposicionDelDiagrama, 'limites' | 'nodos' | 'medidas'>,
  contenedor: { ancho: number; alto: number },
  faseId: string | null,
): Vista {
  const { limites } = disposicion
  const ajuste = Math.min(contenedor.ancho / limites.ancho, contenedor.alto / limites.alto)
  const zoom = Math.min(Math.max(ajuste, ZOOM_MINIMO_INICIAL), ZOOM_MAXIMO_INICIAL)
  const anchoVisto = limites.ancho * zoom
  const altoVisto = limites.alto * zoom
  // `0 -` y no `-`: sin el dibujo corrido, 0 y no -0.
  const desdeX = 0 - limites.x * zoom
  const desdeY = 0 - limites.y * zoom
  const y = desdeY + (altoVisto <= contenedor.alto ? (contenedor.alto - altoVisto) / 2 : 0)
  if (anchoVisto <= contenedor.ancho) {
    return { x: desdeX + (contenedor.ancho - anchoVisto) / 2, y, zoom }
  }
  const nodo = faseId === null ? undefined : disposicion.nodos.find((n) => n.id === faseId)
  if (!nodo) {
    return { x: desdeX, y, zoom }
  }
  const centrado = contenedor.ancho / 2 - (nodo.x + disposicion.medidas.ancho / 2) * zoom
  return {
    x: Math.min(desdeX, Math.max(centrado, desdeX + contenedor.ancho - anchoVisto)),
    y,
    zoom,
  }
}

// El punto del diagrama que hay que poner en el centro del lienzo para que la fase quede en el medio de lo que el panel no tapa (los px de la derecha que
// cubre), con este zoom. Nulo si la fase no está dibujada.
export function centroParaVerLaFase(
  disposicion: Pick<DisposicionDelDiagrama, 'nodos' | 'medidas'>,
  faseId: string,
  tapado: number,
  zoom: number,
): Punto | null {
  const nodo = disposicion.nodos.find((n) => n.id === faseId)
  if (!nodo) return null
  return {
    x: nodo.x + disposicion.medidas.ancho / 2 + tapado / 2 / zoom,
    y: nodo.y + disposicion.medidas.alto / 2,
  }
}
