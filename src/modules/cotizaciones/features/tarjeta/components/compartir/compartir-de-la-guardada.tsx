'use client'

import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_LA_PESTANA_DE_COMPARTIR,
  PANEL_DE_COMPARTIR,
} from '../../../../entities/tarjeta/compartir/url'
import { PanelDeCompartirDiferido } from './diferidos'

// «Compartir» de la cabecera de una guardada, junto a «Guardar»: el botón (sin ícono: un solo nodo en la hoja) y el panel en `?panel=compartir` (la pestaña en
// `?compartir=`, que se borra al cerrar). Con el Modo Live no hay botón; la URL abre el panel, que dice por qué no se comparte. El panel se pide al abrirse por primera
// vez y cada apertura empieza de cero.
export function CompartirDeLaGuardada({ cotizacionId }: { cotizacionId: string }) {
  const { live } = useLive()
  const panel = usePanelPorUrl(PANEL_DE_COMPARTIR, [CLAVE_DE_LA_PESTANA_DE_COMPARTIR])
  const apertura = useApertura(panel.abierto)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      {live ? null : (
        <Button
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={() => {
            panel.abrir()
          }}
        >
          Compartir
        </Button>
      )}
      {montar ? (
        <PanelDeCompartirDiferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          cotizacionId={cotizacionId}
        />
      ) : null}
    </>
  )
}
