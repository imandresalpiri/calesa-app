'use client'

import type Konva from 'konva'
import { memo, useEffect, useMemo, useState } from 'react'
import { Text } from 'react-konva'
import type { CapaDe } from '../../../../../entities/documento'
import { ALINEACION_EN_EL_LIENZO } from '../../../../../entities/editor/dibujo'
import { contornoQueSeDibuja } from '../../../../../entities/editor/efectos-del-formato'
import { partirEnLineas } from '../../../../../entities/texto/disposicion-del-texto'
import { atributosDeLaCapa, sombraDe, type DelFormato, type Interaccion } from './atributos'
import { fuenteDelContexto, medirEnElNavegador } from './medir-en-el-navegador'

// Lo que puede diferir el alto medido sin volver a anotarlo.
const TOLERANCIA_DEL_ALTO = 0.5

type Props = Interaccion &
  DelFormato & {
    capa: CapaDe<'texto'>
    // Lo que se dibuja: el texto con los datos del vehículo de ejemplo (`resolverTexto()`; sin `{…}`, el de la capa).
    texto: string
    familia: string
    // Cambia cuando cargan las fuentes: el texto se vuelve a medir con la de verdad.
    versionDeFuentes: number
    // Mientras se escribe encima, el texto del lienzo no se ve.
    editando: boolean
    alMedir: (id: string, alto: number) => void
  }

// Un texto con las variables llenas con los datos del vehículo de ejemplo (o los de ejemplo). Su ancho es el de la caja y su alto lo da lo
// que ocupa: tras dibujarlo se mide y, si cambió, se anota (`medirTexto`, fuera del historial y sin contar como cambio: con otro vehículo
// el alto es otro). Las líneas las parte `partirEnLineas()`, la regla del PDF, y Konva dibuja cada una como viene (`wrap="none"`): el corte
// de Konva y el del PDF nunca se separan.
export const NodoDeTexto = memo(function NodoDeTexto({
  capa,
  texto,
  familia,
  versionDeFuentes,
  editando,
  alMedir,
  arrastrable,
  escucha,
  tipo,
}: Props) {
  const [nodo, setNodo] = useState<Konva.Text | null>(null)
  const fuente = fuenteDelContexto(capa.peso, capa.tamano, familia)
  const lineas = useMemo(
    () =>
      partirEnLineas(texto, capa.ancho, medirEnElNavegador(fuente, versionDeFuentes)).join('\n'),
    [texto, capa.ancho, fuente, versionDeFuentes],
  )
  const contorno = contornoQueSeDibuja(capa, tipo)

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
  }, [nodo, capa, lineas, familia, versionDeFuentes, alMedir])

  return (
    <Text
      ref={setNodo}
      {...atributosDeLaCapa(capa, { arrastrable, escucha })}
      {...sombraDe(capa, tipo)}
      visible={!editando}
      width={capa.ancho}
      text={lineas}
      fontFamily={familia}
      fontSize={capa.tamano}
      fontStyle={String(capa.peso)}
      lineHeight={capa.interlineado}
      align={ALINEACION_EN_EL_LIENZO[capa.alineacion]}
      wrap="none"
      fill={capa.color}
      stroke={contorno?.color}
      strokeWidth={contorno?.grosor ?? 0}
      fillAfterStrokeEnabled
    />
  )
})
