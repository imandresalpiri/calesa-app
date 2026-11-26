'use client'

import { useState } from 'react'
import { diferido } from '@/shared/ui/diferido'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  PANEL_DE_FECHAS_DE_SUBASTA,
  type FechasDeSubasta,
} from '../../../entities/fechas-de-subasta'

// El formulario se pide recién al abrirse: la ficha no carga su código para mostrarse.
const ModalDeFechasDeSubastaDiferido = diferido(() =>
  import('./modal-de-fechas-de-subasta').then((modulo) => modulo.ModalDeFechasDeSubasta),
)

type Props = {
  vehiculoId: string
  actualizadoEn: string
  fechas: FechasDeSubasta
  ahora: string
}

// El modal de «Editar fechas de subasta» (`?panel=fechas-de-subasta`), que abre el «⋯» del vehículo en su ficha y también la URL sola (recargar, un enlace).
// Cada apertura empieza de cero (la `key` cambia al pasar de cerrado a abierto).
export function PanelDeFechasDeSubasta({ vehiculoId, actualizadoEn, fechas, ahora }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_FECHAS_DE_SUBASTA)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const [estado, setEstado] = useState({ abierto: panel.abierto, apertura: 0 })
  if (estado.abierto !== panel.abierto) {
    setEstado({
      abierto: panel.abierto,
      apertura: panel.abierto ? estado.apertura + 1 : estado.apertura,
    })
  }
  if (!montado) {
    return null
  }
  return (
    <ModalDeFechasDeSubastaDiferido
      key={estado.apertura}
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      vehiculoId={vehiculoId}
      actualizadoEn={actualizadoEn}
      fechas={fechas}
      ahora={ahora}
    />
  )
}
