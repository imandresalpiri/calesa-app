'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { VehiculosDelLead } from '../../../entities/vehiculos-del-lead'
import { useDesvincularPorUrl } from '../hooks/use-desvincular-por-url'
import { usePanelAgregarVehiculo } from '../hooks/use-panel-agregar-vehiculo'
import { useVinculo } from '../hooks/use-vinculo'
import { ConfirmarDesvincularDiferido, PanelAgregarVehiculoDiferido } from './diferidos'
import { VinculosAnteriores } from './vinculos-anteriores'

type Props = { leadId: string; leadNombre: string; datos: VehiculosDelLead }

// Lo que va al pie del bloque «Vehículos» de la ficha del lead y no repite sus grupos: «Ver los vínculos anteriores» (un drawer con su URL; sólo los de
// vehículos que quien mira ve), el panel «Vincular o marcar un vehículo» (lo abre el botón del título, `VincularOMarcar`; con la cartera: `puedoActuar`;
// sin ella la URL no abre nada; acá se atiende la URL y la vuelta del foco) y la confirmación de desvincular, que pide quien no podría volver a
// vincular (quien sí, desvincula en la fila con «Deshacer»).
export function GestionDelLead({ leadId, leadNombre, datos }: Props) {
  const acciones = useVinculo(leadId)
  const panel = usePanelAgregarVehiculo()
  const agregando = datos.puedoActuar && panel.abierto
  const montarPanel = useAbiertoAlgunaVez(agregando)
  const confirmacion = useDesvincularPorUrl(datos.vinculados, !datos.puedoActuar)
  const montarConfirmar = useAbiertoAlgunaVez(confirmacion.abierto)
  return (
    <>
      <VinculosAnteriores historial={datos.historial} hayMas={datos.hayMas.historial} />
      {montarPanel ? (
        <PanelAgregarVehiculoDiferido
          abierto={agregando}
          alCerrar={panel.cerrar}
          leadId={leadId}
          leadNombre={leadNombre}
          acciones={acciones}
        />
      ) : null}
      {montarConfirmar ? (
        <ConfirmarDesvincularDiferido
          abierto={confirmacion.abierto}
          vehiculo={confirmacion.vehiculo}
          enCurso={acciones.enCurso}
          alCerrar={confirmacion.cerrar}
          alConfirmar={async () => {
            if (confirmacion.vehiculo) {
              await acciones.desvincular(confirmacion.vehiculo, { deshacer: false })
            }
            confirmacion.cerrar()
          }}
        />
      ) : null}
    </>
  )
}
