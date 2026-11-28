// La cámara del lienzo del editor de artes: dónde queda el origen del documento en la pantalla (px) y a qué escala, como el `Stage` de Konva.
// El documento no cambia: sólo la vista. Zoom al puntero con Ctrl+rueda, desplazar con la rueda o la mano, «Ajustar» y «100 %». Puro.
import type { Punto } from '../documento'
import type { Medidas } from '../formatos'

export type Camara = { x: number; y: number; escala: number }

export const ZOOM_MINIMO = 0.05
export const ZOOM_MAXIMO = 8
export const MARGEN_AL_AJUSTAR = 48
// Lo que más mueve un solo evento de la rueda (un ratón da ±100; un panel táctil, pasos chicos).
const DELTA_MAXIMO_DE_LA_RUEDA = 100
const SENSIBILIDAD_DE_LA_RUEDA = 0.002

export function acotarEscala(escala: number): number {
  return Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, escala))
}

function centrada(contenedor: Medidas, documento: Medidas, escala: number): Camara {
  return {
    x: (contenedor.ancho - documento.ancho * escala) / 2,
    y: (contenedor.alto - documento.alto * escala) / 2,
    escala,
  }
}

// El documento entero a la vista, centrado y con su margen; puede agrandar (hasta el zoom máximo) si el documento es chico.
export function escalaParaAjustar(
  contenedor: Medidas,
  documento: Medidas,
  margen = MARGEN_AL_AJUSTAR,
): Camara {
  const libreAncho = Math.max(contenedor.ancho - margen * 2, 1)
  const libreAlto = Math.max(contenedor.alto - margen * 2, 1)
  const escala = acotarEscala(
    Math.min(libreAncho / Math.max(documento.ancho, 1), libreAlto / Math.max(documento.alto, 1)),
  )
  return centrada(contenedor, documento, escala)
}

// Al 100 %: una unidad del documento, un px de pantalla, centrado.
export function alCien(contenedor: Medidas, documento: Medidas): Camara {
  return centrada(contenedor, documento, 1)
}

export function alDocumento(camara: Camara, pantalla: Punto): Punto {
  return { x: (pantalla.x - camara.x) / camara.escala, y: (pantalla.y - camara.y) / camara.escala }
}

export function aPantalla(camara: Camara, punto: Punto): Punto {
  return { x: camara.x + punto.x * camara.escala, y: camara.y + punto.y * camara.escala }
}

// Multiplica la escala (acotada) y deja quieto el punto del documento que está bajo el puntero.
export function zoomAlPuntero(camara: Camara, puntero: Punto, factor: number): Camara {
  const bajo = alDocumento(camara, puntero)
  const escala = acotarEscala(camara.escala * factor)
  return { x: puntero.x - bajo.x * escala, y: puntero.y - bajo.y * escala, escala }
}

// Cuánto agranda (> 1) o achica (< 1) un evento de Ctrl+rueda: rueda hacia arriba (deltaY negativo) agranda.
export function factorDeLaRueda(deltaY: number): number {
  const acotado = Math.min(DELTA_MAXIMO_DE_LA_RUEDA, Math.max(-DELTA_MAXIMO_DE_LA_RUEDA, deltaY))
  return Math.exp(-acotado * SENSIBILIDAD_DE_LA_RUEDA)
}

export function desplazar(camara: Camara, dx: number, dy: number): Camara {
  return { ...camara, x: camara.x + dx, y: camara.y + dy }
}

// «37 %»: lo que dice la píldora del zoom.
export function textoDelZoom(escala: number): string {
  return `${String(Math.round(escala * 100))} %`
}
