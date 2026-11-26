'use client'

import { conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { ModalDelHistorialDiferido } from './diferidos'

export const VER_EL_HISTORIAL = 'historial'

type Props = {
  vehiculoId: string
  // «Cotizado (n)», leído por el servidor al abrir la hoja: sólo le pone la etiqueta al botón. Puede estar viejo (guardar no vuelve a pedir la página), así que no
  // decide si hay historial: el botón está siempre y lo que muestra lo dice la lectura al abrirse.
  conteo: ConteoAcotado | null
}

// El historial de cotizaciones del vehículo elegido, dentro de su panel: un botón que abre el modal con su URL (`?ver=historial`, otra clave que la
// `?panel=vehiculo` del panel), que se lee al abrirse. El panel no cambia de alto.
export function HistorialDelVehiculo({ vehiculoId, conteo }: Props) {
  const modal = usePanelPorUrl(VER_EL_HISTORIAL, [], { clave: 'ver' })
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const etiqueta =
    conteo !== null && conteo.n > 0
      ? `Historial de cotizaciones (${conteoCorto(conteo)})`
      : 'Historial de cotizaciones'
  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        onClick={() => {
          modal.abrir()
        }}
        className="h-11 min-w-0 justify-start md:h-9"
      >
        <span className="truncate">{etiqueta}</span>
      </Button>
      {montar ? (
        <ModalDelHistorialDiferido
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          vehiculoId={vehiculoId}
        />
      ) : null}
    </>
  )
}
