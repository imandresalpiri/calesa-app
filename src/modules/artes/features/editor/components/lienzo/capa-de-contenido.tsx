'use client'

import { memo } from 'react'
import { Group, Layer, Rect } from 'react-konva'
import type { CapasConDatos } from '../../../../entities/datos/capas-con-datos'
import type { CapaDeArte, FondoDeArte, PaginaDeArte } from '../../../../entities/documento'
import { puntosDelDegradado } from '../../../../entities/editor/dibujo'
import { estaBloqueada, estaOculta } from '../../../../entities/editor/grupos'
import type { FuenteDeImagen } from '../../../../entities/editor/fuente-de-la-capa'
import type { Medidas, TipoDeArte } from '../../../../entities/formatos'
import type { FuentesDelLienzo } from '../../hooks/use-fuentes-listas'
import { NodoDeForma } from './nodos/nodo-de-forma'
import { NodoDeImagen } from './nodos/nodo-de-imagen'
import { NodoDeLinea } from './nodos/nodo-de-linea'
import { NodoDeTexto } from './nodos/nodo-de-texto'
import { NodoDeTrazo } from './nodos/nodo-de-trazo'

type Props = {
  pagina: PaginaDeArte
  medidas: Medidas
  // Un PDF no dibuja sombras ni el contorno de un texto (`efectosDelFormato()`).
  tipo: TipoDeArte
  // Lo que dibuja cada capa con los datos de ahora (`capasConDatos()`): el texto resuelto, la imagen de dónde sale y las que se esconden.
  conDatos: CapasConDatos
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

type DelNodo = Omit<Props, 'pagina' | 'medidas' | 'escucha' | 'soloLectura' | 'conDatos'> & {
  capa: CapaDeArte
  // El texto con los datos (o el de la capa, si no lleva ninguno) y la imagen (nula: no hay de dónde).
  texto: string | null
  fuente: FuenteDeImagen | null
  arrastrable: boolean
  escucha: boolean
}

function NodoDeLaCapa({
  capa,
  texto,
  fuente,
  editando,
  fuentes,
  escala,
  alMedirTexto,
  tipo,
  ...interaccion
}: DelNodo) {
  switch (capa.tipo) {
    case 'texto':
      return (
        <NodoDeTexto
          capa={capa}
          tipo={tipo}
          texto={texto ?? capa.texto}
          {...interaccion}
          familia={fuentes.familiaDe(capa.fuente)}
          versionDeFuentes={fuentes.version}
          editando={editando === capa.id}
          alMedir={alMedirTexto}
        />
      )
    case 'forma':
      return <NodoDeForma capa={capa} tipo={tipo} {...interaccion} />
    case 'linea':
      return <NodoDeLinea capa={capa} escala={escala} tipo={tipo} {...interaccion} />
    case 'trazo':
      return <NodoDeTrazo capa={capa} escala={escala} tipo={tipo} {...interaccion} />
    case 'imagen':
    case 'logo':
    case 'foto':
    case 'tarjeta':
      return <NodoDeImagen capa={capa} fuente={fuente} tipo={tipo} {...interaccion} />
  }
}

// Lo que se exporta: el fondo y las capas visibles, recortados al documento, con los datos del vehículo de ejemplo. Una capa a la que le falta
// su dato (la foto N que el vehículo no tiene, un texto sin líneas) no se dibuja. Una capa bloqueada (o de un grupo bloqueado) no escucha el
// puntero; en sólo lectura nada se arrastra.
export const CapaDeContenido = memo(function CapaDeContenido({
  pagina,
  medidas,
  escucha,
  soloLectura,
  conDatos,
  ...resto
}: Props) {
  return (
    <Layer listening={escucha}>
      <Group clipX={0} clipY={0} clipWidth={medidas.ancho} clipHeight={medidas.alto}>
        <Fondo fondo={pagina.fondo} medidas={medidas} />
        {pagina.capas.map((capa) => {
          if (estaOculta(pagina, capa) || conDatos.escondidas.has(capa.id)) {
            return null
          }
          const bloqueada = estaBloqueada(pagina, capa)
          const resuelta = conDatos.resueltas.get(capa.id)
          return (
            <NodoDeLaCapa
              key={capa.id}
              capa={capa}
              texto={resuelta?.tipo === 'texto' ? resuelta.texto : null}
              fuente={resuelta?.tipo === 'imagen' ? resuelta.fuente : null}
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
