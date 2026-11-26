'use client'

import { useState, type RefObject } from 'react'
import { BotonDelValor } from './boton-del-valor'
import { EntradaDeXCell } from './entrada-de-xcell'
import type { DatosDeLado, Lado, useEdicion } from './use-edicion'

type Props = {
  lado: Lado
  datos: DatosDeLado
  etiqueta: string
  moneda: string | undefined
  idDelBoton: string
  idDeLaEtiqueta: string
  // Lo que describe al botón de este lado y a la entrada abierta (que nunca nombra un candado).
  idDeLaNota: string | undefined
  idDeLaNotaDeLaEntrada: string | undefined
  // El lado que se lee primero va grande (el monto o, en un par con el monto de secundario, el %); el otro, chico.
  grande: boolean
  // Su lugar entre los valores (0 el primero que se ve): el orden de las flechas.
  parada: number
  bloqueada: boolean
  // El lado que abre un toque en el fondo de la celda (el primero libre): se ilumina al pasar el puntero por la celda.
  blanco: boolean
  // Tocar este lado bloqueado muestra el motivo de su candado en vez de abrir.
  alBloqueado: (lado: Lado) => void
  soloEsteLado: boolean
  conAtajo: boolean
  principalRef: RefObject<HTMLElement | null>
  edicion: ReturnType<typeof useEdicion>
}

// Un lado de la celda: la entrada si se está editando ese lado y, si no, el botón con su valor.
export function LadoDeXCell(props: Props) {
  const { lado, datos, etiqueta, edicion: e } = props
  // El ancho del botón al abrirse: la entrada lo toma (el valor no tiene un ancho fijo: nunca se corta).
  const [ancho, setAncho] = useState<number | null>(null)
  if (e.edicion?.lado === lado) {
    return (
      <EntradaDeXCell
        ancho={ancho}
        grande={props.grande}
        texto={e.edicion.texto}
        seleccion={e.edicion.seleccion}
        nombre={lado === 'principal' ? etiqueta : `${etiqueta}, ${datos.formato}`}
        describedby={props.idDeLaNotaDeLaEntrada}
        invalido={e.edicion.aviso !== null}
        alEscribir={e.alEscribir}
        alCerrar={e.alCerrar}
        alPerderElFoco={e.alPerderElFoco}
      />
    )
  }
  return (
    <BotonDelValor
      lado={lado}
      datos={datos}
      grande={props.grande}
      parada={props.parada}
      moneda={props.moneda}
      idDelBoton={props.idDelBoton}
      idDeLaEtiqueta={props.idDeLaEtiqueta}
      idDeLaNota={props.idDeLaNota}
      bloqueada={props.bloqueada}
      blanco={props.blanco}
      soloEsteLado={props.soloEsteLado}
      conAtajo={props.conAtajo}
      volverARef={e.volverARef}
      principalRef={props.principalRef}
      alAbrir={(l) => {
        if (props.bloqueada) props.alBloqueado(l)
        else e.abrir(l, null, 'todo')
      }}
      alTeclear={e.alTeclearEnElValor}
      alMedir={setAncho}
    />
  )
}
