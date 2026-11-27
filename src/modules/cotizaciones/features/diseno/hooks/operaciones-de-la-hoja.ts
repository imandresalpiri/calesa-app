import type { Dispatch, SetStateAction } from 'react'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { ClaveDePieza, Diseno, Posicion, SeccionDeDiseno } from '../../../entities/diseno'
import type { ItemSinPosicion } from '../../../entities/diseno-sin-posicion'
import {
  anuncioDeLaMovida,
  nombrarEnLaHoja,
  porQueNoSeMovio,
  type Intento,
} from '../../../entities/diseno/anuncios-de-la-rejilla'
import { cambiarElTamano } from '../../../entities/diseno/anuncios-del-tamano'
import {
  quitarItem,
  quitarSeccion,
  sumarItem,
  sumarSeccion,
} from '../../../entities/diseno/insercion-del-diseno'
import { ordenarPorLectura, type Tamano } from '../../../entities/diseno/lugar-en-la-rejilla'
import {
  destinoEnLaVecina,
  moverPiezaA,
  pasoDeTeclado,
  type Direccion,
  type Movida,
} from '../../../entities/diseno/mover-en-la-rejilla'
import {
  claveDeLaUbicacion,
  ubicarLaPieza,
  type PiezaDeLaHoja,
} from '../../../entities/diseno/pieza-de-la-hoja'
import {
  intentoDeLaCaida,
  soltarEn,
  type Caida,
} from '../../../entities/diseno/soltar-en-la-rejilla'

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
  const nombre = nombrarEnLaHoja(trabajo, etiquetas)
  // Una celda, unos atajos o la tarjeta del total que cambió de sección: el aviso del nivel si cambia quién la ve o quién la edita.
  const anotarElNivel = (despues: Diseno, p: PiezaDeLaHoja) => {
    const antes = ubicarLaPieza(trabajo, p)
    const ahora = ubicarLaPieza(despues, p)
    if (antes === null || ahora === null) return
    anotar(
      { diseno: trabajo, seccion: antes.seccion.id },
      { diseno: despues, seccion: ahora.seccion.id },
      claveDeLaUbicacion(antes),
    )
  }
  // Aplica lo que se movió y devuelve lo que se anuncia: «Moviste «Precio» a la columna 7, fila 2.» o por qué no se movió («No se movió: ahí está «Flete».»). Nulo
  // si no hay nada que decir (el mismo lugar).
  const mover = (p: PiezaDeLaHoja, movida: Movida, intento: Intento): string | null => {
    if (!movida.ok) return porQueNoSeMovio({ diseno: trabajo, nombre }, p, movida, intento)
    const despues = ordenarPorLectura(movida.diseno)
    const anuncio = anuncioDeLaMovida(trabajo, despues, p, nombre)
    if (anuncio === null) return null
    setTrabajo(despues)
    if (p.pieza === 'nodo' || p.pieza === 'atajos' || p.pieza === 'total') anotarElNivel(despues, p)
    return anuncio
  }
  return {
    // Soltar lo que se arrastra donde cayó (`soltar-en-la-rejilla.ts`).
    soltar: (p: PiezaDeLaHoja, caida: Caida) =>
      mover(p, soltarEn(trabajo, p, caida), intentoDeLaCaida(trabajo, p, caida)),
    // Alt+flechas: una celda (una avanzada, un lugar de su lista; el bloque, una fila).
    moverConTeclas: (p: PiezaDeLaHoja, direccion: Direccion) =>
      mover(p, pasoDeTeclado(trabajo, p, direccion), { direccion }),
    // «Mover a la sección anterior / siguiente» del «⋯»: al primer lugar libre de la vecina donde entra. Nulo si no hay.
    moverALaVecina: (p: PiezaDeLaHoja, paso: -1 | 1) => {
      const destino = destinoEnLaVecina(trabajo, p, paso)
      return destino === null
        ? null
        : mover(p, moverPiezaA(trabajo, p, destino), { destino: destino.posicion })
    },
    // El borde y Alt+Shift+flechas: lo que entra de lo pedido, sin empujar a nadie. Devuelve lo que se anuncia (lo que mide o por qué no cambió); nulo si la
    // pieza no está en la rejilla.
    cambiarElTamano: (p: PiezaDeLaHoja, pedido: Partial<Tamano>): string | null => {
      const r = cambiarElTamano(trabajo, p, pedido, nombre)
      if (r === null) return null
      if (r.diseno !== trabajo) setTrabajo(r.diseno)
      return r.anuncio
    },
    // En el primer lugar libre de la sección donde entra (con `despues`, el primero después de esa posición).
    sumar: (seccionId: string, item: ItemSinPosicion, despues?: Posicion) => {
      setTrabajo((d) => sumarItem(d, seccionId, item, despues))
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
      avisarConDeshacer(`Quitaste la sección ${nombre({ pieza: 'seccion', seccion: id })}.`, () => {
        setTrabajo(trabajo)
      })
      return null
    },
  }
}
