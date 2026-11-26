'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { useAtajo } from '@/shared/ui/atajos'
import type { AccionDeLaBarra } from '../../../../entities/contenido/guias'
import type { PublicacionDeGuia } from '../../../../entities/contenido/repositorios'
import { useGuardadoPendiente } from './use-guardado-pendiente'

type Guardar = (publicacion: PublicacionDeGuia, mensaje: string) => Promise<void>

type Opciones = {
  guardar: Guardar
  enLinea: boolean
  zona: string
  // «Programar…» pide ver la fecha en el panel.
  alPedirProgramar: () => void
}

// Lo que hacen los botones de la barra de la guía. Guardar sin red queda anotado y se hace al volver (nunca publica solo); Ctrl+S guarda igual.
export function useAccionesDeLaGuia({ guardar, enLinea, zona, alPedirProgramar }: Opciones) {
  const guardarAhora = () => {
    void guardar({ tipo: 'mantener' }, 'Guía guardada')
  }
  const pedirGuardar = useGuardadoPendiente(enLinea, guardarAhora)
  useAtajo('guardar', pedirGuardar)
  useAtajo('guardarYSeguir', pedirGuardar)

  const alEjecutar = (accion: AccionDeLaBarra['accion']) => {
    switch (accion) {
      case 'mantener':
        pedirGuardar()
        return
      case 'publicar':
      case 'publicar-ahora':
        void guardar({ tipo: 'publicar' }, 'Guía publicada')
        return
      case 'despublicar':
        void guardar({ tipo: 'despublicar' }, 'Guía despublicada')
        return
      case 'programar':
        alPedirProgramar()
    }
  }
  const alProgramar = (cuando: string) => {
    void guardar(
      { tipo: 'programar', cuando },
      `Guía programada para el ${formatearFecha(cuando, { zona })}`,
    )
  }
  return { alEjecutar, alProgramar }
}
