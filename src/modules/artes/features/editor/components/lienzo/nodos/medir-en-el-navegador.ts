'use client'

import type { Medir } from '../../../../../entities/texto/disposicion-del-texto'

// Cuántas medidas se recuerdan antes de empezar de cero: partir un texto mide sus prefijos, y el lienzo y cada miniatura parten los mismos.
const TOPE_DE_LO_MEDIDO = 5000

// Konva arma la fuente del contexto así (`Konva.Text#_getContextFont`): el peso como estilo, la variante, el tamaño y cada familia con
// espacios entre comillas. El texto se mide con la misma cadena con que Konva lo dibuja.
export function fuenteDelContexto(peso: number, tamano: number, familia: string): string {
  const familias = familia
    .split(',')
    .map((f) => {
      const limpia = f.trim()
      const conComillas = limpia.includes('"') || limpia.includes("'")
      return limpia.includes(' ') && !conComillas ? `"${limpia}"` : limpia
    })
    .join(', ')
  return `${String(peso)} normal ${String(tamano)}px ${familias}`
}

let contexto: CanvasRenderingContext2D | null | undefined
const medido = new Map<string, number>()

function contextoParaMedir(): CanvasRenderingContext2D | null {
  if (contexto === undefined) {
    contexto =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  return contexto
}

// El ancho de un texto con esa fuente y kerning, como lo mide Konva (`disposicionDelTexto()` parte con esto). `version` es la de las fuentes
// cargadas (`useFuentesListas`): lo medido con el respaldo no vale cuando llega la fuente de verdad. Sin canvas (en un test), cero.
export function medirEnElNavegador(fuente: string, version: number): Medir {
  return (texto) => {
    const clave = `${String(version)}\u0000${fuente}\u0000${texto}`
    const recordado = medido.get(clave)
    if (recordado !== undefined) {
      return recordado
    }
    const ctx = contextoParaMedir()
    if (!ctx) {
      return 0
    }
    ctx.font = fuente
    ctx.fontKerning = 'auto'
    const ancho = ctx.measureText(texto).width
    if (medido.size >= TOPE_DE_LO_MEDIDO) {
      medido.clear()
    }
    medido.set(clave, ancho)
    return ancho
  }
}
