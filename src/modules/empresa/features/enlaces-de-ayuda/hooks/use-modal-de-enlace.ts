'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { ListaDeEnlacesDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'
import {
  enlacePorId,
  MENSAJE_DE_ENLACE_NO_DISPONIBLE,
  motivoParaNoAbrirEnlace,
  PANEL_EDITAR_ENLACE_DE_AYUDA,
  PANEL_NUEVO_ENLACE_DE_AYUDA,
} from '../../../entities/paneles-de-enlaces-de-ayuda'
import { usePanelDeEnlace } from './use-panel-de-enlace'

export function usePanelDeEnlaceDeLaEmpresa() {
  return usePanelDeEnlace(PANEL_NUEVO_ENLACE_DE_AYUDA, PANEL_EDITAR_ENLACE_DE_AYUDA)
}

// Qué muestra el modal de un enlace de la empresa según la URL. «Nuevo enlace» no abre al tope y «Editar» abre el de `?enlace=<id>` (uno que
// no está no abre, ni escribiendo la URL a mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que se edita desaparece
// con el modal abierto (otra persona lo quitó), el modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeEnlace(lista: ListaDeEnlacesDeLaEmpresa) {
  const panel = usePanelDeEnlaceDeLaEmpresa()
  const modo = panel.nuevo ? 'nuevo' : panel.hayEdicion ? 'editar' : null
  const original = enlacePorId(lista.enlaces, panel.editando)
  const apertura = useApertura(modo !== null)
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.editando ?? ''}`,
    motivoParaNoAbrirEnlace(lista, modo, panel.editando),
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'editar' ? original : null)
  return {
    abierto: modo !== null && !rechazada,
    apertura,
    original: modo === 'editar' ? (original ?? ultimo) : null,
    noDisponible:
      modo === 'editar' && original === null && ultimo !== null
        ? MENSAJE_DE_ENLACE_NO_DISPONIBLE
        : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
