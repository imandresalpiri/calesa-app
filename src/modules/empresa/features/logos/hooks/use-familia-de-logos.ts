'use client'

import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_DE_LOGOS, PANELES_DE_LOGOS } from '../../../entities/paneles-de-logos'

// Los paneles de la tarjeta «Logos» en la URL: `abierto` es el de la lista (`?panel=logos`), `enLaFamilia` cualquiera de los suyos. Uno solo
// abierto a la vez: el de una variante reemplaza al de la lista y, al cerrarse, vuelve a ella. `montar` dice que ya se abrió alguno: el editor
// diferido se pide la primera vez y no se desmonta. Con `motivo` (sin permiso), un panel de la familia pedido por la URL no abre: se avisa y se limpia.
export function useFamiliaDeLogos(motivo: string | null = null) {
  const lista = usePanelPorUrl(PANEL_DE_LOGOS)
  const panel = lista.valor(CLAVE_DE_PANEL)
  const pedida = panel !== null && PANELES_DE_LOGOS.includes(panel)
  const apertura = useApertura(pedida)
  const rechazada = useRevisionAlAbrir(
    pedida ? `${String(apertura)}:${panel}` : null,
    motivo,
    lista.cerrar,
  )
  const enLaFamilia = pedida && !rechazada
  const montar = useAbiertoAlgunaVez(enLaFamilia)
  return {
    abierto: lista.abierto && !rechazada,
    enLaFamilia,
    montar,
    abrir: () => {
      lista.abrir()
    },
    cerrar: lista.cerrar,
  }
}
