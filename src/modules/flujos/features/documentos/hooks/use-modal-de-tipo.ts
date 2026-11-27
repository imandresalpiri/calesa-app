'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MOTIVO_DE_TIPO_NO_DISPONIBLE,
  buscarTipo,
  motivoParaNoEditarTipo,
  type VistasDeGrupos,
} from '../../../entities/documentos/vista-de-grupo'
import { usePanelDeTipo } from './use-panel-de-tipo'

// Qué muestra «Editar» según la URL: abre el de su `?tipo=<id>` si está y quien mira cambia su grupo (uno que no, no abre, ni escribiendo la URL a
// mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que se edita desaparece con el modal abierto (otra persona lo eliminó), el
// modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeTipo(vistas: VistasDeGrupos) {
  const panel = usePanelDeTipo()
  const original = buscarTipo(vistas, panel.editando)?.tipo ?? null
  const apertura = useApertura(panel.hayEdicion)
  const rechazada = useRevisionAlAbrir(
    panel.hayEdicion ? `${String(apertura)}:${panel.editando ?? ''}` : null,
    panel.hayEdicion ? motivoParaNoEditarTipo(vistas, panel.editando) : null,
    panel.cerrar,
  )
  const ultimo = useUltimo(panel.hayEdicion ? original : null)
  const editado = panel.hayEdicion ? (original ?? ultimo) : null
  return {
    abierto: panel.hayEdicion && !rechazada,
    apertura,
    // El que se edita: el último que se vio mientras el modal está abierto.
    original: editado,
    noDisponible: editado !== null && original === null ? MOTIVO_DE_TIPO_NO_DISPONIBLE : null,
    alCerrar: panel.cerrar,
    abrirEdicion: panel.abrirEdicion,
  }
}
