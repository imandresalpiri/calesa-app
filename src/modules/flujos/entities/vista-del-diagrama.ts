// La vista del diagrama ya dispuesto (`disposicion-del-diagrama.ts`): al abrirlo y al enfocar una fase. Puro: sin I/O ni React.
import type { DisposicionDelDiagrama, Punto } from './disposicion-del-diagrama'

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

// La vista corrida lo justo para que una caja (px del diagrama, `{x, y}` arriba a la izquierda y su tamaño) quede entera dentro del lienzo, a `margen` px
// de cada borde; el mismo zoom. Nula si ya se ve. Para que una fase movida con el teclado no salga de la vista (fuera, React Flow no la dibuja y se pierde
// el foco).
export function vistaQueMuestra(
  caja: Punto & { ancho: number; alto: number },
  vista: Vista,
  lienzo: { ancho: number; alto: number },
  margen: number,
): Vista | null {
  const corrimiento = (desde: number, largo: number, total: number) => {
    const inicio = desde
    const fin = desde + largo
    if (inicio < margen) return margen - inicio
    if (fin > total - margen) return Math.max(margen - inicio, total - margen - fin)
    return 0
  }
  const dx = corrimiento(caja.x * vista.zoom + vista.x, caja.ancho * vista.zoom, lienzo.ancho)
  const dy = corrimiento(caja.y * vista.zoom + vista.y, caja.alto * vista.zoom, lienzo.alto)
  if (dx === 0 && dy === 0) return null
  return { x: vista.x + dx, y: vista.y + dy, zoom: vista.zoom }
}
