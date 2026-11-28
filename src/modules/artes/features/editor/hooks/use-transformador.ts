'use client'

import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Box } from 'konva/lib/shapes/Transformer'
import { useCallback, useEffect, useRef } from 'react'
import type { CapaDeArte } from '../../../entities/documento'
import { capaTransformada } from '../../../entities/editor/lienzo'
import type { EditorDeArte } from '../tipos'

// Menos que esto (en px de pantalla), un lado no se achica más con las asas.
const LADO_MINIMO = 4

// Las asas no dejan una caja sin lado (una línea recta ya no tiene uno: ése no se mira).
export function cajaPermitida(vieja: Box, nueva: Box): Box {
  const angosta = Math.abs(nueva.width) < LADO_MINIMO && Math.abs(vieja.width) >= LADO_MINIMO
  const baja = Math.abs(nueva.height) < LADO_MINIMO && Math.abs(vieja.height) >= LADO_MINIMO
  return angosta || baja ? vieja : nueva
}

const esTexto = (nodo: Konva.Node) => nodo.getClassName() === 'Text'

// Lo que hace el Transformer con las capas: un texto nunca escala (mientras se tira de un costado cambia su ancho y la letra queda igual);
// al soltar, cada nodo vuelve a escala 1 y lo que cambió (caja, giro, puntos o nodos) es un solo `cambiar`: un paso del historial.
export function useTransformador(editor: EditorDeArte) {
  const ultimo = useRef(editor)

  useEffect(() => {
    ultimo.current = editor
  })

  const alTransformar = useCallback((e: KonvaEventObject<Event>) => {
    const transformador = e.currentTarget as Konva.Transformer
    for (const nodo of transformador.nodes()) {
      if (esTexto(nodo) && nodo.scaleX() !== 1) {
        const ancho = Math.max(1, nodo.width() * nodo.scaleX())
        nodo.setAttrs({ width: ancho, scaleX: 1, scaleY: 1, offsetX: ancho / 2 })
      }
    }
  }, [])

  const alTerminar = useCallback((e: KonvaEventObject<Event>) => {
    const transformador = e.currentTarget as Konva.Transformer
    const { pagina, despachar } = ultimo.current
    const nuevas = new Map<string, CapaDeArte>()
    for (const nodo of transformador.nodes()) {
      const capa = pagina.capas.find((c) => c.id === nodo.id())
      if (!capa) {
        continue
      }
      const sx =
        capa.tipo === 'texto' ? (capa.ancho > 0 ? nodo.width() / capa.ancho : 1) : nodo.scaleX()
      const transformacion = {
        centro: nodo.position(),
        sx,
        sy: nodo.scaleY(),
        rotacion: nodo.rotation(),
      }
      nuevas.set(capa.id, capaTransformada(capa, transformacion))
      nodo.scale({ x: 1, y: 1 })
    }
    if (nuevas.size > 0) {
      despachar({ tipo: 'cambiar', ids: [...nuevas.keys()], cambio: (c) => nuevas.get(c.id) ?? c })
    }
  }, [])

  return { alTransformar, alTerminar }
}
