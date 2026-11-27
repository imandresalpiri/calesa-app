'use client'

import { filaDe, type FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import { nombreDeLaCelda } from '../../../../../entities/formula/texto-de-la-celda'
import type { EdicionDeLaCelda } from '../../../hooks/use-edicion-con-referencias'
import type { Planilla } from '../../../hooks/use-planilla'
import { idsDeLaEdicion } from '../ids-de-la-edicion'
import { NOMBRE_DE_LA_COLUMNA } from './clases'
import { EntradaDeLaCelda } from './entrada-de-la-celda'

const nombreDe = (e: EdicionDeLaCelda, fila: FilaDeLaHoja | undefined) =>
  fila === undefined
    ? NOMBRE_DE_LA_COLUMNA[e.col]
    : e.col === 'D'
      ? `${nombreDeLaCelda(e.col, fila.numero)}, ${fila.nodo.etiqueta}`
      : `${nombreDeLaCelda(e.col, fila.numero)}, ${fila.nodo.etiqueta}, ${NOMBRE_DE_LA_COLUMNA[e.col]}`

// La entrada de la celda en edición, unida a la planilla: el mismo texto, sugerencias y error que la barra de fórmula.
export function EntradaDeLaPlanilla({
  planilla,
  edicion: e,
}: {
  planilla: Planilla
  edicion: EdicionDeLaCelda
}) {
  const fila = filaDe(planilla.hoja, planilla.hoja.numeroDe.get(e.id) ?? 0)
  const { sugerencias } = planilla
  const ids = idsDeLaEdicion(planilla.prefijo)
  const conLista = sugerencias.lista.length > 0
  return (
    <EntradaDeLaCelda
      edicion={e}
      nombre={nombreDe(e, fila)}
      idDeLaLista={conLista ? ids.lista : null}
      idDeLaElegida={conLista ? ids.opcion(sugerencias.indice) : null}
      idDelError={e.error === null ? null : ids.error}
      alEscribir={planilla.edicion.escribir}
      alUbicar={(cursor) => {
        planilla.edicion.ubicar(cursor, 'celda')
      }}
      teclas={{
        sugerencias,
        aplicarYSeguir: planilla.aplicarYSeguir,
        descartar: planilla.descartar,
        siguienteLugar: planilla.edicion.siguienteLugar,
        enLaBarra: false,
      }}
    />
  )
}
