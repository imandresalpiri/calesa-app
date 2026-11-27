'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { VehiculoDelEmbarque } from '../../../entities/transporte/embarque'
import type { TipoDeDestino } from '../../../entities/transporte/repositorio-de-embarques'
import { quitarUnidades } from '../actions/quitar-unidades'

const MENSAJE_DE_VALIDACION = 'No pudimos quitar ese vehículo.'

// «Quitar» de la fila de un vehículo: lo saca de su contenedor (queda directo en el embarque) o de su embarque, con la versión de su transporte que se leyó. La action revalida
// la página; un conflicto ofrece «Recargar» y sin red, «Reintentar». Un vehículo a la vez: mientras sale, su botón queda apagado.
export function useQuitarDelTransporte(origenId: string) {
  const [quitando, setQuitando] = useState<string | null>(null)
  const quitar = async (tipo: TipoDeDestino, v: VehiculoDelEmbarque) => {
    setQuitando(v.vehiculoId)
    const envio = await enviarAccion(
      quitarUnidades({
        tipo,
        origenId,
        unidades: [{ vehiculoId: v.vehiculoId, actualizadoEn: v.transporteActualizadoEn }],
      }),
      MENSAJE_DE_VALIDACION,
    )
    setQuitando(null)
    if (envio.ok) {
      avisarExito(
        tipo === 'contenedor'
          ? `Se quitó ${v.titulo} del contenedor.`
          : `Se quitó ${v.titulo} del embarque.`,
      )
      return
    }
    if ('sinRed' in envio) {
      avisarError(
        { codigo: 'inesperado', mensaje: MENSAJE_SIN_CONEXION },
        { alReintentar: () => void quitar(tipo, v) },
      )
      return
    }
    avisarError(envio.error)
  }
  return { quitando, quitar }
}
