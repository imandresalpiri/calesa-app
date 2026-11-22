'use client'

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import {
  destinoDeLaTecla,
  esTeclaQueSeEscribe,
  type TeclaDeLaCuadricula,
} from '../../../entities/formula/teclas-de-la-cuadricula'
import {
  COLUMNAS_DE_LA_PLANILLA,
  type ColumnaDeLaPlanilla,
} from '../../../entities/formula/texto-de-la-celda'
import { useFilaPedida } from './use-fila-pedida'

export type CeldaActiva = { readonly id: string; readonly col: ColumnaDeLaPlanilla }

// Lo que hacen las teclas que no mueven. `alternar` dice si hizo algo (si no, la barra espaciadora abre la edición como otra tecla).
export type AccionesDelTeclado = {
  editar: (celda: CeldaActiva, tipeado?: string) => void
  mover: (id: string, hacia: 'arriba' | 'abajo') => void
  vaciar: (celda: CeldaActiva) => void
  alternar: (celda: CeldaActiva) => boolean
  abrirMenu: () => void
}

type Tecla = KeyboardEvent<HTMLElement>

function atajoDeLaFila(e: Tecla, celda: CeldaActiva, a: AccionesDelTeclado): boolean {
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    a.mover(celda.id, e.key === 'ArrowUp' ? 'arriba' : 'abajo')
    return true
  }
  if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
    a.abrirMenu()
    return true
  }
  return false
}

function atajoDeLaCelda(e: Tecla, celda: CeldaActiva, a: AccionesDelTeclado): boolean {
  if (e.key === 'F2') a.editar(celda)
  else if (e.key === 'Delete') a.vaciar(celda)
  else if (e.key === 'Backspace') a.editar(celda, '')
  else if (e.key === ' ' && a.alternar(celda)) return true
  else if (esTeclaQueSeEscribe(e)) a.editar(celda, e.key)
  else return false
  return true
}

type Args = {
  // Los ids de las filas que se dibujan, en orden.
  ids: readonly string[]
  // Hay una celda en edición: las teclas son de su entrada.
  editando: boolean
  // El prefijo de los ids de las celdas (`aria-activedescendant`).
  prefijo: string
}

export const idDeLaCelda = (prefijo: string, celda: CeldaActiva) =>
  `${prefijo}-${celda.id}-${celda.col}`

// La celda activa de la planilla (`role="grid"` con `aria-activedescendant`: un solo lugar en el orden de Tab). Las teclas sólo cuentan si el foco está en la
// grilla misma (no en un botón o una entrada de adentro). Si su fila deja de dibujarse, la activa vuelve a la primera. `?fila=` elige la C de esa fila al abrir.
export function useCuadricula({ ids, editando, prefijo }: Args) {
  const [elegida, setElegida] = useState<CeldaActiva | null>(null)
  const primera = ids[0]
  const activa: CeldaActiva | null =
    elegida !== null && ids.includes(elegida.id)
      ? elegida
      : primera === undefined
        ? null
        : { id: primera, col: 'C' }
  const pedir = useCallback((id: string) => {
    setElegida({ id, col: 'C' })
  }, [])
  useFilaPedida(pedir)
  const idActiva = activa === null ? null : idDeLaCelda(prefijo, activa)
  useEffect(() => {
    if (idActiva !== null)
      document.getElementById(idActiva)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [idActiva])
  // Mueve la activa como lo haría la tecla; falso si la tecla no mueve.
  const ir = (tecla: TeclaDeLaCuadricula): boolean => {
    if (activa === null) return false
    const destino = destinoDeLaTecla(
      tecla,
      { fila: ids.indexOf(activa.id), col: COLUMNAS_DE_LA_PLANILLA.indexOf(activa.col) },
      ids.length,
    )
    if (destino === null || destino === 'salir') return false
    const id = ids[destino.fila]
    const col = COLUMNAS_DE_LA_PLANILLA[destino.col]
    if (id !== undefined && col !== undefined) setElegida({ id, col })
    return true
  }
  // Las acciones llegan con cada tecla (las arman los hooks que dependen de la celda activa).
  const teclear = (e: Tecla, acciones: AccionesDelTeclado) => {
    if (e.target !== e.currentTarget || editando || activa === null) return
    const hecho =
      atajoDeLaFila(e, activa, acciones) ||
      atajoDeLaCelda(e, activa, acciones) ||
      ir({ key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey })
    if (hecho) e.preventDefault()
  }
  // Llegar a la grilla con el teclado elige la activa: desde ahí la barra la muestra.
  const alEnfocar = () => {
    if (elegida === null && activa !== null) setElegida(activa)
  }
  // Enter, Tab y sus Shift al aplicar desde la entrada de la celda.
  const moverCon = (key: string, shift: boolean) => {
    ir({ key, shift, ctrl: false })
  }
  // La activa sólo si alguien ya eligió una celda (clic, teclas, foco o `?fila=`): al entrar es nula y la barra muestra su guía.
  const activaElegida = elegida === null ? null : activa
  return { activa, activaElegida, idActiva, elegir: setElegida, teclear, alEnfocar, moverCon }
}
