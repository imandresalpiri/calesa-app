'use client'

import type { ColumnaDeTabla } from '../../../../entities/tabla-de-ayuda'
import type { FilaEditadaDeLaAyuda } from '../../../hoja/components/fila-de-la-ayuda'
import type { EdicionEnLaAyudaEnUso } from '../../hooks/use-edicion-en-la-ayuda'
import { AccionesDeLaFila } from './acciones-de-la-fila'
import { CampoDeLaFila } from './campo-de-la-fila'

// El motivo de un campo de la fila abierta: lo que la base rechazó al guardar en esa celda, lo tipeado que no se lee o lo que la base no aceptaría.
function motivoDelCampo(edicion: EdicionEnLaAyudaEnUso, filaId: string, clave: string) {
  const { rechazo, aplicada, error } = edicion
  if (rechazo?.filaId === filaId && rechazo.clave === clave) return rechazo.mensaje
  const crudo = aplicada?.estado.crudos[filaId]?.[clave]
  if (crudo) return crudo.mensaje
  return error?.filaId === filaId && error.clave === clave ? error.mensaje : null
}

// El foco al abrir: el campo que la base rechazó o, si no, el primero.
function enfocaElCampo(edicion: EdicionEnLaAyudaEnUso, filaId: string, clave: string) {
  const { rechazo } = edicion
  if (rechazo?.filaId === filaId) return rechazo.clave === clave
  return edicion.columnas[0]?.clave === clave
}

// Los campos de la fila abierta, uno por columna, en lugar de sus valores.
function camposDe(edicion: EdicionEnLaAyudaEnUso, filaId: string, lugar: string) {
  return function Campo(columna: ColumnaDeTabla) {
    return (
      <CampoDeLaFila
        columna={columna}
        filaId={filaId}
        lugar={lugar}
        texto={edicion.textos[columna.clave] ?? ''}
        motivo={motivoDelCampo(edicion, filaId, columna.clave)}
        enfocar={enfocaElCampo(edicion, filaId, columna.clave)}
        alEscribir={(texto) => {
          edicion.escribir(columna.clave, texto)
        }}
        alTerminar={edicion.listo}
      />
    )
  }
}

// Lo que la edición pone en la fila `indice` de las dibujadas: sin la tabla viva, ✎ y 🗑 (piden leerla); con ella, la fila abierta con sus campos, «Listo» y «Cancelar»;
// la quitada, tachada con «Volver».
export function filaEditada(
  edicion: EdicionEnLaAyudaEnUso,
  { indice, lugar, guardando }: { indice: number; lugar: string; guardando: boolean },
): FilaEditadaDeLaAyuda {
  const { leida, abriendo } = edicion
  const fila = leida?.edicion.estado.filas[indice]
  const abierta = fila !== undefined && leida?.edicion.editando === fila.id
  const quitada = fila !== undefined && leida?.edicion.quitadas.has(fila.id) === true
  return {
    quitada,
    campo: abierta ? camposDe(edicion, fila.id, lugar) : null,
    acciones: (
      <AccionesDeLaFila
        modo={abierta ? 'abierta' : quitada ? 'quitada' : 'vista'}
        lugar={lugar}
        abriendo={abriendo?.tipo === 'editar' && abriendo.indice === indice}
        apagadas={abriendo !== null || guardando}
        alEditar={() => {
          edicion.pedir({ tipo: 'editar', indice })
        }}
        alQuitar={() => {
          edicion.pedir({ tipo: 'quitar', indice })
        }}
        alListo={edicion.listo}
        alCancelar={edicion.cancelar}
        alVolver={() => {
          if (fila) edicion.volver(fila.id)
        }}
      />
    ),
  }
}

// Lo que dice la barra si no se puede guardar: con el error en la fila abierta, que se corrija la celda marcada; si no, el mensaje (una fila cerrada que la base no
// aceptaría). Nulo si se puede.
export function motivoDeLaBarra(edicion: EdicionEnLaAyudaEnUso): string | null {
  const { error, leida } = edicion
  if (!error) return null
  return error.filaId !== null && error.filaId === leida?.edicion.editando
    ? 'Corrige la celda marcada para guardar.'
    : error.mensaje
}
