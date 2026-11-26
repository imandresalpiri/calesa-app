'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { aceptarCotizacion } from '../actions/aceptar-cotizacion'
import { anularCotizacion } from '../actions/anular-cotizacion'

export type CotizacionParaConfirmar = {
  id: string
  numero: number
  // El total **guardado**: es el que pasa a los ítems al aceptar.
  total: string | null
  moneda: string
  actualizadoEn: string
}

const MENSAJE_DE_VALIDACION = 'No se pudo leer la cotización. Recarga la página.'

// «Aceptar» y «Anular» una cotización por su Server Action (8.12-4, C13), para la hoja y para el «⋯» de la lista: devuelven el motivo si la base no lo
// dejó (la confirmación sigue abierta y lo dice) o `null` tras avisar. La action revalida la ruta: la página se relee sola.
export function usePedidosDeCotizacion(proyectoId: string) {
  return {
    async aceptar(c: CotizacionParaConfirmar): Promise<ErrorApp | null> {
      const pedido = { id: c.id, proyectoId, actualizadoEn: c.actualizadoEn }
      const envio = await enviarAccion(aceptarCotizacion(pedido), MENSAJE_DE_VALIDACION)
      if (!envio.ok) return envio.error
      avisarExito(`Cotización #${String(c.numero)} aceptada.`)
      return null
    },
    async anular(c: CotizacionParaConfirmar): Promise<ErrorApp | null> {
      const pedido = { id: c.id, proyectoId, actualizadoEn: c.actualizadoEn }
      const envio = await enviarAccion(anularCotizacion(pedido), MENSAJE_DE_VALIDACION)
      if (!envio.ok) return envio.error
      avisarExito(`Cotización #${String(c.numero)} anulada.`)
      return null
    },
  }
}
