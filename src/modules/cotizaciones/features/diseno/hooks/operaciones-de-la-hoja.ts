import type { Dispatch, SetStateAction } from 'react'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import type {
  ClaveDePieza,
  Diseno,
  ItemSinPosicion,
  SeccionDeDiseno,
} from '../../../entities/diseno'
import { moverItemA, type DestinoDeLaPieza } from '../../../entities/diseno/orden-del-diseno'
import {
  quitarItem,
  quitarSeccion,
  sumarItem,
  sumarSeccion,
} from '../../../entities/diseno/insercion-del-diseno'
import { piezaDelItemDeLaHoja, ubicarLaPieza } from '../../../entities/diseno/pieza-de-la-hoja'

export const nombreDeLaPieza = (clave: ClaveDePieza, etiquetas: ReadonlyMap<string, string>) =>
  clave.tipo === 'total' ? 'la tarjeta del total' : `«${etiquetas.get(clave.nodo) ?? clave.nodo}»`

type Lado = { diseno: Diseno; seccion: string }
type Apoyo = {
  etiquetas: ReadonlyMap<string, string>
  // Anota el aviso del nivel si mover la pieza cambia quién la ve o quién la edita.
  anotar: (antes: Lado, despues: Lado, clave: ClaveDePieza) => void
}

// Sumar, quitar y mover piezas y secciones del editor de la hoja, sobre el diseño de trabajo. Quitar se hace en el acto y ofrece «Deshacer» (repone el diseño de
// antes de quitar: es reversible, por eso no pregunta).
export function operacionesDeLaHoja(
  trabajo: Diseno,
  setTrabajo: Dispatch<SetStateAction<Diseno>>,
  { etiquetas, anotar }: Apoyo,
) {
  return {
    // Lo que se anuncia («Moviste «Precio» a «Extras», posición 2 de 3.»); nulo si no se movió (el mismo lugar, o la tarjeta del total a una sección que no la
    // admite).
    mover: (desde: ClaveDePieza, hasta: DestinoDeLaPieza): string | null => {
      const despues = moverItemA(trabajo, desde, hasta)
      if (despues === trabajo) return null
      setTrabajo(despues)
      anotar(
        { diseno: trabajo, seccion: desde.seccion },
        { diseno: despues, seccion: hasta.seccion },
        desde,
      )
      const donde = ubicarLaPieza(despues, piezaDelItemDeLaHoja(desde))
      if (donde === null) return null
      const nombre = nombreDeLaPieza(desde, etiquetas)
      const seccion = donde.seccion.titulo ?? donde.seccion.id
      return `Moviste ${nombre} a «${seccion}», posición ${String(donde.indice + 1)} de ${String(donde.seccion.items.length)}.`
    },
    sumar: (seccionId: string, item: ItemSinPosicion) => {
      setTrabajo((d) => sumarItem(d, seccionId, item))
    },
    quitar: (clave: ClaveDePieza) => {
      setTrabajo(quitarItem(trabajo, clave))
      avisarConDeshacer(`Quitaste ${nombreDeLaPieza(clave, etiquetas)}.`, () => {
        setTrabajo(trabajo)
      })
    },
    // Devuelve el id de la sección nueva (el editor la elige).
    sumarSeccion: (presentacion: SeccionDeDiseno['presentacion']): string => {
      const { diseno, seccion } = sumarSeccion(trabajo, presentacion)
      setTrabajo(diseno)
      return seccion
    },
    // Nulo si se quitó; si no, por qué no (la última sección).
    quitarSeccion: (id: string): string | null => {
      const r = quitarSeccion(trabajo, id)
      if (!r.ok) return r.motivo
      setTrabajo(r.diseno)
      const titulo = trabajo.secciones.find((s) => s.id === id)?.titulo ?? id
      avisarConDeshacer(`Quitaste la sección «${titulo}».`, () => {
        setTrabajo(trabajo)
      })
      return null
    },
  }
}
