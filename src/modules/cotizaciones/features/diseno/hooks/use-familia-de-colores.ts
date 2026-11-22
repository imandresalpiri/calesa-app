'use client'

import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DE_COLORES, PANELES_DE_COLORES } from '../../../entities/diseno/panel-de-tonos'

// Los paneles de los colores en la URL: `abierto` es el de la lista (`?panel=colores`) y `enLaFamilia` cualquiera de los suyos (también uno de un color:
// `?panel=editar-tono`). Dentro de la familia hay un solo modal abierto a la vez: el de un color reemplaza al de la lista (`abierto` pasa a falso) y, al
// cerrarse, vuelve a ella. `montar` dice que ya se abrió alguno: la lista diferida se pide la primera vez y no se desmonta.
export function useFamiliaDeColores() {
  const lista = usePanelPorUrl(PANEL_DE_COLORES)
  const panel = lista.valor(CLAVE_DE_PANEL)
  const enLaFamilia = panel !== null && (PANELES_DE_COLORES as readonly string[]).includes(panel)
  const montar = useAbiertoAlgunaVez(enLaFamilia)
  return {
    abierto: lista.abierto,
    enLaFamilia,
    montar,
    abrir: () => {
      lista.abrir()
    },
    cerrar: lista.cerrar,
  }
}
