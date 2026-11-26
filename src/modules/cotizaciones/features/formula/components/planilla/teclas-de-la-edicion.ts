// Las teclas de lo que se escribe, iguales en la celda y en la barra de fórmula (D15 del cambio de la planilla): con sugerencias abiertas, ↑/↓ eligen, Enter o Tab
// aceptan y Esc las cierra; si no, Esc descarta, Enter aplica y baja (Shift+Enter sube; en la barra, Shift+Enter es otra línea) y Tab lleva al siguiente lugar por
// llenar de una operación rápida o, sin ninguno, aplica y va a la derecha.
import type { KeyboardEvent } from 'react'
import type { SugerenciasDeLaCelda } from '../../hooks/use-sugerencias'

export type AccionesDeLaEdicion = {
  sugerencias: SugerenciasDeLaCelda
  // Aplica y, si entró, mueve la celda activa como esa tecla (nula: no se mueve).
  aplicarYSeguir: (tecla: 'Enter' | 'Tab' | null, shift: boolean) => void
  descartar: () => void
  // El cursor al siguiente lugar por llenar; falso si no queda ninguno.
  siguienteLugar: () => boolean
  // En la barra de fórmula, Shift+Enter escribe otra línea.
  enLaBarra: boolean
}

type Tecla = KeyboardEvent<HTMLElement>

function teclaDeLasSugerencias(e: Tecla, s: SugerenciasDeLaCelda): boolean {
  if (s.lista.length === 0) return false
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    s.mover(e.key === 'ArrowDown' ? 1 : -1)
    return true
  }
  if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) return s.aceptar()
  if (e.key === 'Escape') {
    s.cerrar()
    return true
  }
  return false
}

function teclaDeLaEdicion(e: Tecla, a: AccionesDeLaEdicion): boolean {
  if (e.key === 'Escape') {
    a.descartar()
    return true
  }
  if (e.key === 'Enter') {
    if (a.enLaBarra && e.shiftKey) return false
    a.aplicarYSeguir('Enter', e.shiftKey)
    return true
  }
  if (e.key === 'Tab') {
    if (!e.shiftKey && a.siguienteLugar()) return true
    a.aplicarYSeguir('Tab', e.shiftKey)
    return true
  }
  return false
}

// Atiende la tecla si es de la edición (y no deja que siga a la grilla).
export function alTeclearEnLaEdicion(e: Tecla, a: AccionesDeLaEdicion) {
  if (e.nativeEvent.isComposing) return
  if (teclaDeLasSugerencias(e, a.sugerencias) || teclaDeLaEdicion(e, a)) {
    e.preventDefault()
    e.stopPropagation()
  }
}
