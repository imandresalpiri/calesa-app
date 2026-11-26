'use client'

import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import {
  leerAdjuntos,
  leerComentarios,
  NO_SE_CARGARON,
  NO_SE_CARGARON_LOS_ADJUNTOS,
} from '../../../areas/comentarios/composicion.client'
import { leerRevisiones } from '../../../composicion-revisiones.client'
import type { Adjunto } from '../../../entities/comentarios/adjunto'
import type { PaginaDeComentarios } from '../../../entities/comentarios/comentario'
import {
  entradasLeidas,
  lineaDeTiempo,
  todasLeidas,
  type FuenteDeLaLinea,
  type LecturasDeLaLinea,
} from '../../../entities/comentarios/linea-de-tiempo'
import type { CursorDeRaices } from '../../../entities/comentarios/lista'
import type { PaginaDeRevisiones } from '../../../entities/revisiones'
import { useFuenteDeLaLinea } from './use-fuente-de-la-linea'

const NO_SE_CARGARON_LAS_REVISIONES = 'No se pudieron cargar las revisiones.'

// «Todo» del resumen: una página de cada fuente (los comentarios por su cursor `(creado_en, id)`, las revisiones por el id de la última y los adjuntos enteros: son a lo sumo 20),
// mezcladas por fecha (`lineaDeTiempo()`). «Ver más» le pide su página siguiente sólo a la fuente que marca hasta dónde llega lo dibujado, y se detiene al llegar a
// `TOPE_DE_LO_CARGADO` entre las tres. Una fuente que falla lo dice sin tumbar a las otras.
export function useLineaDeTiempo(cotizacionId: string) {
  const comentarios = useFuenteDeLaLinea<
    PaginaDeComentarios,
    PaginaDeComentarios['comentarios'][number],
    CursorDeRaices
  >({
    leer: (cursor) => leerComentarios({ cotizacionId, cursor }),
    itemsDe: (pagina) => pagina.comentarios,
    siguienteDe: (pagina) => {
      const ultima = pagina.comentarios.at(-1)
      return pagina.hayMas && ultima ? { antesEn: ultima.creadoEn, antesId: ultima.id } : null
    },
    mensajeDeFallo: NO_SE_CARGARON,
  })
  const revisiones = useFuenteDeLaLinea<
    PaginaDeRevisiones,
    PaginaDeRevisiones['revisiones'][number],
    number
  >({
    leer: (antes) => leerRevisiones({ cotizacionId, antes, hasta: null }),
    itemsDe: (pagina) => pagina.revisiones,
    siguienteDe: (pagina) => pagina.siguiente,
    mensajeDeFallo: NO_SE_CARGARON_LAS_REVISIONES,
  })
  const adjuntos = useFuenteDeLaLinea<Adjunto[], Adjunto, never>({
    leer: () => leerAdjuntos(cotizacionId),
    itemsDe: (pagina) => pagina,
    siguienteDe: () => null,
    mensajeDeFallo: NO_SE_CARGARON_LOS_ADJUNTOS,
  })

  const lecturas: LecturasDeLaLinea = {
    adjuntos: { items: adjuntos.items, hayMas: adjuntos.hayMas, leida: adjuntos.leida },
    revisiones: { items: revisiones.items, hayMas: revisiones.hayMas, leida: revisiones.leida },
    comentarios: { items: comentarios.items, hayMas: comentarios.hayMas, leida: comentarios.leida },
  }
  const linea = lineaDeTiempo(lecturas)
  const fuentes = { adjuntos, revisiones, comentarios }
  const porPedir = linea.porPedir.filter((f) => fuentes[f].error === null)
  const enElTope = entradasLeidas(lecturas) >= TOPE_DE_LO_CARGADO && linea.porPedir.length > 0
  const pidiendo = adjuntos.pidiendo || revisiones.pidiendo || comentarios.pidiendo
  // Las que fallaron (la primera página o un «Ver más»), para decirlo y ofrecer «Reintentar» a cada una.
  const fallos = (['comentarios', 'revisiones', 'adjuntos'] as const).flatMap(
    (fuente): { fuente: FuenteDeLaLinea; mensaje: string; reintentar: () => void }[] => {
      const error = fuentes[fuente].error
      return error === null
        ? []
        : [{ fuente, mensaje: error.mensaje, reintentar: fuentes[fuente].reintentar }]
    },
  )
  // Mientras alguna fuente no trajo su primera página ni falló, todavía no se sabe qué hay.
  const leyendo = (['adjuntos', 'revisiones', 'comentarios'] as const).some(
    (f) => !fuentes[f].leida && fuentes[f].error === null,
  )
  return {
    entradas: linea.entradas,
    etiquetasDeRevisiones: new Map(
      revisiones.paginas.flatMap((pagina) => [...pagina.etiquetas.nodos]),
    ),
    // Los cálculos que quien mira ve, con sus decimales: la revisión dice lo pisado y lo devuelto con sus montos.
    calculosDeRevisiones: {
      calculos: new Map(revisiones.paginas.flatMap((pagina) => [...pagina.etiquetas.calculos])),
      decimales: new Map(revisiones.paginas.flatMap((pagina) => [...pagina.etiquetas.decimales])),
    },
    leyendo,
    todasLeidas: todasLeidas(lecturas),
    fallos,
    // «Ver más» se ofrece si algo marca el borde y se puede pedir; con el tope, el aviso.
    hayMasParaPedir: porPedir.length > 0 && !enElTope,
    enElTope,
    pidiendo,
    verMas: () => {
      if (pidiendo || enElTope) {
        return
      }
      for (const fuente of porPedir) {
        fuentes[fuente].pedirMas()
      }
    },
  }
}
