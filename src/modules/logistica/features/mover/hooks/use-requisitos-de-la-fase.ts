'use client'

import { useEffect, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { noSeLeyeronLosRequisitos } from '../../../entities/mover/fase-vista'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useAlCambiarLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { leerRequisitosDeLaFase } from '../actions/leer-requisitos-de-la-fase'
import type { RequisitosLeidos } from '../components/cadena/proveedor-de-la-cadena'
import { unidadAMover } from './unidad-a-mover'

export type LecturaDeLaFase =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; dato: NonNullable<RequisitosLeidos['porFase'][string]> }

const CARGANDO: LecturaDeLaFase = { tipo: 'cargando' }

// Los requisitos de una fase de la cadena que no es destino (`leerRequisitosDeLaFase`), leídos al tocarla y guardados por fase en el proveedor de la cadena: volver a tocarla
// no la relee. Un cambio de la unidad (`logistica:unidad-cambio`) vacía lo guardado y relee la que se mira. Una respuesta que llega tarde (otra fase ya elegida) se descarta.
export function useRequisitosDeLaFase(
  unidad: UnidadAbierta,
  fase: { faseId: string; nombre: string },
  leidos: RequisitosLeidos,
) {
  const [fallo, setFallo] = useState<{ faseId: string; error: ErrorApp } | null>(null)
  const [intento, setIntento] = useState(0)
  const { faseId, nombre } = fase
  const { id, tipo, origenId } = unidad
  useAlCambiarLaUnidad(id, () => {
    setIntento((n) => n + 1)
  })
  const guardada = leidos.porFase[faseId]
  const { guardar } = leidos
  const yaLeida = guardada !== undefined
  useEffect(() => {
    if (yaLeida) return
    let vigente = true
    void enviarAccion(
      leerRequisitosDeLaFase({
        pedido: { ...unidadAMover({ id, tipo, origenId }), fase: faseId },
        nombre,
      }),
      noSeLeyeronLosRequisitos(nombre),
    ).then((envio) => {
      if (!vigente) return
      if (envio.ok) guardar(faseId, envio.data)
      else setFallo({ faseId, error: envio.error })
    })
    return () => {
      vigente = false
    }
  }, [faseId, nombre, id, tipo, origenId, yaLeida, guardar, intento])
  const lectura: LecturaDeLaFase = guardada
    ? { tipo: 'listo', dato: guardada }
    : fallo?.faseId === faseId
      ? { tipo: 'error', error: fallo.error }
      : CARGANDO
  return {
    lectura,
    reintentar: () => {
      setFallo(null)
      setIntento((n) => n + 1)
    },
  }
}
