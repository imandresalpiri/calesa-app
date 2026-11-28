'use client'

import type Konva from 'konva'
import { useEffect, useMemo, useState } from 'react'
import { Transformer } from 'react-konva'
import { esCapaConImagen, type CapaDeArte } from '../../../../entities/documento'
import { anclasDeLaSeleccion } from '../../../../entities/editor/lienzo'
import type { ColoresDelLienzo } from '../../hooks/use-colores-del-lienzo'
import { nodoDeLaCapa } from '../../hooks/nodos-del-lienzo'
import { cajaPermitida, useTransformador } from '../../hooks/use-transformador'
import type { EditorDeArte } from '../../tipos'

// Cada 45°, el giro se pega.
const GIROS = [0, 45, 90, 135, 180, 225, 270, 315]
const LADO_DEL_ASA = 8

type Props = {
  editor: EditorDeArte
  stage: Konva.Stage | null
  // Lo elegido que se puede transformar: sin candado, visible y sin el texto que se está escribiendo.
  capas: readonly CapaDeArte[]
  colores: ColoresDelLienzo
}

// El Transformer sobre lo elegido: asas para cambiar la caja (un texto, sólo las de los costados: cambia su ancho y no su letra; una línea
// recta, las de sus puntas) y la de girar. Una imagen guarda su proporción. En sólo lectura no hay asas.
export function Transformador({ editor, stage, capas, colores }: Props) {
  const [transformador, setTransformador] = useState<Konva.Transformer | null>(null)
  const { alTransformar, alTerminar } = useTransformador(editor)
  const { soloLectura } = editor
  const anclas = useMemo(
    () => (soloLectura ? [] : anclasDeLaSeleccion(capas)),
    [soloLectura, capas],
  )

  // Las capas cambian de caja (el inspector, deshacer, `medirTexto`): el Transformer vuelve a medirlas.
  useEffect(() => {
    if (!transformador || !stage) {
      return
    }
    const nodos = capas.flatMap((c) => nodoDeLaCapa(stage, c.id) ?? [])
    transformador.nodes(nodos)
    transformador.forceUpdate()
    transformador.getLayer()?.batchDraw()
  }, [transformador, stage, capas])

  return (
    <Transformer
      ref={setTransformador}
      enabledAnchors={[...anclas]}
      rotateEnabled={!soloLectura}
      resizeEnabled={!soloLectura && anclas.length > 0}
      keepRatio={capas.length > 0 && capas.every(esCapaConImagen)}
      flipEnabled={false}
      ignoreStroke
      rotationSnaps={GIROS}
      boundBoxFunc={cajaPermitida}
      borderStroke={colores.acento}
      anchorStroke={colores.acento}
      anchorFill={colores.superficie}
      anchorSize={LADO_DEL_ASA}
      onTransform={alTransformar}
      onTransformEnd={alTerminar}
    />
  )
}
