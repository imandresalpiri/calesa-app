'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { MENSAJE_DE_LOGO_NO_DISPONIBLE, type ListaDeLogos } from '../../../entities/logos'
import { logoPropioPorId, motivoParaNoAbrirLogo } from '../../../entities/paneles-de-logos'
import { usePanelDeLogo } from './use-panel-de-logo'

// Qué muestra el modal de una variante según la URL. «Subir un logo» no abre al tope y «Renombrar» abre el de `?logo=<id>` (uno que no está no
// abre, ni escribiendo la URL a mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que se renombra desaparece con el modal
// abierto (otra persona lo quitó), el modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeLogo(lista: ListaDeLogos) {
  const panel = usePanelDeLogo()
  const modo = panel.nuevo ? 'nuevo' : panel.hayRenombre ? 'renombrar' : null
  const original = logoPropioPorId(lista, panel.renombrando)
  const apertura = useApertura(modo !== null)
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.renombrando ?? ''}`,
    motivoParaNoAbrirLogo(lista, modo, panel.renombrando),
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'renombrar' ? original : null)
  return {
    abierto: modo !== null && !rechazada,
    apertura,
    original: modo === 'renombrar' ? (original ?? ultimo) : null,
    noDisponible:
      modo === 'renombrar' && original === null && ultimo !== null
        ? MENSAJE_DE_LOGO_NO_DISPONIBLE
        : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirRenombre: panel.abrirRenombre,
  }
}
