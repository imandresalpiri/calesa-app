// La geometría de un gesto sobre la ventana de cámara (arrastrar por la barra, cambiar el tamaño por una esquina, las flechas): puro, sin React.
import {
  altoDelVideo,
  limitarElAncho,
  llevarAdentro,
  type Punto,
  type Tamano,
} from '../../entities/ventana-de-camara'

// Cuánto se mueve la ventana con una flecha (con Mayús, más) y cuánto cambia su ancho con una flecha sobre la esquina.
export const PASO_CON_FLECHA_PX = 16
export const PASO_CON_MAYUS_PX = 64
export const PASO_DE_ANCHO_PX = 20

// La esquina que se arrastra: la que mira al centro de la pantalla (ahí hay lugar para crecer). La opuesta queda fija.
export type EsquinaDeTamano = { aLaDerecha: boolean; abajo: boolean }

// Cómo era la ventana al empezar: dónde (px) y cuánto medía.
export type Partida = { posicion: Punto; medida: Tamano }

// Lo que se ve mientras la persona arrastra o cambia el tamaño: nada se guarda hasta soltar.
export type Gesto = { posicion: Punto; ancho: number }

// Arrastrar por la barra: la esquina se mueve lo que se movió el puntero, sin salir de la ventana del navegador.
export function arrastrada(partida: Partida, delta: Punto, navegador: Tamano): Gesto {
  return {
    posicion: llevarAdentro(
      { x: partida.posicion.x + delta.x, y: partida.posicion.y + delta.y },
      partida.medida,
      navegador,
    ),
    ancho: partida.medida.ancho,
  }
}

// Cambiar el ancho (limitado a 200 px–50 %): el alto sigue (el video es 16:9, lo demás no cambia) y la esquina opuesta a la que se arrastra queda fija.
export function conAnchoNuevo(
  partida: Partida,
  anchoPedido: number,
  esquina: EsquinaDeTamano,
  navegador: Tamano,
): Gesto & { alto: number } {
  const ancho = limitarElAncho(anchoPedido, navegador.ancho)
  const alto = partida.medida.alto + altoDelVideo(ancho) - altoDelVideo(partida.medida.ancho)
  const izquierda = esquina.aLaDerecha
    ? partida.posicion.x
    : partida.posicion.x + partida.medida.ancho - ancho
  const arriba = esquina.abajo
    ? partida.posicion.y
    : partida.posicion.y + partida.medida.alto - alto
  return {
    posicion: llevarAdentro({ x: izquierda, y: arriba }, { ancho, alto }, navegador),
    ancho,
    alto,
  }
}

// Arrastrando la esquina: crece hacia el centro de la pantalla.
export function redimensionada(
  partida: Partida,
  delta: Punto,
  esquina: EsquinaDeTamano,
  navegador: Tamano,
): Gesto {
  const { posicion, ancho } = conAnchoNuevo(
    partida,
    partida.medida.ancho + (esquina.aLaDerecha ? delta.x : -delta.x),
    esquina,
    navegador,
  )
  return { posicion, ancho }
}

const FLECHAS: Record<string, Punto> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

// Hacia dónde empuja una tecla de flecha, en px (con Mayús, más); `null` si no es una flecha.
export function empujeDeLaTecla(tecla: string, conMayus: boolean): Punto | null {
  const direccion = FLECHAS[tecla]
  const paso = conMayus ? PASO_CON_MAYUS_PX : PASO_CON_FLECHA_PX
  return direccion ? { x: direccion.x * paso, y: direccion.y * paso } : null
}

// Sobre la esquina, derecha y arriba agrandan; izquierda y abajo achican. `null` si no es una flecha.
export function cambioDeAnchoDeLaTecla(tecla: string): number | null {
  if (tecla === 'ArrowRight' || tecla === 'ArrowUp') {
    return PASO_DE_ANCHO_PX
  }
  return tecla === 'ArrowLeft' || tecla === 'ArrowDown' ? -PASO_DE_ANCHO_PX : null
}
