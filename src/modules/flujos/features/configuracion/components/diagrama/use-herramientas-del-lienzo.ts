'use client'

import { useReactFlow } from '@xyflow/react'
import { useMemo, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
import type { Punto } from '../../../../entities/disposicion-del-diagrama'
import { MOTIVO_EN_EL_CELULAR } from '../../../../entities/edicion-del-lienzo'
import {
  MOTIVO_YA_EN_EL_ACOMODO,
  posicionDeLaNuevaFase,
} from '../../../../entities/posiciones-del-diagrama'
import type { Lienzo } from './contexto-del-lienzo'
import type { useDiagrama } from './use-diagrama'
import { useMoverConTeclado } from './use-mover-con-teclado'

export const SIN_CONEXION_AL_MOVER = 'Sin conexión: la posición se guarda cuando vuelva.'

type Pedido = {
  diagrama: ReturnType<typeof useDiagrama>
  contenedor: RefObject<HTMLElement | null>
  rem: number
  alAbrir: (faseId: string) => void
  vieneDeArrastrar: () => boolean
}

const enUnCampo = (blanco: EventTarget) =>
  blanco instanceof HTMLElement &&
  (blanco.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(blanco.tagName))

// Lo que se hace sobre el lienzo fuera de una caja o una flecha: «Nueva fase» (en el centro de la vista, o donde se hizo doble clic sobre el fondo),
// «Ordenar solo» (apagado si ya está en el acomodo), Ctrl/Cmd+Z (no dentro de un campo) y la línea de estado. Y lo que cajas y flechas leen del lienzo.
export function useHerramientasDelLienzo({
  diagrama: d,
  contenedor,
  rem,
  alAbrir,
  vieneDeArrastrar,
}: Pedido) {
  const { screenToFlowPosition } = useReactFlow()

  function nuevaFaseEn(pantalla: Punto) {
    const px = screenToFlowPosition(pantalla)
    d.fases?.nuevaFaseEn(posicionDeLaNuevaFase({ x: px.x / rem, y: px.y / rem }))
  }

  const alTeclado = useMoverConTeclado({ diagrama: d, contenedor, rem })
  const puedeMover = d.edicion.mover === null
  const puedeVincular = d.edicion.vincular === null
  const lienzo = useMemo<Lienzo>(
    () => ({
      medidas: d.medidas,
      alAbrir,
      vieneDeArrastrar,
      puedeMover,
      puedeVincular,
      alTeclado,
      salidas: d.salidas,
    }),
    [d.medidas, alAbrir, vieneDeArrastrar, puedeMover, puedeVincular, alTeclado, d.salidas],
  )

  return {
    lienzo,
    nuevaFase: {
      motivo: d.edicion.crear,
      alPulsar: () => {
        const caja = contenedor.current?.getBoundingClientRect()
        if (caja) nuevaFaseEn({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 })
      },
    },
    ordenarSolo: {
      motivo: d.edicion.mover ?? (d.posiciones.yaEnElAcomodo ? MOTIVO_YA_EN_EL_ACOMODO : null),
      alPulsar: d.posiciones.ordenarSolo,
    },
    estado: d.posiciones.sinRed ? SIN_CONEXION_AL_MOVER : d.angosto ? MOTIVO_EN_EL_CELULAR : null,
    // Al soltar una caja arrastrada (px, en la rejilla de 1 rem): se guarda donde quedó.
    alSoltarCaja: (faseId: string, en: Punto) => {
      d.posiciones.mover([{ faseId, x: Math.round(en.x / rem), y: Math.round(en.y / rem) }])
    },
    // El doble clic vale sólo sobre el fondo (no sobre una caja, una flecha ni la barra).
    alDobleClic: (evento: MouseEvent<HTMLElement>) => {
      if (d.edicion.crear !== null) return
      if (
        !(evento.target instanceof Element) ||
        !evento.target.classList.contains('react-flow__pane')
      )
        return
      nuevaFaseEn({ x: evento.clientX, y: evento.clientY })
    },
    alTeclear: (evento: KeyboardEvent<HTMLElement>) => {
      const deshacer =
        (evento.ctrlKey || evento.metaKey) && !evento.shiftKey && evento.key.toLowerCase() === 'z'
      if (!deshacer || enUnCampo(evento.target) || d.edicion.mover !== null) return
      evento.preventDefault()
      d.posiciones.deshacer()
    },
  }
}
