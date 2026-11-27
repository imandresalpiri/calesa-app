'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { TOPE_DE_LA_SELECCION } from '../../../entities/nucleo/seleccion'
import type { UnidadBuscada } from '../../../entities/nucleo/unidad-buscada'
import {
  enOtroDestino,
  unidadesParaAsignar,
  yaEstaEn,
  type DestinoDelLote,
} from '../../../entities/transporte/lote-de-asignacion'
import { asignarUnidades } from '../actions/asignar-unidades'

const MENSAJE_DE_VALIDACION = 'No pudimos agregar esos vehículos.'

// «Agregar vehículos» a un embarque o a un contenedor: los que se eligen en el buscador (hasta 200, sin repetir ni los que ya van ahí) y un solo envío a `transporte_asignar` con
// la versión que se leyó de cada uno. Si alguno ya va en otro destino, primero pregunta («¿Moverlos a éste?») y recién al confirmar manda `mover`. La action revalida la página.
export function useAgregarVehiculos({
  destino,
  origenId,
  nombre,
  alTerminar,
}: {
  destino: DestinoDelLote
  origenId: string
  // «el contenedor MSCU1234», para el aviso de éxito.
  nombre: string
  alTerminar: () => void
}) {
  const [elegidas, setElegidas] = useState<UnidadBuscada[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [enCurso, setEnCurso] = useState(false)
  const otros = enOtroDestino(elegidas, destino)

  async function enviar(mover: boolean) {
    setEnCurso(true)
    const envio = await enviarAccion(
      asignarUnidades({
        tipo: destino.tipo,
        destinoId: destino.id,
        origenId,
        unidades: unidadesParaAsignar(elegidas),
        mover,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      const n = elegidas.length
      avisarExito(
        n === 1 ? `Se agregó 1 vehículo a ${nombre}.` : `Se agregaron ${n} vehículos a ${nombre}.`,
      )
      setElegidas([])
      setConfirmando(false)
      alTerminar()
      return
    }
    if ('sinRed' in envio) {
      avisarError(
        { codigo: 'inesperado', mensaje: MENSAJE_SIN_CONEXION },
        { alReintentar: () => void enviar(mover) },
      )
      return
    }
    // Respaldo de la base (`23514 hint mover`): alguno se mudó a otro destino desde que se buscó.
    if (envio.error.causa === 'mover') {
      setConfirmando(true)
    }
    avisarError(envio.error)
  }

  return {
    elegidas,
    otros,
    confirmando,
    enCurso,
    lleno: elegidas.length >= TOPE_DE_LA_SELECCION,
    sumar: (u: UnidadBuscada) => {
      if (yaEstaEn(u, destino)) return
      setConfirmando(false)
      setElegidas((antes) =>
        antes.length >= TOPE_DE_LA_SELECCION || antes.some((e) => e.id === u.id)
          ? antes
          : [...antes, u],
      )
    },
    sacar: (id: string) => {
      setConfirmando(false)
      setElegidas((antes) => antes.filter((e) => e.id !== id))
    },
    agregar: () => {
      if (elegidas.length === 0) return
      if (otros.length > 0 && !confirmando) {
        setConfirmando(true)
        return
      }
      void enviar(otros.length > 0)
    },
    cancelarMover: () => setConfirmando(false),
  }
}
