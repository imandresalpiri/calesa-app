'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { ElementoDeMisEnlaces } from '../../../entities/mis-enlaces-de-ayuda'
import {
  MENSAJE_DE_PROPIO_NO_DISPONIBLE,
  motivoParaNoAbrirPropio,
  PANEL_EDITAR_ENLACE_PROPIO,
  PANEL_NUEVO_ENLACE_PROPIO,
  propioPorId,
} from '../../../entities/paneles-de-enlaces-de-ayuda'
import { usePanelDeEnlace } from '../../enlaces-de-ayuda/hooks/use-panel-de-enlace'

export function usePanelDeEnlacePropio() {
  return usePanelDeEnlace(PANEL_NUEVO_ENLACE_PROPIO, PANEL_EDITAR_ENLACE_PROPIO)
}

// Qué muestra el modal de un enlace propio según la URL (`?panel=nuevo-enlace-propio`, `?panel=editar-enlace-propio&enlace=<id>`): «Agregar»
// no abre al tope de propios y «Editar» de uno que no está tampoco; se revisa al llegar, se avisa y la URL se limpia.
export function useModalDePropio(elementos: readonly ElementoDeMisEnlaces[], tope: number) {
  const panel = usePanelDeEnlacePropio()
  const modo = panel.nuevo ? 'nuevo' : panel.hayEdicion ? 'editar' : null
  const original = propioPorId(elementos, panel.editando)
  const apertura = useApertura(modo !== null)
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.editando ?? ''}`,
    motivoParaNoAbrirPropio(elementos, tope, modo, panel.editando),
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'editar' ? original : null)
  return {
    abierto: modo !== null && !rechazada,
    apertura,
    original: modo === 'editar' ? (original ?? ultimo) : null,
    noDisponible:
      modo === 'editar' && original === null && ultimo !== null
        ? MENSAJE_DE_PROPIO_NO_DISPONIBLE
        : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
