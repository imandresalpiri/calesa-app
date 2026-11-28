'use client'

import { memo } from 'react'
import { Group, Layer, Rect } from 'react-konva'
import type { CapaDeArte, FondoDeArte, PaginaDeArte } from '../../../../entities/documento'
import { puntosDelDegradado } from '../../../../entities/editor/dibujo'
import { estaBloqueada, estaOculta } from '../../../../entities/editor/grupos'
import type { Medidas } from '../../../../entities/formatos'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { FuentesDelLienzo } from '../../hooks/use-fuentes-listas'
import { NodoDeForma } from './nodos/nodo-de-forma'
import { NodoDeImagen } from './nodos/nodo-de-imagen'
import { NodoDeLinea } from './nodos/nodo-de-linea'
import { NodoDeTexto } from './nodos/nodo-de-texto'
import { NodoDeTrazo } from './nodos/nodo-de-trazo'

type Props = {
  pagina: PaginaDeArte
  medidas: Medidas
  logos: readonly LogoDelEditor[]
  // Con «mover»: las capas se eligen y se arrastran. Con otra herramienta (o la mano) el puntero es del Stage.
  escucha: boolean
  soloLectura: boolean
  // El texto que se está escribiendo encima (no se dibuja).
  editando: string | null
  fuentes: FuentesDelLienzo
  escala: number
  alMedirTexto: (id: string, alto: number) => void
}

function Fondo({ fondo, medidas }: { fondo: FondoDeArte; medidas: Medidas }) {
  if (fondo.tipo === 'color') {
    return <Rect width={medidas.ancho} height={medidas.alto} fill={fondo.color} listening={false} />
  }
  const { inicio, fin } = puntosDelDegradado(medidas, fondo.angulo)
  return (
    <Rect
      width={medidas.ancho}
      height={medidas.alto}
      fillLinearGradientStartPoint={inicio}
      fillLinearGradientEndPoint={fin}
      fillLinearGradientColorStops={[0, fondo.desde, 1, fondo.hasta]}
      listening={false}
    />
  )
}

type DelNodo = Omit<Props, 'pagina' | 'medidas' | 'escucha' | 'soloLectura'> & {
  capa: CapaDeArte
  arrastrable: boolean
  escucha: boolean
}

function NodoDeLaCapa({
  capa,
  logos,
  editando,
  fuentes,
  escala,
  alMedirTexto,
  ...interaccion
}: DelNodo) {
  switch (capa.tipo) {
    case 'texto':
      return (
        <NodoDeTexto
          capa={capa}
          {...interaccion}
          familia={fuentes.familiaDe(capa.fuente)}
          versionDeFuentes={fuentes.version}
          editando={editando === capa.id}
          alMedir={alMedirTexto}
        />
      )
    case 'forma':
      return <NodoDeForma capa={capa} {...interaccion} />
    case 'linea':
      return <NodoDeLinea capa={capa} escala={escala} {...interaccion} />
    case 'trazo':
      return <NodoDeTrazo capa={capa} escala={escala} {...interaccion} />
    case 'imagen':
    case 'logo':
    case 'foto':
    case 'tarjeta':
      return <NodoDeImagen capa={capa} logos={logos} {...interaccion} />
  }
}

// Lo que se exporta: el fondo y las capas visibles, recortados al documento. Una capa bloqueada (o de un grupo bloqueado) no escucha el
// puntero; en sólo lectura nada se arrastra.
export const CapaDeContenido = memo(function CapaDeContenido({
  pagina,
  medidas,
  escucha,
  soloLectura,
  ...resto
}: Props) {
  return (
    <Layer listening={escucha}>
      <Group clipX={0} clipY={0} clipWidth={medidas.ancho} clipHeight={medidas.alto}>
        <Fondo fondo={pagina.fondo} medidas={medidas} />
        {pagina.capas.map((capa) => {
          if (estaOculta(pagina, capa)) {
            return null
          }
          const bloqueada = estaBloqueada(pagina, capa)
          return (
            <NodoDeLaCapa
              key={capa.id}
              capa={capa}
              {...resto}
              arrastrable={!soloLectura && !bloqueada}
              escucha={!bloqueada}
            />
          )
        })}
      </Group>
    </Layer>
  )
})
