'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { MENSAJE_DE_LOGO_NO_DISPONIBLE, type ListaDeLogos } from '../../../entities/logos'
import {
  CLAVE_DEL_LOGO,
  logoPropioPorId,
  PANEL_DE_LOGOS,
  PANEL_QUITAR_LOGO,
} from '../../../entities/paneles-de-logos'

// La confirmación de «Quitar» una variante, en la URL (`?panel=quitar-logo&logo=<id>`): se puede recargar y «atrás» la cierra. Una que ya no está
// no abre (se avisa y la URL se limpia); mientras se va, el diálogo conserva la última que vio.
export function useQuitarLogoPorUrl(lista: ListaDeLogos) {
  const url = usePanelPorUrl(PANEL_QUITAR_LOGO, [CLAVE_DEL_LOGO], { volverA: PANEL_DE_LOGOS })
  const id = url.valor(CLAVE_DEL_LOGO)
  const apertura = useApertura(url.abierto)
  const vigente = logoPropioPorId(lista, id)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && vigente === null ? MENSAJE_DE_LOGO_NO_DISPONIBLE : null,
    url.cerrar,
  )
  const logo = useUltimo(url.abierto && !rechazada ? vigente : null)
  return {
    abierto: url.abierto && !rechazada && vigente !== null,
    apertura,
    logo,
    abrir: (logoId: string) => {
      url.abrir({ [CLAVE_DEL_LOGO]: logoId })
    },
    cerrar: url.cerrar,
  }
}
