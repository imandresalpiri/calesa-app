'use client'

import type Konva from 'konva'
import { useCallback } from 'react'
import type { Medidas } from '../../../entities/formatos'
import type { ImagenPedida, ManejoDelLienzo } from '../tipos'
import { NOMBRE_DE_LA_INTERFAZ, NOMBRE_DEL_RESPALDO } from './nodos-del-lienzo'

type Args = {
  stage: Konva.Stage | null
  medidas: Medidas
  // Las fuentes y las imágenes de la página; devuelve cuántas imágenes no cargaron.
  esperar: () => Promise<number>
}

// Dibuja el documento en un canvas nuevo con el Stage llevado a la identidad (posición 0, escala 1, el tamaño del documento) y sin la
// interfaz ni los respaldos de las imágenes: así sale entero sin importar el zoom ni el desplazamiento. Todo sin esperar nada entre medio,
// para que no se vea parpadear; en el `finally` vuelve como estaba.
function dibujarElDocumento(
  stage: Konva.Stage,
  medidas: Medidas,
  pixelRatio: number,
): HTMLCanvasElement | null {
  const antes = { posicion: stage.position(), escala: stage.scale(), tamano: stage.size() }
  const ocultos = [
    ...stage.find(`.${NOMBRE_DE_LA_INTERFAZ}`),
    ...stage.find(`.${NOMBRE_DEL_RESPALDO}`),
  ].filter((nodo) => nodo.visible())
  for (const nodo of ocultos) {
    nodo.hide()
  }
  try {
    for (const texto of stage.find<Konva.Text>('Text')) {
      texto._setTextData()
    }
    stage.position({ x: 0, y: 0 })
    stage.scale({ x: 1, y: 1 })
    stage.size({ width: medidas.ancho, height: medidas.alto })
    return stage.toCanvas({ x: 0, y: 0, width: medidas.ancho, height: medidas.alto, pixelRatio })
  } catch {
    return null
  } finally {
    stage.position(antes.posicion)
    stage.scale(antes.escala)
    stage.size(antes.tamano)
    for (const nodo of ocultos) {
      nodo.show()
    }
    stage.batchDraw()
  }
}

function aBlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolver) => {
    try {
      canvas.toBlob(resolver, tipo)
    } catch {
      resolver(null)
    }
  })
}

// `imagen()` del lienzo: espera fuentes e imágenes, dibuja el documento a `pixelRatio` y lo codifica (`tipo`; Safari da PNG si se le pide
// WebP: quien sube mira `blob.type`). Nulo si el Stage no está o el navegador no pudo armarla.
export function useExportar({ stage, medidas, esperar }: Args): ManejoDelLienzo['imagen'] {
  return useCallback(
    async ({ pixelRatio, tipo }: ImagenPedida) => {
      if (!stage) {
        return null
      }
      const faltan = await esperar()
      const canvas = dibujarElDocumento(stage, medidas, pixelRatio)
      const blob = canvas ? await aBlob(canvas, tipo) : null
      return blob ? { blob, faltan } : null
    },
    [stage, medidas, esperar],
  )
}
