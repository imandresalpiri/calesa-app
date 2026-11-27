'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { ESPERA_DE_GUARDAR_MS, type VentanaDeCamara } from '../../../entities/ventana-de-camara'
import { guardarLaVentanaDeCamara } from '../actions/guardar-la-ventana'

// La ventana de cámara de esta persona: cada cambio se aplica al instante y se guarda 500 ms después del último (al soltar, no por cuadro), entera. Sin red
// queda donde se dejó y se guarda al volver (`useReintentoAlVolver`); si falla con red, igual vale en esta pestaña, como el resto de las preferencias. Al
// desmontarse (se apagó el Live) lo que esperaba se manda ya.
export function useVentanaGuardada(inicial: VentanaDeCamara): {
  ventana: VentanaDeCamara
  cambiar: (cambios: Partial<VentanaDeCamara>) => void
} {
  const [ventana, setVentana] = useState(inicial)
  const [pendiente, setPendiente] = useState<VentanaDeCamara | null>(null)
  const { executeAsync } = useAction(guardarLaVentanaDeCamara)

  const enviar = useCallback(
    async (valor: VentanaDeCamara): Promise<boolean> => {
      const envio = await enviarAccion(executeAsync(valor), 'No se pudo guardar tu ventana.')
      if (envio.ok) {
        // Si mientras se guardaba cambió otra vez, lo pendiente es lo nuevo y se queda.
        setPendiente((previo) => (previo === valor ? null : previo))
      }
      return envio.ok
    },
    [executeAsync],
  )
  useReintentoAlVolver(pendiente, enviar)

  useEffect(() => {
    if (pendiente === null) {
      return
    }
    const espera = setTimeout(() => {
      void enviar(pendiente)
    }, ESPERA_DE_GUARDAR_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [pendiente, enviar])

  // Lo que esperaba guardarse al apagar el Live.
  const ultimoPendiente = useRef<VentanaDeCamara | null>(null)
  const ultimoEnviar = useRef(enviar)
  useEffect(() => {
    ultimoPendiente.current = pendiente
    ultimoEnviar.current = enviar
  })
  useEffect(
    () => () => {
      if (ultimoPendiente.current) {
        void ultimoEnviar.current(ultimoPendiente.current)
      }
    },
    [],
  )

  const actual = useRef(inicial)
  const cambiar = useCallback((cambios: Partial<VentanaDeCamara>) => {
    actual.current = { ...actual.current, ...cambios }
    setVentana(actual.current)
    setPendiente(actual.current)
  }, [])

  return { ventana, cambiar }
}
