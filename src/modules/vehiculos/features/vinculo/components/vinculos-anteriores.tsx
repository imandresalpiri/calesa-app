'use client'

import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { VinculoCerrado } from '../../../entities/vehiculos-del-lead'
import { DrawerDeVinculosAnterioresDiferido } from './diferidos'

export const PANEL_DE_VINCULOS_ANTERIORES = 'vinculos-anteriores'

// Los vínculos de este lead que ya se cerraron, al pie del bloque «Vehículos» de la ficha del lead: el botón «Ver los vínculos anteriores» (sólo
// si hay alguno) abre un drawer con su URL (`?panel=vinculos-anteriores`) y el bloque no cambia de alto. El drawer se atiende siempre: la URL
// compartida lo abre aunque el botón no esté (sin vínculos anteriores, lo dice).
export function VinculosAnteriores({
  historial,
  hayMas = false,
}: {
  historial: readonly VinculoCerrado[]
  hayMas?: boolean
}) {
  const panel = usePanelPorUrl(PANEL_DE_VINCULOS_ANTERIORES)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      {historial.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 w-fit px-2 md:min-h-8"
          aria-haspopup="dialog"
          onClick={() => {
            panel.abrir()
          }}
        >
          Ver los vínculos anteriores
        </Button>
      ) : null}
      {montar ? (
        <DrawerDeVinculosAnterioresDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          historial={historial}
          hayMas={hayMas}
        />
      ) : null}
    </>
  )
}
