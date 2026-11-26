'use client'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useHistorialDelVehiculo } from '../hooks/use-historial-del-vehiculo'
import { ListaDelHistorial } from './lista-del-historial'

type Props = { abierto: boolean; alCerrar: () => void; vehiculoId: string }

// «Historial de cotizaciones» del vehículo elegido (`?ver=historial`, sobre el panel del vehículo de la hoja): las cotizaciones que quien mira ve,
// de la más nueva a la más vieja, leídas al abrirse y con «Ver más» de a 20 hasta el tope. Sólo muestra: cada fila lleva a su cotización.
export function ModalDelHistorial({ abierto, alCerrar, vehiculoId }: Props) {
  const historial = useHistorialDelVehiculo(vehiculoId)
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Historial de cotizaciones"
      completoEnCelular
      pie={
        <Button type="button" variant="outline" onClick={alCerrar}>
          Cerrar
        </Button>
      }
    >
      <ListaDelHistorial
        historial={historial}
        de={{ vehiculo: vehiculoId }}
        etiqueta="Historial de cotizaciones"
      />
    </Modal>
  )
}
