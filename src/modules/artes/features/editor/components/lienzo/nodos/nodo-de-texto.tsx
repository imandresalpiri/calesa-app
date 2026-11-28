'use client'

import type Konva from 'konva'
import { memo, useEffect, useState } from 'react'
import { Text } from 'react-konva'
import type { CapaDe } from '../../../../../entities/documento'
import { DATOS_DE_EJEMPLO } from '../../../../../entities/editor/datos-de-ejemplo'
import { ALINEACION_EN_EL_LIENZO } from '../../../../../entities/editor/dibujo'
import { textoConValores } from '../../../../../entities/editor/variables'
import { atributosDeLaCapa, sombraDe, type Interaccion } from './atributos'

// Lo que puede diferir el alto medido sin volver a anotarlo.
const TOLERANCIA_DEL_ALTO = 0.5

type Props = Interaccion & {
  capa: CapaDe<'texto'>
  familia: string
  // Cambia cuando cargan las fuentes: el texto se vuelve a medir con la de verdad.
  versionDeFuentes: number
  // Mientras se escribe encima, el texto del lienzo no se ve.
  editando: boolean
  alMedir: (id: string, alto: number) => void
}

// Un texto con las variables llenas con los datos de ejemplo. Su ancho es el de la caja y su alto lo da lo que ocupa: tras dibujarlo se
// mide y, si cambió, se anota (`medirTexto`, fuera del historial).
export const NodoDeTexto = memo(function NodoDeTexto({
  capa,
  familia,
  versionDeFuentes,
  editando,
  alMedir,
  arrastrable,
  escucha,
}: Props) {
  const [nodo, setNodo] = useState<Konva.Text | null>(null)

  useEffect(() => {
    if (!nodo) {
      return
    }
    nodo._setTextData()
    nodo.getLayer()?.batchDraw()
    const alto = nodo.height()
    if (Math.abs(alto - capa.alto) > TOLERANCIA_DEL_ALTO) {
      alMedir(capa.id, alto)
    }
  }, [nodo, capa, familia, versionDeFuentes, alMedir])

  return (
    <Text
      ref={setNodo}
      {...atributosDeLaCapa(capa, { arrastrable, escucha })}
      {...sombraDe(capa.sombra)}
      visible={!editando}
      width={capa.ancho}
      text={textoConValores(capa.texto, DATOS_DE_EJEMPLO)}
      fontFamily={familia}
      fontSize={capa.tamano}
      fontStyle={String(capa.peso)}
      lineHeight={capa.interlineado}
      align={ALINEACION_EN_EL_LIENZO[capa.alineacion]}
      wrap="word"
      fill={capa.color}
      stroke={capa.borde ?? undefined}
      strokeWidth={capa.borde ? capa.grosor : 0}
      fillAfterStrokeEnabled
    />
  )
})
