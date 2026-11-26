'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { EnlaceDeAyudaDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'
import {
  CLAVE_DEL_ENLACE,
  enlacePorId,
  MENSAJE_DE_ENLACE_NO_DISPONIBLE,
  PANEL_DE_ENLACES_DE_AYUDA,
  PANEL_QUITAR_ENLACE_DE_AYUDA,
} from '../../../entities/paneles-de-enlaces-de-ayuda'

// La confirmación de «Quitar» un enlace de la empresa, en la URL (`?panel=quitar-enlace-de-ayuda&enlace=<id>`): se puede recargar y «atrás»
// la cierra. Se monta una vez en la lista. Uno que ya no está no abre (se avisa y la URL se limpia); mientras se va, el diálogo conserva el
// último que vio.
export function useQuitarEnlacePorUrl(enlaces: readonly EnlaceDeAyudaDeLaEmpresa[]) {
  const url = usePanelPorUrl(PANEL_QUITAR_ENLACE_DE_AYUDA, [CLAVE_DEL_ENLACE], {
    volverA: PANEL_DE_ENLACES_DE_AYUDA,
  })
  const id = url.valor(CLAVE_DEL_ENLACE)
  const apertura = useApertura(url.abierto)
  const vigente = enlacePorId(enlaces, id)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && vigente === null ? MENSAJE_DE_ENLACE_NO_DISPONIBLE : null,
    url.cerrar,
  )
  const enlace = useUltimo(url.abierto && !rechazada ? vigente : null)
  return {
    abierto: url.abierto && !rechazada && vigente !== null,
    enlace,
    abrir: (enlaceId: string) => {
      url.abrir({ [CLAVE_DEL_ENLACE]: enlaceId })
    },
    cerrar: url.cerrar,
  }
}
