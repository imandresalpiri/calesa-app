'use client'

import { memo, useMemo } from 'react'
import { Group, Image as ImagenDeKonva, Line, Rect } from 'react-konva'
import type { CapaConImagen, Punto } from '../../../../../entities/documento'
import { cajaParaContener, recorteParaCubrir } from '../../../../../entities/editor/dibujo'
import type { FuenteDeImagen } from '../../../../../entities/editor/fuente-de-la-capa'
import type { Medidas } from '../../../../../entities/formatos'
import { NOMBRE_DEL_RESPALDO } from '../../../hooks/nodos-del-lienzo'
import { medidasDeLaImagen, useImagenDelLienzo } from '../../../hooks/use-imagen-del-lienzo'
import { atributosDeLaCapa, sombraDe, TRANSPARENTE, type Interaccion } from './atributos'

const COLOR_DEL_RESPALDO = '#eef0f4'
const BORDE_DEL_RESPALDO = '#8a8f9b'

// `fuente`: de dónde sale lo que dibuja con los datos de ahora (`capasConDatos()`); nula, el respaldo.
type Props = Interaccion & { capa: CapaConImagen; fuente: FuenteDeImagen | null }

type Colocacion = {
  x: number
  y: number
  width: number
  height: number
  crop?: { x: number; y: number; width: number; height: number }
}

// Dónde va la imagen en su caja: «cubrir» la recorta alrededor del foco (el de la foto; si no, el centro), «contener» (y siempre el logo y la
// tarjeta) la deja entera y centrada.
function colocacion(
  imagen: HTMLImageElement,
  caja: Medidas,
  { contener, foco }: { contener: boolean; foco: Punto | undefined },
): Colocacion {
  const natural = medidasDeLaImagen(imagen)
  if (contener) {
    const c = cajaParaContener(natural, caja)
    return { x: c.x, y: c.y, width: c.ancho, height: c.alto }
  }
  const r = recorteParaCubrir(natural, caja, foco)
  return {
    x: 0,
    y: 0,
    width: caja.ancho,
    height: caja.alto,
    crop: { x: r.x, y: r.y, width: r.ancho, height: r.alto },
  }
}

// Mientras carga, un fondo liso; si no cargó, un marco con una diagonal.
function Respaldo({ caja, fallo }: { caja: Medidas; fallo: boolean }) {
  const grosor = Math.max(1, Math.min(caja.ancho, caja.alto) / 100)
  return (
    <>
      <Rect
        name={NOMBRE_DEL_RESPALDO}
        width={caja.ancho}
        height={caja.alto}
        fill={COLOR_DEL_RESPALDO}
        stroke={fallo ? BORDE_DEL_RESPALDO : undefined}
        strokeWidth={grosor}
        listening={false}
      />
      {fallo ? (
        <Line
          name={NOMBRE_DEL_RESPALDO}
          points={[0, 0, caja.ancho, caja.alto]}
          stroke={BORDE_DEL_RESPALDO}
          strokeWidth={grosor}
          listening={false}
        />
      ) : null}
    </>
  )
}

// El borde va alrededor de lo que se ve de la imagen (contenida, puede ser menos que la caja).
function Marco({ capa, lugar }: { capa: CapaConImagen; lugar: Colocacion | null }) {
  if (!capa.borde || capa.grosor <= 0) {
    return null
  }
  return (
    <Rect
      x={lugar?.x ?? 0}
      y={lugar?.y ?? 0}
      width={lugar?.width ?? capa.ancho}
      height={lugar?.height ?? capa.alto}
      cornerRadius={capa.radio}
      stroke={capa.borde}
      strokeWidth={capa.grosor}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

// Una imagen de la biblioteca, el logo, una foto del vehículo o la tarjeta de la cotización, con su marco (radio, borde) y su sombra.
export const NodoDeImagen = memo(function NodoDeImagen({
  capa,
  fuente,
  arrastrable,
  escucha,
}: Props) {
  const caja = useMemo(() => ({ ancho: capa.ancho, alto: capa.alto }), [capa.ancho, capa.alto])
  const { imagen, estado } = useImagenDelLienzo(fuente, caja)
  const contener = !('ajuste' in capa) || capa.ajuste === 'contener'
  const foco = capa.tipo === 'foto' ? capa.foco : undefined
  const lugar = imagen ? colocacion(imagen, caja, { contener, foco }) : null

  return (
    <Group {...atributosDeLaCapa(capa, { arrastrable, escucha })}>
      <Rect width={capa.ancho} height={capa.alto} fill={TRANSPARENTE} />
      {imagen && lugar ? (
        <ImagenDeKonva
          image={imagen}
          {...lugar}
          cornerRadius={capa.radio}
          listening={false}
          perfectDrawEnabled={false}
          {...sombraDe(capa.sombra)}
        />
      ) : (
        <Respaldo caja={caja} fallo={estado === 'fallo'} />
      )}
      <Marco capa={capa} lugar={lugar} />
    </Group>
  )
})
