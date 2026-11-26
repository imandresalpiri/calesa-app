'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ConfirmacionPorUrl } from '../hooks/use-confirmacion-de-cotizacion-por-url'
import {
  usePedidosDeCotizacion,
  type CotizacionParaConfirmar,
} from '../hooks/use-pedidos-de-cotizacion'
import { ConfirmarAceptarDiferido, ConfirmarAnularDiferido } from './diferidos'

type Props = {
  proyectoId: string
  // La cotización que nombra la confirmación abierta (la de la hoja o la elegida en la lista); nula si ya no está.
  cotizacion: CotizacionParaConfirmar | null
  aceptar: ConfirmacionPorUrl
  anular: ConfirmacionPorUrl
  // En la hoja editable con cambios: anular los descarta y lo dice.
  sinGuardar?: boolean
}

// Las dos confirmaciones de una cotización, una vez por pantalla (la hoja o la lista) y con su código diferido: «Aceptar» muestra el total **guardado**.
export function ConfirmacionesDeCotizacion({
  proyectoId,
  cotizacion,
  aceptar,
  anular,
  sinGuardar = false,
}: Props) {
  const pedidos = usePedidosDeCotizacion(proyectoId)
  const montadaAceptar = useAbiertoAlgunaVez(aceptar.abierto)
  const montadaAnular = useAbiertoAlgunaVez(anular.abierto)
  if (cotizacion === null) return null
  return (
    <>
      {montadaAceptar ? (
        <ConfirmarAceptarDiferido
          abierto={aceptar.abierto}
          alCerrar={aceptar.cerrar}
          numero={cotizacion.numero}
          total={cotizacion.total}
          moneda={cotizacion.moneda}
          alAceptar={() => pedidos.aceptar(cotizacion)}
        />
      ) : null}
      {montadaAnular ? (
        <ConfirmarAnularDiferido
          abierto={anular.abierto}
          alCerrar={anular.cerrar}
          numero={cotizacion.numero}
          sinGuardar={sinGuardar}
          alAnular={() => pedidos.anular(cotizacion)}
        />
      ) : null}
    </>
  )
}
